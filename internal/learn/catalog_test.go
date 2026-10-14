package learn

import (
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"
)

func TestAnnotate(t *testing.T) {
	rec := httptest.NewRecorder()
	Annotate(rec, "handleList", []string{"json", "slices"})
	if rec.Header().Get("X-Go-Handler") != "handleList" {
		t.Fatalf("handler %s", rec.Header().Get("X-Go-Handler"))
	}
	if rec.Header().Get("X-Go-Concepts") != "json,slices" {
		t.Fatalf("concepts %s", rec.Header().Get("X-Go-Concepts"))
	}
}

// required is the glossary the spec asks for, plus go-ast from the source generator.
var required = []string{
	"package-main",
	"modules",
	"variables",
	"structs",
	"struct-tags",
	"slices",
	"maps",
	"range",
	"pointers",
	"pointer-receiver",
	"methods",
	"errors",
	"error-wrapping",
	"interfaces",
	"json",
	"files",
	"atomic-write",
	"flag",
	"http-handler",
	"servemux-patterns",
	"middleware",
	"closures",
	"goroutines",
	"channels",
	"context",
	"mutex",
	"race-detector",
	"ticker",
	"embed",
	"testing",
	"table-tests",
	"httptest",
	"go-ast",
}

func TestConceptsMatchSource(t *testing.T) {
	root := moduleRoot(t)
	declared := conceptIDs(t, filepath.Join(root, "web", "src", "learn", "concepts.ts"))
	used := learnIDs(t, root)

	var missing []string
	for id := range used {
		if _, ok := declared[id]; !ok {
			missing = append(missing, id)
		}
	}
	for _, concepts := range HandlerConcepts {
		for _, id := range concepts {
			if _, ok := declared[id]; !ok {
				missing = append(missing, id+" (header)")
			}
		}
	}
	if len(missing) > 0 {
		sort.Strings(missing)
		t.Fatalf("concept ids used in Go but missing from concepts.ts:\n%s", strings.Join(missing, "\n"))
	}

	var absent []string
	for _, id := range required {
		if _, ok := declared[id]; !ok {
			absent = append(absent, id+" missing from concepts.ts")
		}
		if len(used[id]) == 0 {
			absent = append(absent, id+" has no LEARN() comment")
		}
	}
	if len(absent) > 0 {
		t.Fatal(strings.Join(absent, "\n"))
	}
}

func moduleRoot(t *testing.T) string {
	t.Helper()
	dir, err := os.Getwd()
	if err != nil {
		t.Fatal(err)
	}
	for {
		if _, err := os.Stat(filepath.Join(dir, "go.mod")); err == nil {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			t.Fatal("go.mod not found")
		}
		dir = parent
	}
}

func conceptIDs(t *testing.T, path string) map[string]struct{} {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatal(err)
	}
	re := regexp.MustCompile(`(?m)^\s*id:\s*"([a-z0-9-]+)",\s*$`)
	out := map[string]struct{}{}
	for _, m := range re.FindAllStringSubmatch(string(data), -1) {
		if _, ok := out[m[1]]; ok {
			t.Fatalf("duplicate concept id %s", m[1])
		}
		out[m[1]] = struct{}{}
	}
	if len(out) == 0 {
		t.Fatal("no concept ids found")
	}
	return out
}

func learnIDs(t *testing.T, root string) map[string][]string {
	t.Helper()
	re := regexp.MustCompile(`LEARN\(([a-z0-9-]+)\)`)
	out := map[string][]string{}
	err := filepath.WalkDir(root, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}
		if d.IsDir() {
			switch d.Name() {
			case ".git", "node_modules", "dist", "bin", ".data":
				return filepath.SkipDir
			}
			return nil
		}
		if !strings.HasSuffix(path, ".go") {
			return nil
		}
		data, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		rel, _ := filepath.Rel(root, path)
		for _, m := range re.FindAllStringSubmatch(string(data), -1) {
			out[m[1]] = append(out[m[1]], rel)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	return out
}
