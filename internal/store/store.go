// Package store loads and saves a task list. Handlers depend on the Store interface, not on a file path.
package store

import "todo/internal/task"

// Store is how the API reads and writes the list.
//
// LEARN(interfaces): An interface is a set of methods. Any type with Load and Save is a Store, without an implements keyword. JSONFile is the store in this repo. The lessons ask you to write a MemoryStore that satisfies the same two methods so the handlers do not change.
type Store interface {
	Load() (*task.List, error)
	Save(*task.List) error
}
