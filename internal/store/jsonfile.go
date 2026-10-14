package store

import (
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"

	"todo/internal/task"
)

// JSONFile stores the list as indented JSON at Path.
type JSONFile struct {
	Path string
}

// NewJSONFile returns a store for path.
func NewJSONFile(path string) *JSONFile {
	return &JSONFile{Path: path}
}

// Load reads the file. A missing file is an empty list, not an error.
func (f *JSONFile) Load() (*task.List, error) {
	// LEARN(interfaces): *JSONFile implements Store because Load and Save have the right signatures. The compiler checks it; there is no implements clause.
	// LEARN(files): os.ReadFile loads a whole file. os.ErrNotExist is a sentinel for "the path is not there". A brand-new user has no todo file yet, so that case is an empty list.
	data, err := os.ReadFile(f.Path)
	if errors.Is(err, os.ErrNotExist) {
		return &task.List{Tasks: []task.Task{}, NextID: 1}, nil
	}
	if err != nil {
		// LEARN(error-wrapping): %w keeps the original error inside this one. Callers can still errors.Is the result against os.ErrPermission, and the prefix says which step failed.
		return nil, fmt.Errorf("read tasks: %w", err)
	}
	var list task.List
	// LEARN(json): Unmarshal fills the struct using the json tags on Task and List. The bytes on disk use createdAt; the Go field is CreatedAt.
	if err := json.Unmarshal(data, &list); err != nil {
		return nil, fmt.Errorf("parse tasks: %w", err)
	}
	if list.Tasks == nil {
		list.Tasks = []task.Task{}
	}
	if list.NextID < 1 {
		list.NextID = 1
	}
	return &list, nil
}

// Save writes the list atomically.
func (f *JSONFile) Save(list *task.List) error {
	if list.Tasks == nil {
		list.Tasks = []task.Task{}
	}
	// LEARN(json): MarshalIndent produces the pretty file you can open in an editor. The tags on Task pick the keys.
	data, err := json.MarshalIndent(list, "", "  ")
	if err != nil {
		return fmt.Errorf("encode tasks: %w", err)
	}
	data = append(data, '\n')
	dir := filepath.Dir(f.Path)
	if err := os.MkdirAll(dir, 0o755); err != nil {
		return fmt.Errorf("create task dir: %w", err)
	}
	// LEARN(atomic-write): Write a temp file in the same directory, then os.Rename it over the real path. On one filesystem, rename replaces the destination in a single step. A crash during the write leaves the previous todo.json intact, and leaves a temp file we can delete.
	tmp, err := os.CreateTemp(dir, ".todo-*.tmp")
	if err != nil {
		return fmt.Errorf("create temp tasks file: %w", err)
	}
	tmpName := tmp.Name()
	cleanup := true
	defer func() {
		if cleanup {
			_ = os.Remove(tmpName)
		}
	}()
	if _, err := tmp.Write(data); err != nil {
		_ = tmp.Close()
		return fmt.Errorf("write temp tasks file: %w", err)
	}
	if err := tmp.Close(); err != nil {
		return fmt.Errorf("close temp tasks file: %w", err)
	}
	if err := os.Rename(tmpName, f.Path); err != nil {
		return fmt.Errorf("replace tasks file: %w", err)
	}
	cleanup = false
	return nil
}
