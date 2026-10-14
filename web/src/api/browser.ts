import { handlerConcepts } from "../learn/goSources";
import type { Task, Trace } from "../types";
import { ApiRequestError } from "./client";

export const browserMode = import.meta.env.VITE_API_MODE === "browser";

const storageKey = "todo-browser-tasks";

type Stored = { nextId: number; tasks: Task[] };

type ErrorBody = { error: string };

// browserRequest answers the same routes as the Go API and stores the list in
// localStorage. The trace names the handler the real server would have run.
export async function browserRequest<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<{ data: T; trace: Trace }> {
  const requestBody = body === undefined ? undefined : JSON.stringify(body);
  const target = new URL(url, "http://todo.local");
  const result = dispatch(method, target, body);
  const responseBody = result.status === 204 ? "" : JSON.stringify(result.data);
  const trace: Trace = {
    id: crypto.randomUUID(),
    method,
    url,
    requestBody,
    status: result.status,
    durationMs: 0,
    responseBody,
    handler: result.handler,
    concepts: handlerConcepts[result.handler] ?? [],
    at: new Date().toISOString(),
  };
  if (result.status >= 400) {
    const message = isErrorBody(result.data) ? result.data.error : "request failed";
    throw new ApiRequestError(message, trace);
  }
  return { data: result.data as T, trace };
}

function dispatch(
  method: string,
  url: URL,
  body: unknown,
): { status: number; handler: string; data: unknown } {
  if (method === "GET" && url.pathname === "/api/health") {
    return { status: 200, handler: "handleHealth", data: { ok: true } };
  }
  if (method === "GET" && url.pathname === "/api/tasks") {
    const stored = readStore();
    const tasks = url.searchParams.get("all") === "true" ? stored.tasks : stored.tasks.filter((task) => !task.done);
    return { status: 200, handler: "handleList", data: tasks };
  }
  if (method === "POST" && url.pathname === "/api/tasks") {
    return createTask(body);
  }
  const done = url.pathname.match(/^\/api\/tasks\/(\d+)\/done$/);
  if (method === "PATCH" && done) {
    return completeTask(Number(done[1]));
  }
  const one = url.pathname.match(/^\/api\/tasks\/(\d+)$/);
  if (method === "DELETE" && one) {
    return deleteTask(Number(one[1]));
  }
  return { status: 404, handler: "handleGet", data: { error: "task not found" } };
}

function createTask(body: unknown): { status: number; handler: string; data: Task | ErrorBody } {
  if (!body || typeof body !== "object") {
    return { status: 400, handler: "handleCreate", data: { error: "invalid json" } };
  }
  const title = "title" in body && typeof body.title === "string" ? body.title.trim() : "";
  if (!title) {
    return { status: 400, handler: "handleCreate", data: { error: "title must not be empty" } };
  }
  const due = "due" in body && typeof body.due === "string" && body.due ? body.due : undefined;
  const stored = readStore();
  const task: Task = {
    id: stored.nextId,
    title,
    done: false,
    createdAt: new Date().toISOString(),
    due,
  };
  stored.nextId += 1;
  stored.tasks.push(task);
  writeStore(stored);
  return { status: 201, handler: "handleCreate", data: task };
}

function completeTask(id: number): { status: number; handler: string; data: Task | ErrorBody } {
  const stored = readStore();
  const task = stored.tasks.find((item) => item.id === id);
  if (!task) return { status: 404, handler: "handleDone", data: { error: "task not found" } };
  if (!task.done) {
    task.done = true;
    task.doneAt = new Date().toISOString();
    writeStore(stored);
  }
  return { status: 200, handler: "handleDone", data: task };
}

function deleteTask(id: number): { status: number; handler: string; data: null | ErrorBody } {
  const stored = readStore();
  const next = stored.tasks.filter((task) => task.id !== id);
  if (next.length === stored.tasks.length) {
    return { status: 404, handler: "handleDelete", data: { error: "task not found" } };
  }
  stored.tasks = next;
  writeStore(stored);
  return { status: 204, handler: "handleDelete", data: null };
}

function readStore(): Stored {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return { nextId: 1, tasks: [] };
    const record = parsed as Partial<Stored>;
    const nextId = typeof record.nextId === "number" && record.nextId >= 1 ? record.nextId : 1;
    const tasks = Array.isArray(record.tasks) ? record.tasks.filter(isTask) : [];
    return { nextId, tasks };
  } catch {
    return { nextId: 1, tasks: [] };
  }
}

function writeStore(stored: Stored) {
  localStorage.setItem(storageKey, JSON.stringify(stored));
}

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== "object") return false;
  const task = value as Partial<Task>;
  return (
    typeof task.id === "number" &&
    typeof task.title === "string" &&
    typeof task.done === "boolean" &&
    typeof task.createdAt === "string"
  );
}

function isErrorBody(value: unknown): value is ErrorBody {
  return Boolean(value && typeof value === "object" && "error" in value && typeof value.error === "string");
}
