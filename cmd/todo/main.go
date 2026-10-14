// Command todo manages a task list from the terminal and over HTTP.
//
// LEARN(package-main): This file is package main. That name, together with func main, is what the go tool builds into a program you can run. Every other folder in this repo is a library main imports.
package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
	"text/tabwriter"
	"time"

	"todo/internal/api"
	"todo/internal/store"
	"todo/internal/task"
	"todo/web"
)

const usage = `todo — a task list with a Go API

Usage:
  todo add [-file path] [-due YYYY-MM-DD] "title"
  todo list [-file path] [-all]
  todo done [-file path] <id>
  todo delete [-file path] <id>
  todo serve [-file path] [-addr :8080] [-dev]

The default file is ~/.todo.json. make dev uses .data/todo.json so the
CLI and the web app share one list when you pass -file .data/todo.json.
`

type env struct {
	stdout io.Writer
	stderr io.Writer
}

func main() {
	os.Exit(run(os.Args[1:], env{stdout: os.Stdout, stderr: os.Stderr}))
}

func run(args []string, e env) int {
	// LEARN(modules): Imports above start with todo/ because go.mod declares module todo. Go maps todo/internal/task onto the internal/task directory of this module. There is no GOPATH lookup.
	if len(args) == 0 {
		fmt.Fprint(e.stderr, usage)
		return 2
	}
	// LEARN(variables): name is declared and assigned with :=. Go infers string from args[0]. Outside a function you would write var name string instead.
	name := args[0]
	// LEARN(maps): commands maps a subcommand name to the function that runs it. Looking up "done" is how the program finds cmdDone. A missing key returns ok == false.
	commands := map[string]func([]string) int{
		"add":    func(a []string) int { return cmdAdd(a, e) },
		"list":   func(a []string) int { return cmdList(a, e) },
		"done":   func(a []string) int { return cmdDone(a, e) },
		"delete": func(a []string) int { return cmdDelete(a, e) },
		"serve":  func(a []string) int { return cmdServe(a, e) },
	}
	fn, ok := commands[name]
	if !ok {
		fmt.Fprintf(e.stderr, "unknown command %q\n\n%s", name, usage)
		return 2
	}
	return fn(args[1:])
}

func cmdAdd(args []string, e env) int {
	fs := flag.NewFlagSet("add", flag.ContinueOnError)
	fs.SetOutput(e.stderr)
	// LEARN(flag): flag.NewFlagSet parses flags for this subcommand only. -due belongs to add, not to list. The standard library does this; the program does not use a CLI framework.
	file := fs.String("file", defaultPath(), "todo JSON file")
	due := fs.String("due", "", "due date (YYYY-MM-DD or RFC3339)")
	fs.Usage = func() {
		fmt.Fprintln(e.stderr, `usage: todo add [-file path] [-due YYYY-MM-DD] "title"`)
	}
	if err := fs.Parse(args); err != nil {
		return 2
	}
	if fs.NArg() == 0 {
		fs.Usage()
		return 2
	}
	when, err := parseDue(*due)
	if err != nil {
		fmt.Fprintln(e.stderr, err)
		return 2
	}
	list, code := load(e, *file)
	if code != 0 {
		return code
	}
	created, err := list.Add(strings.Join(fs.Args(), " "), when)
	if err != nil {
		fmt.Fprintln(e.stderr, err)
		return 1
	}
	if code := save(e, *file, list); code != 0 {
		return code
	}
	fmt.Fprintf(e.stdout, "added %d\t%s\n", created.ID, created.Title)
	return 0
}

func cmdList(args []string, e env) int {
	fs := flag.NewFlagSet("list", flag.ContinueOnError)
	fs.SetOutput(e.stderr)
	file := fs.String("file", defaultPath(), "todo JSON file")
	all := fs.Bool("all", false, "include completed tasks")
	fs.Usage = func() {
		fmt.Fprintln(e.stderr, "usage: todo list [-file path] [-all]")
	}
	if err := fs.Parse(args); err != nil {
		return 2
	}
	if fs.NArg() != 0 {
		fs.Usage()
		return 2
	}
	list, code := load(e, *file)
	if code != 0 {
		return code
	}
	tasks := list.Pending()
	if *all {
		tasks = list.All()
	}
	if len(tasks) == 0 {
		fmt.Fprintln(e.stdout, "no tasks")
		return 0
	}
	tw := tabwriter.NewWriter(e.stdout, 0, 0, 2, ' ', 0)
	fmt.Fprintln(tw, "ID\tTITLE\tDONE\tDUE")
	for _, item := range tasks {
		done := "no"
		if item.Done {
			done = "yes"
		}
		due := ""
		if item.Due != nil {
			due = item.Due.Local().Format("2006-01-02")
		}
		fmt.Fprintf(tw, "%d\t%s\t%s\t%s\n", item.ID, oneLine(item.Title), done, due)
	}
	if err := tw.Flush(); err != nil {
		fmt.Fprintln(e.stderr, err)
		return 1
	}
	return 0
}

func cmdDone(args []string, e env) int {
	file, id, code := idCommand("done", "usage: todo done [-file path] <id>", args, e)
	if code != 0 {
		return code
	}
	list, code := load(e, file)
	if code != 0 {
		return code
	}
	if _, err := list.Complete(id); err != nil {
		fmt.Fprintln(e.stderr, err)
		return 1
	}
	if code := save(e, file, list); code != 0 {
		return code
	}
	fmt.Fprintf(e.stdout, "done %d\n", id)
	return 0
}

func cmdDelete(args []string, e env) int {
	file, id, code := idCommand("delete", "usage: todo delete [-file path] <id>", args, e)
	if code != 0 {
		return code
	}
	list, code := load(e, file)
	if code != 0 {
		return code
	}
	if err := list.Delete(id); err != nil {
		fmt.Fprintln(e.stderr, err)
		return 1
	}
	if code := save(e, file, list); code != 0 {
		return code
	}
	fmt.Fprintf(e.stdout, "deleted %d\n", id)
	return 0
}

func cmdServe(args []string, e env) int {
	fs := flag.NewFlagSet("serve", flag.ContinueOnError)
	fs.SetOutput(e.stderr)
	file := fs.String("file", defaultPath(), "todo JSON file")
	addr := fs.String("addr", ":8080", "listen address")
	dev := fs.Bool("dev", false, "enable CORS for local Vite and skip the embedded UI")
	fs.Usage = func() {
		fmt.Fprintln(e.stderr, "usage: todo serve [-file path] [-addr :8080] [-dev]")
	}
	if err := fs.Parse(args); err != nil {
		return 2
	}
	if fs.NArg() != 0 {
		fs.Usage()
		return 2
	}
	logger := log.New(e.stderr, "", log.LstdFlags)
	srv := api.New(store.NewJSONFile(*file), api.Options{Dev: *dev, Logger: logger})
	var handler http.Handler = srv.Handler()
	if !*dev {
		files, err := web.Dist()
		if err != nil {
			fmt.Fprintln(e.stderr, err)
			return 1
		}
		handler = api.WithStatic(handler, files)
	}
	httpServer := &http.Server{
		Addr:              *addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       15 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}
	// LEARN(context): NotifyContext is canceled when the process receives Ctrl-C or SIGTERM. Remind and Shutdown both stop because of that cancellation.
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	// LEARN(goroutines): go starts Remind at the same time as the HTTP server. Requests keep flowing while the ticker loop watches for overdue tasks.
	go srv.Remind(ctx, time.Minute)
	fmt.Fprintf(e.stdout, "serving %s (file %s)\n", *addr, *file)
	errCh := make(chan error, 1)
	go func() {
		errCh <- httpServer.ListenAndServe()
	}()
	select {
	case <-ctx.Done():
		shut, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		if err := httpServer.Shutdown(shut); err != nil {
			fmt.Fprintln(e.stderr, err)
			return 1
		}
		return 0
	case err := <-errCh:
		if errors.Is(err, http.ErrServerClosed) {
			return 0
		}
		fmt.Fprintln(e.stderr, err)
		return 1
	}
}

func idCommand(name, usageText string, args []string, e env) (string, int, int) {
	fs := flag.NewFlagSet(name, flag.ContinueOnError)
	fs.SetOutput(e.stderr)
	file := fs.String("file", defaultPath(), "todo JSON file")
	fs.Usage = func() {
		fmt.Fprintln(e.stderr, usageText)
	}
	if err := fs.Parse(args); err != nil {
		return "", 0, 2
	}
	if fs.NArg() != 1 {
		fs.Usage()
		return "", 0, 2
	}
	id, err := strconv.Atoi(fs.Arg(0))
	if err != nil || id < 1 {
		fmt.Fprintln(e.stderr, "id must be a positive integer")
		return "", 0, 2
	}
	return *file, id, 0
}

func load(e env, path string) (*task.List, int) {
	list, err := store.NewJSONFile(path).Load()
	if err != nil {
		fmt.Fprintln(e.stderr, err)
		return nil, 1
	}
	return list, 0
}

func save(e env, path string, list *task.List) int {
	if err := store.NewJSONFile(path).Save(list); err != nil {
		fmt.Fprintln(e.stderr, err)
		return 1
	}
	return 0
}

func parseDue(value string) (*time.Time, error) {
	if value == "" {
		return nil, nil
	}
	if t, err := time.Parse(time.RFC3339, value); err == nil {
		u := t.UTC()
		return &u, nil
	}
	t, err := time.ParseInLocation("2006-01-02", value, time.Local)
	if err != nil {
		return nil, errors.New("due must be YYYY-MM-DD or RFC3339")
	}
	end := time.Date(t.Year(), t.Month(), t.Day(), 23, 59, 59, 0, time.Local).UTC()
	return &end, nil
}

func defaultPath() string {
	home, err := os.UserHomeDir()
	if err != nil {
		return "todo.json"
	}
	return filepath.Join(home, ".todo.json")
}

func oneLine(s string) string {
	s = strings.ReplaceAll(s, "\t", " ")
	return strings.ReplaceAll(s, "\n", " ")
}
