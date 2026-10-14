package api

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"strings"
	"sync"
	"testing"
	"testing/fstest"
	"time"

	"todo/internal/learn"
	"todo/internal/store"
	"todo/internal/task"
)

// LEARN(httptest): httptest.NewRequest and NewRecorder run a handler without opening a port. The recorder stores the status, headers, and body the handler wrote.

func TestRoutes(t *testing.T) {
	srv, file := newFileServer(t, true)
	h := srv.Handler()

	res := do(h, http.MethodGet, "/api/health", "")
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"ok":true`) {
		t.Fatalf("health = %d %s", res.Code, res.Body.String())
	}
	assertTeaching(t, res, "handleHealth")

	res = do(h, http.MethodGet, "/api/tasks", "")
	if res.Code != http.StatusOK || strings.TrimSpace(res.Body.String()) != "[]" {
		t.Fatalf("list = %d %s", res.Code, res.Body.String())
	}
	assertTeaching(t, res, "handleList")

	res = do(h, http.MethodPost, "/api/tasks", `{"title":"  "}`)
	if res.Code != http.StatusBadRequest || !strings.Contains(res.Body.String(), "title must not be empty") {
		t.Fatalf("empty = %d %s", res.Code, res.Body.String())
	}

	res = do(h, http.MethodPost, "/api/tasks", `{`)
	if res.Code != http.StatusBadRequest || !strings.Contains(res.Body.String(), "invalid json") {
		t.Fatalf("json = %d %s", res.Code, res.Body.String())
	}

	res = do(h, http.MethodPost, "/api/tasks", `{"title":"Buy milk","due":"2026-10-20T23:59:59Z"}`)
	if res.Code != http.StatusCreated {
		t.Fatalf("create = %d %s", res.Code, res.Body.String())
	}
	assertTeaching(t, res, "handleCreate")
	var created task.Task
	if err := json.Unmarshal(res.Body.Bytes(), &created); err != nil {
		t.Fatal(err)
	}
	if created.ID != 1 || created.Title != "Buy milk" || created.Due == nil {
		t.Fatalf("created = %+v", created)
	}

	res = do(h, http.MethodGet, "/api/tasks", "")
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "Buy milk") {
		t.Fatalf("pending = %d %s", res.Code, res.Body.String())
	}

	res = do(h, http.MethodGet, "/api/tasks/1", "")
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "Buy milk") {
		t.Fatalf("get = %d %s", res.Code, res.Body.String())
	}
	assertTeaching(t, res, "handleGet")

	res = do(h, http.MethodGet, "/api/tasks/nope", "")
	if res.Code != http.StatusBadRequest {
		t.Fatalf("bad id = %d %s", res.Code, res.Body.String())
	}
	res = do(h, http.MethodGet, "/api/tasks/9", "")
	if res.Code != http.StatusNotFound {
		t.Fatalf("missing = %d %s", res.Code, res.Body.String())
	}

	res = do(h, http.MethodPatch, "/api/tasks/1/done", "")
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"done":true`) {
		t.Fatalf("done = %d %s", res.Code, res.Body.String())
	}
	assertTeaching(t, res, "handleDone")

	res = do(h, http.MethodGet, "/api/tasks", "")
	if strings.TrimSpace(res.Body.String()) != "[]" {
		t.Fatalf("pending after done = %s", res.Body.String())
	}
	res = do(h, http.MethodGet, "/api/tasks?all=true", "")
	if !strings.Contains(res.Body.String(), "Buy milk") {
		t.Fatalf("all = %s", res.Body.String())
	}

	res = do(h, http.MethodPatch, "/api/tasks/9/done", "")
	if res.Code != http.StatusNotFound {
		t.Fatalf("done missing = %d", res.Code)
	}
	res = do(h, http.MethodPatch, "/api/tasks/0/done", "")
	if res.Code != http.StatusBadRequest {
		t.Fatalf("done bad id = %d", res.Code)
	}

	res = do(h, http.MethodDelete, "/api/tasks/1", "")
	if res.Code != http.StatusNoContent || res.Body.Len() != 0 {
		t.Fatalf("delete = %d %s", res.Code, res.Body.String())
	}
	if got := res.Header().Get("X-Go-Handler"); got != "handleDelete" {
		t.Fatalf("handler = %s", got)
	}
	res = do(h, http.MethodDelete, "/api/tasks/1", "")
	if res.Code != http.StatusNotFound {
		t.Fatalf("delete again = %d", res.Code)
	}
	res = do(h, http.MethodDelete, "/api/tasks/x", "")
	if res.Code != http.StatusBadRequest {
		t.Fatalf("delete bad = %d", res.Code)
	}

	res = do(h, http.MethodPut, "/api/tasks/1/done", "")
	if res.Code != http.StatusMethodNotAllowed {
		t.Fatalf("method = %d", res.Code)
	}

	req := httptest.NewRequest(http.MethodOptions, "/api/tasks", nil)
	req.Header.Set("Origin", "http://localhost:5173")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Code != http.StatusNoContent {
		t.Fatalf("options = %d", rec.Code)
	}
	if rec.Header().Get("Access-Control-Allow-Origin") != "http://localhost:5173" {
		t.Fatalf("cors = %s", rec.Header().Get("Access-Control-Allow-Origin"))
	}
	if !strings.Contains(rec.Header().Get("Access-Control-Expose-Headers"), "X-Go-Handler") {
		t.Fatal("missing expose headers")
	}

	req = httptest.NewRequest(http.MethodGet, "/api/health", nil)
	req.Header.Set("Origin", "https://evil.example")
	rec = httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	if rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("unexpected cors for evil origin")
	}

	res = do(h, http.MethodGet, "/", "")
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), "-dev") {
		t.Fatalf("root = %d %s", res.Code, res.Body.String())
	}

	loaded, err := file.Load()
	if err != nil {
		t.Fatal(err)
	}
	if len(loaded.Tasks) != 0 {
		t.Fatalf("file still has %+v", loaded.Tasks)
	}
}

func TestCORSOffWithoutDev(t *testing.T) {
	srv, _ := newFileServer(t, false)
	req := httptest.NewRequest(http.MethodGet, "/api/health", nil)
	req.Header.Set("Origin", "http://127.0.0.1:5173")
	rec := httptest.NewRecorder()
	srv.Handler().ServeHTTP(rec, req)
	if rec.Header().Get("Access-Control-Allow-Origin") != "" {
		t.Fatal("cors should be off")
	}
	root := httptest.NewRecorder()
	srv.Handler().ServeHTTP(root, httptest.NewRequest(http.MethodGet, "/", nil))
	if root.Code == http.StatusOK && strings.Contains(root.Body.String(), "Vite") {
		t.Fatal("dev root should be absent")
	}
}

func TestStoreFailures(t *testing.T) {
	st := &memStore{loadErr: io.ErrUnexpectedEOF}
	srv := New(st, Options{Logger: log.New(io.Discard, "", 0)})
	res := do(srv.Handler(), http.MethodGet, "/api/tasks", "")
	if res.Code != http.StatusInternalServerError {
		t.Fatalf("load = %d %s", res.Code, res.Body.String())
	}
	st.loadErr = nil
	st.saveErr = io.ErrShortWrite
	res = do(srv.Handler(), http.MethodPost, "/api/tasks", `{"title":"x"}`)
	if res.Code != http.StatusInternalServerError {
		t.Fatalf("save = %d %s", res.Code, res.Body.String())
	}
}

// LEARN(race-detector): Run this file with `go test -race`. memStore shares one pointer across requests and does not lock. Server.update's mutex keeps Load and Save from overlapping. Remove that lock and the race detector fails this test.
func TestConcurrentCreate(t *testing.T) {
	st := &memStore{}
	srv := New(st, Options{Logger: log.New(io.Discard, "", 0)})
	const n = 32
	var wg sync.WaitGroup
	wg.Add(n)
	for i := 0; i < n; i++ {
		go func(i int) {
			defer wg.Done()
			body := `{"title":"task"}`
			res := do(srv.Handler(), http.MethodPost, "/api/tasks", body)
			if res.Code != http.StatusCreated {
				t.Errorf("status %d body %s", res.Code, res.Body.String())
			}
		}(i)
	}
	wg.Wait()
	if st.list == nil || len(st.list.Tasks) != n {
		t.Fatalf("stored %d tasks, want %d", len(tasksOf(st)), n)
	}
	seen := map[int]bool{}
	for _, task := range st.list.Tasks {
		if seen[task.ID] {
			t.Fatalf("duplicate id %d", task.ID)
		}
		seen[task.ID] = true
	}
}

func TestConcurrentFileCreate(t *testing.T) {
	srv, file := newFileServer(t, true)
	const n = 20
	var wg sync.WaitGroup
	wg.Add(n)
	for i := 0; i < n; i++ {
		go func() {
			defer wg.Done()
			res := do(srv.Handler(), http.MethodPost, "/api/tasks", `{"title":"file task"}`)
			if res.Code != http.StatusCreated {
				t.Errorf("status %d", res.Code)
			}
		}()
	}
	wg.Wait()
	loaded, err := file.Load()
	if err != nil {
		t.Fatal(err)
	}
	if len(loaded.Tasks) != n {
		t.Fatalf("file has %d tasks", len(loaded.Tasks))
	}
}

func TestRemind(t *testing.T) {
	due := time.Now().Add(-time.Hour)
	var buf lockedBuffer
	st := &memStore{list: &task.List{
		NextID: 2,
		Tasks:  []task.Task{{ID: 1, Title: "late", Due: &due, CreatedAt: time.Now().UTC()}},
	}}
	srv := New(st, Options{Logger: log.New(&buf, "", 0)})
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		srv.Remind(ctx, 5*time.Millisecond)
		close(done)
	}()
	deadline := time.Now().Add(3 * time.Second)
	for !strings.Contains(buf.String(), "late") && time.Now().Before(deadline) {
		time.Sleep(5 * time.Millisecond)
	}
	cancel()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Remind did not return")
	}
	if !strings.Contains(buf.String(), "#1 late") {
		t.Fatalf("log = %q", buf.String())
	}
}

func TestRemindLoadError(t *testing.T) {
	var buf lockedBuffer
	srv := New(&memStore{loadErr: io.ErrUnexpectedEOF}, Options{Logger: log.New(&buf, "", 0)})
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		srv.Remind(ctx, 5*time.Millisecond)
		close(done)
	}()
	deadline := time.Now().Add(3 * time.Second)
	for !strings.Contains(buf.String(), "overdue check") && time.Now().Before(deadline) {
		time.Sleep(5 * time.Millisecond)
	}
	cancel()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Remind did not return")
	}
	if !strings.Contains(buf.String(), "overdue check") {
		t.Fatalf("log = %q", buf.String())
	}
}

func TestWithStatic(t *testing.T) {
	srv, _ := newFileServer(t, false)
	files := fstest.MapFS{
		"index.html":    {Data: []byte("HOME")},
		"assets/app.js": {Data: []byte("JS")},
		"favicon.svg":   {Data: []byte("<svg></svg>")},
	}
	h := WithStatic(srv.Handler(), files)

	res := do(h, http.MethodGet, "/assets/app.js", "")
	if res.Code != http.StatusOK || res.Body.String() != "JS" {
		t.Fatalf("asset = %d %s", res.Code, res.Body.String())
	}
	res = do(h, http.MethodGet, "/lessons", "")
	if res.Code != http.StatusOK || res.Body.String() != "HOME" {
		t.Fatalf("spa = %d %s", res.Code, res.Body.String())
	}
	res = do(h, http.MethodGet, "/", "")
	if res.Body.String() != "HOME" {
		t.Fatalf("root = %s", res.Body.String())
	}
	res = do(h, http.MethodGet, "/api/health", "")
	if res.Code != http.StatusOK || !strings.Contains(res.Body.String(), `"ok":true`) {
		t.Fatalf("api behind static = %d %s", res.Code, res.Body.String())
	}
}

func TestLogging(t *testing.T) {
	var buf lockedBuffer
	srv, _ := newFileServer(t, true)
	srv.log = log.New(&buf, "", 0)
	do(srv.Handler(), http.MethodGet, "/api/health", "")
	if !strings.Contains(buf.String(), "GET /api/health 200") {
		t.Fatalf("log = %q", buf.String())
	}
}

func newFileServer(t *testing.T, dev bool) (*Server, *store.JSONFile) {
	t.Helper()
	file := store.NewJSONFile(filepath.Join(t.TempDir(), "todo.json"))
	srv := New(file, Options{Dev: dev, Logger: log.New(io.Discard, "", 0)})
	return srv, file
}

func do(h http.Handler, method, path, body string) *httptest.ResponseRecorder {
	var r io.Reader
	if body != "" {
		r = strings.NewReader(body)
	}
	req := httptest.NewRequest(method, path, r)
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func assertTeaching(t *testing.T, res *httptest.ResponseRecorder, handler string) {
	t.Helper()
	if got := res.Header().Get("X-Go-Handler"); got != handler {
		t.Fatalf("X-Go-Handler = %q, want %s", got, handler)
	}
	got := strings.Split(res.Header().Get("X-Go-Concepts"), ",")
	want := learn.HandlerConcepts[handler]
	if strings.Join(got, ",") != strings.Join(want, ",") {
		t.Fatalf("concepts = %v, want %v", got, want)
	}
}

// memStore shares its list with no lock of its own. Server.update is what makes concurrent use safe.
type memStore struct {
	list    *task.List
	loadErr error
	saveErr error
}

func (m *memStore) Load() (*task.List, error) {
	if m.loadErr != nil {
		return nil, m.loadErr
	}
	if m.list == nil {
		m.list = &task.List{Tasks: []task.Task{}, NextID: 1}
	}
	cp := *m.list
	cp.Tasks = append([]task.Task(nil), m.list.Tasks...)
	return &cp, nil
}

func (m *memStore) Save(list *task.List) error {
	if m.saveErr != nil {
		return m.saveErr
	}
	cp := *list
	cp.Tasks = append([]task.Task(nil), list.Tasks...)
	m.list = &cp
	return nil
}

func tasksOf(m *memStore) []task.Task {
	if m.list == nil {
		return nil
	}
	return m.list.Tasks
}

type lockedBuffer struct {
	mu sync.Mutex
	b  strings.Builder
}

func (l *lockedBuffer) Write(p []byte) (int, error) {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.b.Write(p)
}

func (l *lockedBuffer) String() string {
	l.mu.Lock()
	defer l.mu.Unlock()
	return l.b.String()
}
