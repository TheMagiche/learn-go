// Package learn attaches teaching headers to API responses so the UI can show the Go behind a click.
package learn

import (
	"net/http"
	"strings"
)

// HandlerConcepts lists the concept ids each handler wants the UI to explain.
// scripts/gen-go-sources.go reads this map, so keep one id per line.
var HandlerConcepts = map[string][]string{
	"handleList": {
		"http-handler",
		"servemux-patterns",
		"json",
		"slices",
		"mutex",
	},
	"handleCreate": {
		"http-handler",
		"json",
		"structs",
		"struct-tags",
		"errors",
		"pointers",
		"mutex",
		"pointer-receiver",
		"methods",
	},
	"handleGet": {
		"http-handler",
		"servemux-patterns",
		"errors",
		"error-wrapping",
		"range",
	},
	"handleDone": {
		"http-handler",
		"pointers",
		"pointer-receiver",
		"methods",
		"mutex",
	},
	"handleDelete": {
		"http-handler",
		"slices",
		"errors",
		"mutex",
	},
	"handleHealth": {
		"http-handler",
		"json",
	},
}

// Annotate sets the teaching headers. Call it before WriteHeader.
func Annotate(w http.ResponseWriter, handler string, concepts []string) {
	w.Header().Set("X-Go-Handler", handler)
	w.Header().Set("X-Go-Concepts", strings.Join(concepts, ","))
}
