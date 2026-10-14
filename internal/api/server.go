package api

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io/fs"
	"log"
	"net/http"
	"path"
	"strconv"
	"strings"
	"sync"
	"time"

	"todo/internal/learn"
	"todo/internal/store"
	"todo/internal/task"
)

// Options configures a Server.
type Options struct {
	Dev    bool
	Logger *log.Logger
}

// Server serves the JSON API. mu guards load-modify-save.
type Server struct {
	store store.Store
	mu    sync.Mutex
	dev   bool
	log   *log.Logger
}

type errorBody struct {
	Error string `json:"error"`
}

// New builds a server. A nil logger writes to stderr.
func New(st store.Store, opt Options) *Server {
	logger := opt.Logger
	if logger == nil {
		logger = log.Default()
	}
	return &Server{store: st, dev: opt.Dev, log: logger}
}

// Handler is the API, with logging and optional dev CORS.
func (s *Server) Handler() http.Handler {
	return s.logging(s.cors(s.routes()))
}

func (s *Server) routes() http.Handler {
	// LEARN(servemux-patterns): The method is part of the pattern. "GET /api/tasks/{id}" does not match POST. {id} is a wildcard read later with PathValue. A known path with the wrong method gets 405 from the mux itself.
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/tasks", s.handleList)
	mux.HandleFunc("POST /api/tasks", s.handleCreate)
	mux.HandleFunc("GET /api/tasks/{id}", s.handleGet)
	mux.HandleFunc("PATCH /api/tasks/{id}/done", s.handleDone)
	mux.HandleFunc("DELETE /api/tasks/{id}", s.handleDelete)
	mux.HandleFunc("GET /api/health", s.handleHealth)
	if s.dev {
		mux.HandleFunc("GET /{$}", s.handleDevRoot)
	}
	return mux
}

func (s *Server) handleDevRoot(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/plain; charset=utf-8")
	fmt.Fprintln(w, "todo API is running with -dev. Open the Vite app from make dev. Without -dev, this port serves the built UI.")
}

func (s *Server) handleList(w http.ResponseWriter, r *http.Request) {
	// LEARN(http-handler): A handler is func(http.ResponseWriter, *http.Request). w receives the status and body. r is the request. This one is mounted at GET /api/tasks.
	// LEARN(servemux-patterns): The route pattern, not this function, decided that the method is GET. POST /api/tasks is handleCreate.
	list, err := s.load()
	if err != nil {
		s.writeTaskErr(w, "handleList", err)
		return
	}
	var tasks []task.Task
	if r.URL.Query().Get("all") == "true" {
		tasks = list.All()
	} else {
		tasks = list.Pending()
	}
	// LEARN(slices): The handler returns a slice of tasks. All and Pending never return nil, so the JSON body is [] and not null when the list is empty.
	// LEARN(json): writeJSON runs json.Encoder. Field tags on Task choose createdAt and due.
	s.writeJSON(w, http.StatusOK, "handleList", tasks)
}

func (s *Server) handleCreate(w http.ResponseWriter, r *http.Request) {
	// LEARN(http-handler): handleCreate reads the body and writes 201 with the new task, or 400 when the title is empty.
	var req struct {
		// LEARN(structs): This anonymous struct is only the request shape. The stored value is a task.Task built by List.Add.
		// LEARN(struct-tags): json:"title" and json:"due,omitempty" bind the POST body. The client may omit due.
		Title string     `json:"title"`
		Due   *time.Time `json:"due,omitempty"`
	}
	// LEARN(json): Decode copies JSON into req. A *time.Time field accepts RFC3339, and stays nil when the key is missing.
	// LEARN(pointers): Due is a pointer so "no due date" is nil. A plain time.Time could not tell "missing" from "year 1".
	dec := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1<<20))
	if err := dec.Decode(&req); err != nil {
		s.writeJSON(w, http.StatusBadRequest, "handleCreate", errorBody{Error: "invalid json"})
		return
	}
	var created task.Task
	err := s.update(func(list *task.List) error {
		t, err := list.Add(req.Title, req.Due)
		if err != nil {
			return err
		}
		created = t
		return nil
	})
	if err != nil {
		// LEARN(errors): List.Add returns ErrEmptyTitle. writeTaskErr maps that sentinel to HTTP 400.
		s.writeTaskErr(w, "handleCreate", err)
		return
	}
	s.writeJSON(w, http.StatusCreated, "handleCreate", created)
}

func (s *Server) handleGet(w http.ResponseWriter, r *http.Request) {
	// LEARN(http-handler): PathValue reads the {id} wildcard from the pattern GET /api/tasks/{id}.
	// LEARN(servemux-patterns): {id} is one path segment. The matched text is still a string; the handler turns it into an int.
	id, err := pathID(r)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, "handleGet", errorBody{Error: "invalid id"})
		return
	}
	list, err := s.load()
	if err != nil {
		s.writeTaskErr(w, "handleGet", err)
		return
	}
	got, err := list.Get(id)
	if err != nil {
		// LEARN(error-wrapping): errors.Is walks the wrap chain. A future fmt.Errorf("get: %w", ErrNotFound) would still land in this branch.
		// LEARN(errors): ErrNotFound becomes 404. The response body is JSON, {"error":"task not found"}.
		s.writeTaskErr(w, "handleGet", err)
		return
	}
	// LEARN(range): List.Get uses range to scan the slice. This handler only sees the task it returns, or the error.
	s.writeJSON(w, http.StatusOK, "handleGet", got)
}

func (s *Server) handleDone(w http.ResponseWriter, r *http.Request) {
	// LEARN(http-handler): PATCH /api/tasks/{id}/done has no body. The id in the path is the whole input.
	// LEARN(methods): list.Complete is a method on *task.List. The handler does not reach into the Tasks slice itself.
	// LEARN(pointer-receiver): Complete's receiver is a pointer, so Done and DoneAt stick on the list we later Save.
	// LEARN(pointers): DoneAt inside the saved task is a *time.Time set by Complete.
	id, err := pathID(r)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, "handleDone", errorBody{Error: "invalid id"})
		return
	}
	var updated task.Task
	err = s.update(func(list *task.List) error {
		t, err := list.Complete(id)
		if err != nil {
			return err
		}
		updated = t
		return nil
	})
	if err != nil {
		s.writeTaskErr(w, "handleDone", err)
		return
	}
	s.writeJSON(w, http.StatusOK, "handleDone", updated)
}

func (s *Server) handleDelete(w http.ResponseWriter, r *http.Request) {
	// LEARN(http-handler): A successful delete writes 204 and no JSON body. The teaching headers are still set.
	// LEARN(slices): List.Delete rebuilds the slice without the removed index, then update saves that list.
	// LEARN(errors): A missing id is ErrNotFound, which becomes 404. The file is left unchanged because update does not save after an error.
	id, err := pathID(r)
	if err != nil {
		s.writeJSON(w, http.StatusBadRequest, "handleDelete", errorBody{Error: "invalid id"})
		return
	}
	if err := s.update(func(list *task.List) error {
		return list.Delete(id)
	}); err != nil {
		s.writeTaskErr(w, "handleDelete", err)
		return
	}
	s.writeJSON(w, http.StatusNoContent, "handleDelete", nil)
}

func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
	// LEARN(http-handler): Health is the smallest handler: ignore the request, write a fixed body.
	// LEARN(json): A struct value plus a tag is enough. The body is {"ok":true}.
	s.writeJSON(w, http.StatusOK, "handleHealth", struct {
		OK bool `json:"ok"`
	}{OK: true})
}

func (s *Server) load() (*task.List, error) {
	// LEARN(mutex): The same mutex as update. Load and Save share the file, and this lock keeps a read from running in the middle of another request's load-modify-save.
	s.mu.Lock()
	defer s.mu.Unlock()
	list, err := s.store.Load()
	if err != nil {
		return nil, fmt.Errorf("load tasks: %w", err)
	}
	return list, nil
}

func (s *Server) update(fn func(*task.List) error) error {
	// LEARN(mutex): Lock wraps the whole read, edit, and write. Without it, two POSTs can both read NextID 1, both create a task with that id, and the save that finishes last deletes the other task. `go test -race` plus TestConcurrentCreate catches overlapping use of the list.
	s.mu.Lock()
	defer s.mu.Unlock()
	list, err := s.store.Load()
	if err != nil {
		return fmt.Errorf("load tasks: %w", err)
	}
	if err := fn(list); err != nil {
		return err
	}
	if err := s.store.Save(list); err != nil {
		return fmt.Errorf("save tasks: %w", err)
	}
	return nil
}

func (s *Server) writeJSON(w http.ResponseWriter, status int, handler string, v any) {
	learn.Annotate(w, handler, learn.HandlerConcepts[handler])
	if status == http.StatusNoContent {
		w.WriteHeader(status)
		return
	}
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	if v == nil {
		return
	}
	enc := json.NewEncoder(w)
	enc.SetEscapeHTML(false)
	_ = enc.Encode(v)
}

func (s *Server) writeTaskErr(w http.ResponseWriter, handler string, err error) {
	switch {
	case errors.Is(err, task.ErrNotFound):
		s.writeJSON(w, http.StatusNotFound, handler, errorBody{Error: "task not found"})
	case errors.Is(err, task.ErrEmptyTitle):
		s.writeJSON(w, http.StatusBadRequest, handler, errorBody{Error: "title must not be empty"})
	default:
		s.writeJSON(w, http.StatusInternalServerError, handler, errorBody{Error: "task store failed"})
	}
}

func pathID(r *http.Request) (int, error) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id < 1 {
		return 0, errors.New("invalid id")
	}
	return id, nil
}

// Remind logs overdue tasks until ctx is canceled. Pass time.Minute in production.
func (s *Server) Remind(ctx context.Context, every time.Duration) {
	// LEARN(goroutines): Call this with go srv.Remind(ctx, time.Minute). The new goroutine runs beside the HTTP server. It returns when ctx is canceled so shutdown does not leave it behind.
	// LEARN(channels): ticks is a channel, a typed pipe. The ticker goroutine sends times. This loop receives them. The two goroutines share the channel and nothing else.
	ticks := make(chan time.Time, 1)
	go func() {
		// LEARN(ticker): NewTicker delivers time.Time values on an interval. Tests pass a few milliseconds; serve passes a minute. Stop releases the ticker when the goroutine returns.
		ticker := time.NewTicker(every)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case t := <-ticker.C:
				select {
				case ticks <- t:
				case <-ctx.Done():
					return
				}
			}
		}
	}()
	for {
		select {
		case <-ctx.Done():
			// LEARN(context): ctx.Done() fires when the caller cancels, which serve does on Ctrl-C. Leaving the loop is how this goroutine honors that signal.
			return
		case now := <-ticks:
			s.logOverdue(now)
		}
	}
}

func (s *Server) logOverdue(now time.Time) {
	list, err := s.load()
	if err != nil {
		s.log.Printf("overdue check: %v", err)
		return
	}
	tasks := list.Overdue(now)
	if len(tasks) == 0 {
		return
	}
	titles := make([]string, 0, len(tasks))
	for _, t := range tasks {
		titles = append(titles, fmt.Sprintf("#%d %s", t.ID, t.Title))
	}
	s.log.Printf("overdue: %s", strings.Join(titles, ", "))
}

// WithStatic serves a frontend filesystem and falls back to index.html for client-side routes.
// API paths are forwarded to next.
func WithStatic(next http.Handler, files fs.FS) http.Handler {
	// LEARN(embed): In production, files is the embed.FS from package web, which holds the built UI inside the binary. Tests pass a MapFS instead. Missing paths serve index.html so /lessons still loads the React app.
	fileServer := http.FileServer(http.FS(files))
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/api/") || (r.Method != http.MethodGet && r.Method != http.MethodHead) {
			next.ServeHTTP(w, r)
			return
		}
		name := strings.TrimPrefix(path.Clean("/"+r.URL.Path), "/")
		if name == "" || name == "." {
			name = "index.html"
		}
		if _, err := fs.Stat(files, name); err != nil {
			// FileServer redirects a request for /index.html to ./ . Write the
			// bytes ourselves so /lessons stays on /lessons and still returns the app.
			data, readErr := fs.ReadFile(files, "index.html")
			if readErr != nil {
				http.NotFound(w, r)
				return
			}
			w.Header().Set("Content-Type", "text/html; charset=utf-8")
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write(data)
			return
		}
		fileServer.ServeHTTP(w, r)
	})
}
