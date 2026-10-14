// Package task is the todo list itself: the Task struct and the methods that edit a List.
package task

import (
	"errors"
	"strings"
	"time"
)

// LEARN(errors): ErrNotFound and ErrEmptyTitle are sentinel errors. Callers match them with errors.Is, not string compare, so wrapping the error later still works.
var (
	ErrNotFound   = errors.New("task not found")
	ErrEmptyTitle = errors.New("title must not be empty")
)

// Task is one row in the list.
//
// LEARN(structs): A struct groups named fields into one value. Task is the shape stored on disk and sent as JSON.
// LEARN(struct-tags): The text in backticks is a struct tag. encoding/json reads the json key to pick the name the browser sees. omitempty drops the field when it is nil.
type Task struct {
	ID        int        `json:"id"`
	Title     string     `json:"title"`
	Done      bool       `json:"done"`
	CreatedAt time.Time  `json:"createdAt"`
	DoneAt    *time.Time `json:"doneAt,omitempty"`
	Due       *time.Time `json:"due,omitempty"`
}

// List is the whole document: every task plus the next id to assign.
type List struct {
	Tasks  []Task `json:"tasks"`
	NextID int    `json:"nextId"`
}

// Add appends a task. due may be nil.
//
// LEARN(pointer-receiver): The receiver is *List, a pointer. Add appends to the slice and bumps NextID. Those edits must change the caller's list. A plain List receiver would edit a copy and the new task would vanish when the function returns.
// LEARN(methods): func (l *List) Add hangs Add on the List type. Callers write list.Add(title, due). l is the receiver, the value before the dot.
func (l *List) Add(title string, due *time.Time) (Task, error) {
	title = strings.TrimSpace(title)
	if title == "" {
		// LEARN(errors): Returning ErrEmptyTitle tells the caller exactly which rule failed. The zero Task next to it means "nothing was created".
		return Task{}, ErrEmptyTitle
	}
	if l.NextID < 1 {
		l.NextID = 1
	}
	// LEARN(structs): The composite literal builds a Task by naming each field. Unset fields keep their zero value, so Done starts false and DoneAt starts nil.
	// LEARN(struct-tags): Nothing here reads the tags. They matter later, when json.Marshal turns this value into {"title":"..."} for the browser.
	t := Task{
		ID:        l.NextID,
		Title:     title,
		CreatedAt: time.Now().UTC(),
		Due:       due,
	}
	l.NextID++
	// LEARN(slices): Tasks is a slice, a growable view over an array. append adds t and may allocate a larger array if the old one is full. Assigning the result back to l.Tasks is required.
	l.Tasks = append(l.Tasks, t)
	return t, nil
}

// Complete marks a task done. Marking an already-done task again keeps the original DoneAt.
//
// LEARN(pointers): DoneAt is *time.Time, a pointer. nil means "there is no completion time", which is different from the year 1. &now is the address of the local variable. After this function returns, Go keeps that time on the heap because the task still points at it.
func (l *List) Complete(id int) (Task, error) {
	for i := range l.Tasks {
		if l.Tasks[i].ID != id {
			continue
		}
		if !l.Tasks[i].Done {
			now := time.Now().UTC()
			l.Tasks[i].Done = true
			l.Tasks[i].DoneAt = &now
		}
		return l.Tasks[i], nil
	}
	return Task{}, ErrNotFound
}

// Delete removes a task by id.
func (l *List) Delete(id int) error {
	for i := range l.Tasks {
		if l.Tasks[i].ID != id {
			continue
		}
		// LEARN(slices): This append skips index i by joining the head and the tail. The deleted task is no longer in the slice.
		l.Tasks = append(l.Tasks[:i], l.Tasks[i+1:]...)
		return nil
	}
	return ErrNotFound
}

// Get returns a copy of the task with the given id.
func (l *List) Get(id int) (Task, error) {
	// LEARN(range): range walks the slice from front to back. The blank identifier drops the index. t is a copy of each element, which is fine because Get does not edit the list.
	for _, t := range l.Tasks {
		if t.ID == id {
			return t, nil
		}
	}
	return Task{}, ErrNotFound
}

// All returns every task, completed ones included.
func (l *List) All() []Task {
	return cloneTasks(l.Tasks)
}

// Pending returns tasks that are not done.
func (l *List) Pending() []Task {
	var out []Task
	for _, t := range l.Tasks {
		if !t.Done {
			out = append(out, t)
		}
	}
	return cloneTasks(out)
}

// Overdue returns pending tasks whose due instant is before now.
func (l *List) Overdue(now time.Time) []Task {
	var out []Task
	for _, t := range l.Tasks {
		if t.Done || t.Due == nil || !t.Due.Before(now) {
			continue
		}
		out = append(out, t)
	}
	return cloneTasks(out)
}

func cloneTasks(in []Task) []Task {
	if len(in) == 0 {
		return []Task{}
	}
	out := make([]Task, len(in))
	copy(out, in)
	return out
}
