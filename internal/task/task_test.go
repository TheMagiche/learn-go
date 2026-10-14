package task

import (
	"errors"
	"testing"
	"time"
)

// LEARN(testing): A test is a function named TestXxx that takes *testing.T. `go test` finds it, runs it, and fails the package if t.Fatal or t.Errorf runs.
// LEARN(table-tests): The slice below is a table. Each row is one case with a name, inputs, and the error we expect. One loop runs every row, so adding a case means adding a row, not copying a function.
func TestAdd(t *testing.T) {
	due := time.Date(2026, 10, 20, 23, 59, 59, 0, time.UTC)
	tests := []struct {
		name    string
		title   string
		due     *time.Time
		wantErr error
	}{
		{name: "title", title: "Buy milk"},
		{name: "trims", title: "  Write tests  "},
		{name: "with due", title: "Ship it", due: &due},
		{name: "empty", title: "   ", wantErr: ErrEmptyTitle},
		{name: "blank", title: "", wantErr: ErrEmptyTitle},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var list List
			got, err := list.Add(tt.title, tt.due)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("Add() error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil {
				if len(list.Tasks) != 0 {
					t.Fatalf("failed Add stored %+v", list.Tasks)
				}
				return
			}
			if got.ID != 1 || got.Done || got.CreatedAt.IsZero() {
				t.Fatalf("task = %+v", got)
			}
			if got.Title != "Buy milk" && got.Title != "Write tests" && got.Title != "Ship it" {
				t.Fatalf("title = %q", got.Title)
			}
			if tt.due != nil && (got.Due == nil || !got.Due.Equal(*tt.due)) {
				t.Fatalf("due = %v", got.Due)
			}
			if _, err := list.Add("second", nil); err != nil {
				t.Fatal(err)
			}
			if list.Tasks[1].ID != 2 || list.NextID != 3 {
				t.Fatalf("ids did not advance: %+v", list)
			}
		})
	}
}

func TestComplete(t *testing.T) {
	var list List
	if _, err := list.Add("Buy milk", nil); err != nil {
		t.Fatal(err)
	}
	got, err := list.Complete(1)
	if err != nil {
		t.Fatal(err)
	}
	if !got.Done || got.DoneAt == nil {
		t.Fatalf("not completed: %+v", got)
	}
	again, err := list.Complete(1)
	if err != nil {
		t.Fatal(err)
	}
	if !again.DoneAt.Equal(*got.DoneAt) {
		t.Fatal("second complete changed DoneAt")
	}
	if _, err := list.Complete(9); !errors.Is(err, ErrNotFound) {
		t.Fatalf("error = %v", err)
	}
}

func TestDelete(t *testing.T) {
	var list List
	for _, title := range []string{"a", "b", "c"} {
		if _, err := list.Add(title, nil); err != nil {
			t.Fatal(err)
		}
	}
	if err := list.Delete(2); err != nil {
		t.Fatal(err)
	}
	if len(list.Tasks) != 2 || list.Tasks[0].Title != "a" || list.Tasks[1].Title != "c" {
		t.Fatalf("tasks = %+v", list.Tasks)
	}
	if err := list.Delete(2); !errors.Is(err, ErrNotFound) {
		t.Fatalf("error = %v", err)
	}
	if err := list.Delete(1); err != nil {
		t.Fatal(err)
	}
	if err := list.Delete(3); err != nil {
		t.Fatal(err)
	}
	if len(list.Tasks) != 0 {
		t.Fatalf("tasks = %+v", list.Tasks)
	}
}

func TestGet(t *testing.T) {
	var list List
	if _, err := list.Add("Buy milk", nil); err != nil {
		t.Fatal(err)
	}
	got, err := list.Get(1)
	if err != nil || got.Title != "Buy milk" {
		t.Fatalf("got %+v, %v", got, err)
	}
	got.Title = "changed copy"
	stored, _ := list.Get(1)
	if stored.Title != "Buy milk" {
		t.Fatal("Get returned a live alias")
	}
	if _, err := list.Get(4); !errors.Is(err, ErrNotFound) {
		t.Fatalf("error = %v", err)
	}
}

func TestFilters(t *testing.T) {
	var list List
	past := time.Now().Add(-time.Hour)
	future := time.Now().Add(time.Hour)
	if _, err := list.Add("open", &future); err != nil {
		t.Fatal(err)
	}
	if _, err := list.Add("late", &past); err != nil {
		t.Fatal(err)
	}
	if _, err := list.Add("plain", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := list.Complete(1); err != nil {
		t.Fatal(err)
	}

	all := list.All()
	if len(all) != 3 {
		t.Fatalf("all = %d", len(all))
	}
	all[0].Title = "mutated"
	if list.Tasks[0].Title == "mutated" {
		t.Fatal("All returned the internal slice")
	}

	pending := list.Pending()
	if len(pending) != 2 || pending[0].Title != "late" || pending[1].Title != "plain" {
		t.Fatalf("pending = %+v", pending)
	}
	overdue := list.Overdue(time.Now())
	if len(overdue) != 1 || overdue[0].Title != "late" {
		t.Fatalf("overdue = %+v", overdue)
	}
	if len(list.Overdue(time.Now().Add(-2*time.Hour))) != 0 {
		t.Fatal("nothing is overdue two hours ago")
	}
}

func TestEmptyFilters(t *testing.T) {
	var list List
	if list.All() == nil || list.Pending() == nil || list.Overdue(time.Now()) == nil {
		t.Fatal("filters should return empty slices, not nil, so JSON encodes []")
	}
	if _, err := list.Add("done", nil); err != nil {
		t.Fatal(err)
	}
	if _, err := list.Complete(1); err != nil {
		t.Fatal(err)
	}
	if len(list.Pending()) != 0 || len(list.Overdue(time.Now())) != 0 {
		t.Fatal("completed task leaked into pending or overdue")
	}
}
