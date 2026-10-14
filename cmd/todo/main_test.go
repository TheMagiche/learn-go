package main

import (
	"bytes"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func TestCLIRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "todo.json")
	due := time.Now().Add(48 * time.Hour).Format("2006-01-02")

	out, errOut, code := runCLI(t, "add", "-file", path, "-due", due, "Buy milk")
	if code != 0 {
		t.Fatalf("add code %d stderr %s", code, errOut)
	}
	if !strings.Contains(out, "added 1") {
		t.Fatalf("stdout %q", out)
	}

	out, _, code = runCLI(t, "add", "-file", path, "Write tests")
	if code != 0 || !strings.Contains(out, "added 2") {
		t.Fatalf("add 2: %d %q", code, out)
	}

	out, _, code = runCLI(t, "list", "-file", path)
	if code != 0 {
		t.Fatal(code)
	}
	if !strings.Contains(out, "Buy milk") || !strings.Contains(out, "Write tests") {
		t.Fatalf("list %q", out)
	}

	if _, _, code = runCLI(t, "done", "-file", path, "2"); code != 0 {
		t.Fatal(code)
	}
	out, _, code = runCLI(t, "list", "-file", path)
	if code != 0 {
		t.Fatal(code)
	}
	if strings.Contains(out, "Write tests") {
		t.Fatalf("pending list still has completed task: %q", out)
	}
	out, _, code = runCLI(t, "list", "-file", path, "-all")
	if code != 0 || !strings.Contains(out, "Write tests") || !strings.Contains(out, "yes") {
		t.Fatalf("all = %d %q", code, out)
	}

	if _, _, code = runCLI(t, "delete", "-file", path, "1"); code != 0 {
		t.Fatal(code)
	}
	out, _, code = runCLI(t, "list", "-file", path, "-all")
	if code != 0 || strings.Contains(out, "Buy milk") {
		t.Fatalf("after delete %q", out)
	}
}

func TestCLIUsageAndErrors(t *testing.T) {
	path := filepath.Join(t.TempDir(), "todo.json")
	if _, _, code := runCLI(t); code != 2 {
		t.Fatalf("no args = %d", code)
	}
	if _, _, code := runCLI(t, "nope"); code != 2 {
		t.Fatalf("unknown = %d", code)
	}
	if _, _, code := runCLI(t, "add", "-file", path); code != 2 {
		t.Fatalf("add usage = %d", code)
	}
	if _, stderr, code := runCLI(t, "add", "-file", path, "   "); code != 1 || !strings.Contains(stderr, "title") {
		t.Fatalf("empty title code %d stderr %q", code, stderr)
	}
	if _, _, code := runCLI(t, "add", "-file", path, "-due", "tomorrow", "x"); code != 2 {
		t.Fatalf("bad due = %d", code)
	}
	if _, _, code := runCLI(t, "done", "-file", path, "abc"); code != 2 {
		t.Fatalf("bad id = %d", code)
	}
	_, stderr, code := runCLI(t, "done", "-file", path, "4")
	if code != 1 || !strings.Contains(stderr, "not found") {
		t.Fatalf("missing code %d stderr %q", code, stderr)
	}
	if _, _, code := runCLI(t, "delete", "-file", path); code != 2 {
		t.Fatalf("delete usage = %d", code)
	}
	if _, _, code := runCLI(t, "list", "-file", path, "extra"); code != 2 {
		t.Fatalf("list usage = %d", code)
	}
	if _, _, code := runCLI(t, "serve", "extra"); code != 2 {
		t.Fatalf("serve usage = %d", code)
	}
	out, _, code := runCLI(t, "list", "-file", path)
	if code != 0 || !strings.Contains(out, "no tasks") {
		t.Fatalf("empty list %d %q", code, out)
	}
}

func TestParseDue(t *testing.T) {
	got, err := parseDue("")
	if err != nil || got != nil {
		t.Fatalf("empty = %v %v", got, err)
	}
	got, err = parseDue("2026-10-20T15:04:05Z")
	if err != nil || got == nil || got.Format(time.RFC3339) != "2026-10-20T15:04:05Z" {
		t.Fatalf("rfc3339 = %v %v", got, err)
	}
	got, err = parseDue("2026-10-20")
	if err != nil || got == nil {
		t.Fatal(err)
	}
	local := got.Local()
	if local.Hour() != 23 || local.Day() != 20 {
		t.Fatalf("end of day = %v", local)
	}
	if _, err := parseDue("nope"); err == nil {
		t.Fatal("expected error")
	}
}

func runCLI(t *testing.T, args ...string) (string, string, int) {
	t.Helper()
	var stdout, stderr bytes.Buffer
	code := run(args, env{stdout: &stdout, stderr: &stderr})
	return stdout.String(), stderr.String(), code
}
