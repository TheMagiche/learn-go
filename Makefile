.PHONY: help gen ensure-dist deps ignore-node-modules dev build test lint clean

GO ?= go
NPM ?= npm
ADDR ?= :8080
WEB_PORT ?= 5173

.DEFAULT_GOAL := help

help:
	@echo "todo — Go API + React learning UI"
	@echo ""
	@echo "  make dev     generate sources, then API on $(ADDR) and Vite on $(WEB_PORT)"
	@echo "  make build   embed the UI into bin/todo"
	@echo "  make test    go test -race -cover and vitest"
	@echo "  make lint    gofmt, go vet, tsc, eslint"
	@echo "  make gen     refresh web/src/learn/goSources.ts"

gen:
	$(GO) run scripts/gen-go-sources.go

ensure-dist:
	@mkdir -p web/dist
	@if [ ! -f web/dist/index.html ]; then printf '%s\n' '<!doctype html><html lang="en"><head><meta charset="utf-8"><title>todo</title></head><body><p>Frontend not built. From the repo root run <code>make build</code>, then <code>./bin/todo serve</code>.</p></body></html>' > web/dist/index.html; fi

deps: web/node_modules/.installed

web/node_modules/.installed: web/package.json
	$(NPM) --prefix web install
	@touch web/node_modules/.installed

# A dependency ships Go files under web/node_modules. A nested go.mod keeps
# `go test ./...` from treating them as part of module todo.
ignore-node-modules:
	@if [ -d web/node_modules ]; then printf '%s\n' 'module todo/web/node_modules' '' 'go 1.22' > web/node_modules/go.mod; fi

dev: gen ensure-dist deps
	@mkdir -p .data
	@echo "API  http://127.0.0.1$(ADDR)"
	@echo "App  http://127.0.0.1:$(WEB_PORT)"
	@trap 'kill 0' INT TERM EXIT; \
		$(GO) run ./cmd/todo serve -dev -addr $(ADDR) -file .data/todo.json & \
		VITE_API_PROXY='http://127.0.0.1$(ADDR)' VITE_API_ORIGIN='http://127.0.0.1$(ADDR)' \
		$(NPM) --prefix web run dev -- --port $(WEB_PORT) --strictPort --host 127.0.0.1

build: gen deps
	$(NPM) --prefix web run build
	$(GO) build -o bin/todo ./cmd/todo

test: gen ensure-dist deps ignore-node-modules
	$(GO) test -race -cover ./...
	$(NPM) --prefix web run test

lint: gen ensure-dist deps ignore-node-modules
	@out=$$(gofmt -l cmd internal scripts web/embed.go web/embed_test.go); \
		if [ -n "$$out" ]; then echo "$$out"; echo "run gofmt -w"; exit 1; fi
	$(GO) vet ./...
	$(NPM) --prefix web run typecheck
	$(NPM) --prefix web run lint

clean:
	rm -rf bin web/dist
