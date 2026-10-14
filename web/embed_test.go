package web

import (
	"io/fs"
	"testing"
)

func TestDistHasIndex(t *testing.T) {
	files, err := Dist()
	if err != nil {
		t.Fatal(err)
	}
	if _, err := fs.Stat(files, "index.html"); err != nil {
		t.Fatal(err)
	}
}
