export type ConceptLink = { label: string; href: string };

export type Concept = {
  id: string;
  title: string;
  summary: string;
  explanation: string;
  example: string;
  links: ConceptLink[];
};

export const concepts: Concept[] = [
  {
    id: "package-main",
    title: "package main",
    summary: "The only package that builds into a program.",
    explanation:
      "Every Go file starts with a package name. package main, plus a function named main, is the entry point the go tool compiles into a binary. Other packages in this repo (task, store, api) are libraries. They cannot be run on their own. cmd/todo is main, and it wires the libraries together.",
    example: `package main

import "fmt"

func main() {
    fmt.Println("todo")
}`,
    links: [{ label: "Tour of Go — Packages", href: "https://go.dev/tour/basics/1" }],
  },
  {
    id: "modules",
    title: "Modules",
    summary: "go.mod names the project and roots its imports.",
    explanation:
      "A module is a collection of packages released together. The first line of go.mod, module todo, is the prefix of every import inside this repo. import \"todo/internal/task\" means the folder internal/task. The go tool downloads other modules into a cache. This project stays on the standard library, so go.mod has no require block.",
    example: `module todo

go 1.22`,
    links: [{ label: "Go modules reference", href: "https://go.dev/doc/modules/gomod-ref" }],
  },
  {
    id: "variables",
    title: "Variables",
    summary: "Names bound to values, with types inferred or written out.",
    explanation:
      "Inside a function, := declares a variable and assigns it. Go infers the type from the right-hand side. var is what you use at package level, or when you want the zero value first. A variable's type does not change. Constants, declared with const, cannot be assigned again.",
    example: `name := args[0]          // string
count := 0               // int
var logger *log.Logger   // nil until assigned`,
    links: [{ label: "Go by Example — Variables", href: "https://gobyexample.com/variables" }],
  },
  {
    id: "structs",
    title: "Structs",
    summary: "A group of named fields treated as one value.",
    explanation:
      "A struct is a record. Task groups an id, a title, a done flag, and timestamps. You build one with a composite literal, naming the fields. Unmentioned fields keep their zero value: false, 0, \"\", or nil. Structs are values. Assigning one copies every field unless you use a pointer.",
    example: `type Task struct {
    ID    int
    Title string
    Done  bool
}

buy := Task{ID: 1, Title: "Buy milk"}`,
    links: [{ label: "Go by Example — Structs", href: "https://gobyexample.com/structs" }],
  },
  {
    id: "struct-tags",
    title: "Struct tags",
    summary: "Metadata on a field that libraries read with reflection.",
    explanation:
      "The string in backticks after a field is a tag. encoding/json looks for the json key. json:\"createdAt,omitempty\" tells the encoder to use createdAt in the JSON and to skip the field when it is empty. The Go name stays CreatedAt, which is exported because it starts with a capital letter. Tags are not checked by the compiler. A typo still compiles.",
    example: `type Task struct {
    Title string     \`json:"title"\`
    Due   *time.Time \`json:"due,omitempty"\`
}`,
    links: [{ label: "Go by Example — JSON", href: "https://gobyexample.com/json" }],
  },
  {
    id: "slices",
    title: "Slices",
    summary: "A growable view over an array.",
    explanation:
      "A slice has a length, a capacity, and a pointer to an array. append adds an element and sometimes allocates a bigger array, so you must use the returned slice. A nil slice encodes as JSON null. This code returns an empty slice instead, so the browser sees []. Slicing with list[:i] and list[i+1:] is how Delete drops one element.",
    example: `tasks = append(tasks, task)
tasks = append(tasks[:i], tasks[i+1:]...)
if tasks == nil {
    tasks = []Task{}
}`,
    links: [{ label: "Go by Example — Slices", href: "https://gobyexample.com/slices" }],
  },
  {
    id: "maps",
    title: "Maps",
    summary: "A collection of keys and values.",
    explanation:
      "A map gives you a value for a key in about constant time. The CLI uses a map from subcommand names to functions. Reading a missing key returns the zero value and a second boolean that is false. Maps are references. Passing a map to a function does not copy the entries.",
    example: `commands := map[string]func([]string) int{
    "add":  cmdAdd,
    "list": cmdList,
}
fn, ok := commands[name]
if !ok {
    fmt.Println("unknown command")
}`,
    links: [{ label: "Go by Example — Maps", href: "https://gobyexample.com/maps" }],
  },
  {
    id: "range",
    title: "range",
    summary: "The loop that walks a slice, map, or string.",
    explanation:
      "range returns one item at a time. On a slice you get the index and a copy of the element. Use _ when you do not need the index. Ranging a map gives keys in a random order. The copy matters: changing the loop variable does not change the slice. Change list.Tasks[i] instead, which is what Complete does.",
    example: `for _, t := range list.Tasks {
    if t.ID == id {
        return t, nil
    }
}`,
    links: [{ label: "Go by Example — Range", href: "https://gobyexample.com/range" }],
  },
  {
    id: "pointers",
    title: "Pointers",
    summary: "A value that holds the address of another value.",
    explanation:
      "A pointer's type is written *T. &x takes the address of x. A nil pointer means \"no value\", which is why Due and DoneAt are *time.Time: a missing date is nil, and the JSON tag omitempty drops it. Dereference with *p. Passing a pointer lets a function change the caller's value.",
    example: `var due *time.Time          // nil, no due date
now := time.Now().UTC()
task.DoneAt = &now         // store the address
if task.Due != nil {
    fmt.Println(*task.Due)
}`,
    links: [{ label: "Go by Example — Pointers", href: "https://gobyexample.com/pointers" }],
  },
  {
    id: "pointer-receiver",
    title: "Pointer receivers",
    summary: "A method that can change the value it is called on.",
    explanation:
      "func (l *List) Add has a pointer receiver. Add appends to the slice and increments NextID. Those writes must stick on the caller's list. A value receiver func (l List) Add would edit a copy thrown away on return. Use a pointer receiver when the method mutates the receiver or when the struct is large. Go lets you call a pointer method on a variable; it takes the address for you.",
    example: `func (l *List) Add(title string) (Task, error) {
    l.Tasks = append(l.Tasks, Task{Title: title})
    l.NextID++
    return l.Tasks[len(l.Tasks)-1], nil
}`,
    links: [{ label: "Tour of Go — Pointer receivers", href: "https://go.dev/tour/methods/4" }],
  },
  {
    id: "methods",
    title: "Methods",
    summary: "A function with a receiver, called as value.Method().",
    explanation:
      "A method is a function attached to a type. The receiver is the extra argument written before the name. list.Add(title, due) is Add with list as the receiver. Methods are how List owns Add, Complete, and Delete, and how *JSONFile owns Load and Save. A method set is also what an interface looks for.",
    example: `func (l *List) Get(id int) (Task, error) {
    for _, t := range l.Tasks {
        if t.ID == id {
            return t, nil
        }
    }
    return Task{}, ErrNotFound
}`,
    links: [{ label: "Go by Example — Methods", href: "https://gobyexample.com/methods" }],
  },
  {
    id: "errors",
    title: "Errors",
    summary: "A returned value, not an exception.",
    explanation:
      "Go functions return an error as the last result. nil means success. Callers check if err != nil. Sentinel errors are package-level variables made with errors.New, such as ErrNotFound. Compare them with errors.Is, not ==, so a wrapped error still matches. The HTTP layer turns those sentinels into 404 and 400.",
    example: `var ErrNotFound = errors.New("task not found")

if _, err := list.Get(id); err != nil {
    if errors.Is(err, ErrNotFound) {
        // 404
    }
}`,
    links: [{ label: "Go by Example — Errors", href: "https://gobyexample.com/errors" }],
  },
  {
    id: "error-wrapping",
    title: "Error wrapping",
    summary: "Add context with %w and still match the original.",
    explanation:
      "fmt.Errorf(\"read tasks: %w\", err) builds a new error that contains the old one. The extra words say which step failed. errors.Is walks that chain, so the caller can still detect os.ErrNotExist or ErrNotFound. %v would stringify the error and break errors.Is. Use %w when the caller might need to branch on the cause.",
    example: `data, err := os.ReadFile(path)
if err != nil {
    return nil, fmt.Errorf("read tasks: %w", err)
}`,
    links: [{ label: "Working with Errors in Go 1.13", href: "https://go.dev/blog/go1.13-errors" }],
  },
  {
    id: "interfaces",
    title: "Interfaces",
    summary: "A set of methods. Any type with those methods qualifies.",
    explanation:
      "Store asks for Load and Save. *JSONFile has both, so it is a Store. There is no implements keyword. The API stores a Store, not a *JSONFile, which is why a MemoryStore exercise can replace the file without touching the handlers. A variable of interface type holds a pair: the concrete type and the value. A nil pointer inside a non-nil interface is a classic trap.",
    example: `type Store interface {
    Load() (*task.List, error)
    Save(*task.List) error
}

var s Store = store.NewJSONFile("todo.json")`,
    links: [{ label: "Go by Example — Interfaces", href: "https://gobyexample.com/interfaces" }],
  },
  {
    id: "json",
    title: "JSON",
    summary: "encoding/json turns structs into text and back.",
    explanation:
      "Marshal produces bytes. Unmarshal fills a struct you pass as a pointer. Field tags choose the JSON names. Decoder.Decode reads an HTTP body straight into a struct. Encoder.Encode writes a response. Time values use RFC3339. A nil slice becomes null, so the list helpers return an empty slice instead.",
    example: `var req struct {
    Title string \`json:"title"\`
}
if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
    // 400 invalid json
}
json.NewEncoder(w).Encode(task)`,
    links: [{ label: "Go by Example — JSON", href: "https://gobyexample.com/json" }],
  },
  {
    id: "files",
    title: "Files",
    summary: "os.ReadFile and os.WriteFile for whole files.",
    explanation:
      "The os package talks to the filesystem. ReadFile returns the bytes or an error. errors.Is(err, os.ErrNotExist) is how Load treats a missing todo file as an empty list. WriteFile replaces a file in one call, but a crash in the middle can leave a partial file. That is why Save uses a temp file and rename instead of writing the destination directly.",
    example: `data, err := os.ReadFile(path)
if errors.Is(err, os.ErrNotExist) {
    return &task.List{Tasks: []task.Task{}, NextID: 1}, nil
}`,
    links: [{ label: "Go by Example — Reading files", href: "https://gobyexample.com/reading-files" }],
  },
  {
    id: "atomic-write",
    title: "Atomic replace",
    summary: "Write a temp file, then os.Rename it into place.",
    explanation:
      "Rename within one directory is atomic on the usual filesystems: readers see the old file or the new file, never a half-written mix. Save writes .todo-*.tmp beside the real path, closes it, then renames it to todo.json. If the process dies during the write, the previous list is still intact. The temp file is removed if rename never happens.",
    example: `tmp, err := os.CreateTemp(dir, ".todo-*.tmp")
// write and close tmp
if err := os.Rename(tmp.Name(), path); err != nil {
    return fmt.Errorf("replace tasks file: %w", err)
}`,
    links: [{ label: "os.Rename", href: "https://pkg.go.dev/os#Rename" }],
  },
  {
    id: "flag",
    title: "flag",
    summary: "The standard library's command-line flags.",
    explanation:
      "The flag package parses -name value arguments. Each subcommand builds its own FlagSet so add can have -due and list can have -all. flag.Args() is whatever is left after the flags, such as the task title. ContinueOnError lets the program print usage and return exit code 2 instead of crashing. This replaces a third-party CLI framework.",
    example: `fs := flag.NewFlagSet("add", flag.ContinueOnError)
due := fs.String("due", "", "due date")
if err := fs.Parse(args); err != nil {
    return 2
}
title := strings.Join(fs.Args(), " ")`,
    links: [{ label: "Go by Example — Flags", href: "https://gobyexample.com/command-line-flags" }],
  },
  {
    id: "http-handler",
    title: "HTTP handlers",
    summary: "A function of ResponseWriter and Request.",
    explanation:
      "An HTTP handler is func(w http.ResponseWriter, r *http.Request). You read the method, path, and body from r. You write the status and body to w. WriteHeader sends the status. The first Write sends 200 if you have not called WriteHeader yet. Handlers should set Content-Type, then WriteHeader, then the body. Teaching headers are set before WriteHeader so they are not dropped.",
    example: `func (s *Server) handleHealth(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(struct {
        OK bool \`json:"ok"\`
    }{OK: true})
}`,
    links: [{ label: "Go by Example — HTTP servers", href: "https://gobyexample.com/http-servers" }],
  },
  {
    id: "servemux-patterns",
    title: "ServeMux patterns",
    summary: "Method plus path, with {wildcards}, since Go 1.22.",
    explanation:
      "http.ServeMux matches the method and the path as one pattern. \"GET /api/tasks/{id}\" does not run for POST. {id} captures a single segment, read with r.PathValue(\"id\"). A request whose path matches a pattern but whose method does not gets 405 from the mux. More specific patterns win over less specific ones. This project relies on that and does not use a router library.",
    example: `mux.HandleFunc("GET /api/tasks/{id}", s.handleGet)
mux.HandleFunc("PATCH /api/tasks/{id}/done", s.handleDone)

id, err := strconv.Atoi(r.PathValue("id"))`,
    links: [{ label: "net/http.ServeMux", href: "https://pkg.go.dev/net/http#ServeMux" }],
  },
  {
    id: "middleware",
    title: "Middleware",
    summary: "A handler that wraps another handler.",
    explanation:
      "Middleware is a function that takes a handler and returns a handler. Logging and CORS sit outside the routes. They run first, then call next.ServeHTTP to reach the real handler. The task handlers stay free of timing and origin checks. Order matters: this server uses logging(cors(routes)), so the log includes the status the route wrote.",
    example: `func (s *Server) logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()
        next.ServeHTTP(w, r)
        s.log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
    })
}`,
    links: [{ label: "Go by Example — HTTP servers", href: "https://gobyexample.com/http-servers" }],
  },
  {
    id: "closures",
    title: "Closures",
    summary: "A function that uses variables from the scope around it.",
    explanation:
      "The function returned by logging mentions next and start, which live in the outer function. That inner function is a closure: it keeps those variables after logging has returned. The CLI's command map does the same thing when it closes over the stdout and stderr writers. Be careful with loop variables. Before Go 1.22 each iteration shared one variable. Since 1.22 each iteration gets its own.",
    example: `return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
    start := time.Now()
    next.ServeHTTP(w, r) // next comes from outside
    log.Println(time.Since(start))
})`,
    links: [{ label: "Go by Example — Closures", href: "https://gobyexample.com/closures" }],
  },
  {
    id: "goroutines",
    title: "Goroutines",
    summary: "go starts a function running at the same time.",
    explanation:
      "The go keyword launches a goroutine, a lightweight thread managed by the Go runtime. serve starts Remind with go so the ticker can run while the HTTP server accepts requests. A goroutine does not keep the process alive by itself, and main returning exits the process. Share data by passing it, or protect it with a mutex. The race detector finds shares you forgot.",
    example: `ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
defer stop()
go srv.Remind(ctx, time.Minute)
log.Fatal(httpServer.ListenAndServe())`,
    links: [{ label: "Go by Example — Goroutines", href: "https://gobyexample.com/goroutines" }],
  },
  {
    id: "channels",
    title: "Channels",
    summary: "A typed pipe between goroutines.",
    explanation:
      "A channel carries values from one goroutine to another. ch := make(chan time.Time, 1) makes a channel with room for one value. ch <- t sends. t := <-ch receives. The reminder uses a channel so the ticker goroutine and the logging loop meet without touching the same variables. select waits on several channel operations and runs the one that is ready.",
    example: `ticks := make(chan time.Time, 1)
go func() {
    ticker := time.NewTicker(time.Minute)
    for t := range ticker.C {
        ticks <- t
    }
}()
now := <-ticks`,
    links: [{ label: "Go by Example — Channels", href: "https://gobyexample.com/channels" }],
  },
  {
    id: "context",
    title: "context",
    summary: "A cancellation signal passed down a call chain.",
    explanation:
      "context.Context carries a deadline and a cancel signal. signal.NotifyContext cancels when the process gets Ctrl-C or SIGTERM. Functions watch ctx.Done(), a channel that closes on cancel. Remind returns when that happens, and http.Server.Shutdown uses a timeout context so a stuck request cannot hold the process open forever. Do not store a Context in a struct. Pass it as the first argument.",
    example: `ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
defer stop()
select {
case <-ctx.Done():
    return
case now := <-ticks:
    logOverdue(now)
}`,
    links: [{ label: "Go by Example — Context", href: "https://gobyexample.com/context" }],
  },
  {
    id: "mutex",
    title: "Mutex",
    summary: "A lock that lets one goroutine into a section at a time.",
    explanation:
      "sync.Mutex has Lock and Unlock. Server holds mu across load, modify, and save. Without it, two POSTs can both read NextID 1, both insert a task with that id, and the save that finishes last erases the other task. defer mu.Unlock() runs on every return, including errors. Do not lock a mutex you already hold on the same goroutine. Go's mutex is not reentrant.",
    example: `s.mu.Lock()
defer s.mu.Unlock()
list, err := s.store.Load()
if err != nil {
    return err
}
list.Add(title, due)
return s.store.Save(list)`,
    links: [{ label: "Go by Example — Mutexes", href: "https://gobyexample.com/mutexes" }],
  },
  {
    id: "race-detector",
    title: "Race detector",
    summary: "go test -race fails when two goroutines share memory unsafely.",
    explanation:
      "The race detector instruments reads and writes. If one goroutine writes a variable while another reads it without a happens-before edge, the test fails and prints the two stacks. TestConcurrentCreate posts many tasks at once against a store that has no lock of its own. Server.update's mutex is the edge that makes the test pass. make test always passes -race.",
    example: `go test -race ./internal/api/

// A failure looks like:
// WARNING: DATA RACE
// Write at 0x00c000 by goroutine 12
// Previous read at 0x00c000 by goroutine 9`,
    links: [{ label: "Data Race Detector", href: "https://go.dev/doc/articles/race_detector" }],
  },
  {
    id: "ticker",
    title: "Ticker",
    summary: "time.NewTicker delivers a time on a schedule.",
    explanation:
      "A ticker sends the current time on its C channel at a fixed interval. Remind uses one minute in production and a few milliseconds in tests. Always call Stop when you are done, or the ticker keeps a runtime timer alive. The loop also watches ctx.Done() so shutdown is not stuck waiting for the next tick. A time.Timer fires once. A Ticker keeps firing.",
    example: `ticker := time.NewTicker(time.Minute)
defer ticker.Stop()
for {
    select {
    case <-ctx.Done():
        return
    case now := <-ticker.C:
        logOverdue(now)
    }
}`,
    links: [{ label: "Go by Example — Tickers", href: "https://gobyexample.com/tickers" }],
  },
  {
    id: "embed",
    title: "embed",
    summary: "Compile files into the binary with //go:embed.",
    explanation:
      "The embed package plus a //go:embed directive copies files into the binary at build time. web/embed.go embeds web/dist, the Vite build. todo serve without -dev serves that filesystem, and falls back to index.html for /lessons and /glossary. You deploy one file. The files are read-only. make build runs the Vite build first so the embedded copy is fresh.",
    example: `//go:embed all:dist
var distFS embed.FS

func Dist() (fs.FS, error) {
    return fs.Sub(distFS, "dist")
}`,
    links: [{ label: "embed package", href: "https://pkg.go.dev/embed" }],
  },
  {
    id: "testing",
    title: "Testing",
    summary: "func TestXxx(t *testing.T), run by go test.",
    explanation:
      "The go tool runs every function in a _test.go file that starts with Test and takes *testing.T. t.Fatal stops that test. t.Errorf reports and continues. t.Helper marks a helper so failures point at the caller. Tests live next to the code: task_test.go is package task. go test ./... runs every package. Cache is fine until you want -count=1.",
    example: `func TestComplete(t *testing.T) {
    var list List
    if _, err := list.Add("Buy milk", nil); err != nil {
        t.Fatal(err)
    }
    got, err := list.Complete(1)
    if err != nil || !got.Done {
        t.Fatalf("got %+v, %v", got, err)
    }
}`,
    links: [{ label: "Go by Example — Testing", href: "https://gobyexample.com/testing" }],
  },
  {
    id: "table-tests",
    title: "Table-driven tests",
    summary: "One function, many cases in a slice.",
    explanation:
      "A table test is a slice of structs. Each row has a name, inputs, and the expected result. t.Run(tt.name, ...) runs a subtest you can select with go test -run TestAdd/empty. Adding a case is a new row, not a new function. Put the error you expect in the row and compare with errors.Is so the empty-title case and the success case share one loop.",
    example: `tests := []struct {
    name    string
    title   string
    wantErr error
}{
    {name: "ok", title: "Buy milk"},
    {name: "empty", title: "  ", wantErr: ErrEmptyTitle},
}
for _, tt := range tests {
    t.Run(tt.name, func(t *testing.T) {
        _, err := list.Add(tt.title, nil)
        if !errors.Is(err, tt.wantErr) {
            t.Fatal(err)
        }
    })
}`,
    links: [{ label: "Table-driven tests", href: "https://go.dev/wiki/TableDrivenTests" }],
  },
  {
    id: "httptest",
    title: "httptest",
    summary: "Call a handler without reserving a port.",
    explanation:
      "httptest.NewRequest builds a request. httptest.NewRecorder records what the handler writes: status, headers, and body. Server tests call Handler().ServeHTTP(rec, req). Nothing listens on :8080. That makes the tests fast and safe to run in parallel with a dev server. Use a real httptest.Server only when you need a URL a client can dial.",
    example: `req := httptest.NewRequest(http.MethodPost, "/api/tasks", strings.NewReader(\`{"title":"Buy milk"}\`))
rec := httptest.NewRecorder()
srv.Handler().ServeHTTP(rec, req)
if rec.Code != http.StatusCreated {
    t.Fatal(rec.Body.String())
}`,
    links: [{ label: "net/http/httptest", href: "https://pkg.go.dev/net/http/httptest" }],
  },
  {
    id: "go-ast",
    title: "go/ast",
    summary: "Go source parsed into a tree you can walk.",
    explanation:
      "The go/parser package turns a file into an ast.File. The tree is declarations, statements, and expressions, with positions back into the original bytes. scripts/gen-go-sources.go walks every FuncDecl and slices the source from the function's first line to its last. That text is what the learning panel shows. The same packages power gofmt and gopls.",
    example: `fset := token.NewFileSet()
file, err := parser.ParseFile(fset, path, nil, parser.ParseComments)
for _, decl := range file.Decls {
    fn, ok := decl.(*ast.FuncDecl)
    if !ok || fn.Body == nil {
        continue
    }
    start := fset.Position(fn.Pos()).Line
    _ = start
}`,
    links: [{ label: "go/ast", href: "https://pkg.go.dev/go/ast" }],
  },
];

export const conceptById: Record<string, Concept> = Object.fromEntries(concepts.map((concept) => [concept.id, concept]));
