package store

import (
	"errors"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"todo/internal/task"
)

func TestJSONFileRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "nested", "todo.json")
	file := NewJSONFile(path)

	missing, err := file.Load()
	if err != nil {
		t.Fatal(err)
	}
	if missing.NextID != 1 || len(missing.Tasks) != 0 {
		t.Fatalf("missing file list = %+v", missing)
	}

	due := time.Date(2026, 10, 20, 23, 59, 59, 0, time.UTC)
	created, err := missing.Add("Buy milk", &due)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := missing.Complete(created.ID); err != nil {
		t.Fatal(err)
	}
	if err := file.Save(missing); err != nil {
		t.Fatal(err)
	}

	matches, err := filepath.Glob(filepath.Join(filepath.Dir(path), ".todo-*.tmp"))
	if err != nil {
		t.Fatal(err)
	}
	if len(matches) != 0 {
		t.Fatalf("temp files left behind: %v", matches)
	}

	loaded, err := file.Load()
	if err != nil {
		t.Fatal(err)
	}
	if loaded.NextID != missing.NextID || len(loaded.Tasks) != 1 {
		t.Fatalf("loaded = %+v", loaded)
	}
	got := loaded.Tasks[0]
	if got.Title != "Buy milk" || !got.Done || got.DoneAt == nil || got.Due == nil || !got.Due.Equal(due) {
		t.Fatalf("task = %+v", got)
	}

	raw, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(string(raw), "\n  ") {
		t.Fatal("expected indented JSON")
	}
}

func TestJSONFileNullTasks(t *testing.T) {
	path := filepath.Join(t.TempDir(), "todo.json")
	if err := os.WriteFile(path, []byte(`{"tasks":null,"nextId":0}`), 0o644); err != nil {
		t.Fatal(err)
	}
	loaded, err := NewJSONFile(path).Load()
	if err != nil {
		t.Fatal(err)
	}
	if loaded.Tasks == nil || loaded.NextID != 1 {
		t.Fatalf("loaded = %+v", loaded)
	}
}

func TestJSONFileCorrupt(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "todo.json")
	if err := os.WriteFile(path, []byte("{"), 0o644); err != nil {
		t.Fatal(err)
	}
	_, err := NewJSONFile(path).Load()
	if err == nil || !strings.Contains(err.Error(), "parse tasks") {
		t.Fatalf("error = %v", err)
	}

	if err := os.Mkdir(filepath.Join(dir, "not-a-file"), 0o755); err != nil {
		t.Fatal(err)
	}
	_, err = NewJSONFile(filepath.Join(dir, "not-a-file")).Load()
	if err == nil || !strings.Contains(err.Error(), "read tasks") {
		t.Fatalf("error = %v", err)
	}
}

func TestJSONFileSaveErrors(t *testing.T) {
	dir := t.TempDir()
	// A path whose parent is a file cannot be created.
	parent := filepath.Join(dir, "file")
	if err := os.WriteFile(parent, []byte("x"), 0o644); err != nil {
		t.Fatal(err)
	}
	err := NewJSONFile(filepath.Join(parent, "todo.json")).Save(&task.List{})
	if err == nil {
		t.Fatal("expected save to fail")
	}
	if errors.Is(err, os.ErrNotExist) {
		t.Fatal("unexpected missing-file error")
	}
}

func TestStoreInterface(t *testing.T) {
	var _ Store = (*JSONFile)(nil)
}
