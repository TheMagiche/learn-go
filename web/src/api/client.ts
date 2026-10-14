import type { Trace } from "../types";

export const apiOrigin = (import.meta.env.VITE_API_ORIGIN ?? "http://localhost:8080").replace(/\/$/, "");

export class ApiRequestError extends Error {
  readonly status: number;
  readonly trace: Trace;

  constructor(message: string, trace: Trace) {
    super(message);
    this.name = "ApiRequestError";
    this.status = trace.status;
    this.trace = trace;
  }
}

export async function apiRequest<T>(
  method: string,
  url: string,
  body?: unknown,
): Promise<{ data: T; trace: Trace }> {
  const headers: Record<string, string> = {};
  let requestBody: string | undefined;
  if (body !== undefined) {
    requestBody = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  }
  const started = performance.now();
  const response = await fetch(url, { method, headers, body: requestBody });
  const durationMs = Math.max(0, Math.round(performance.now() - started));
  const responseBody = await response.text();
  const trace: Trace = {
    id: crypto.randomUUID(),
    method,
    url,
    requestBody,
    status: response.status,
    durationMs,
    responseBody,
    handler: response.headers.get("X-Go-Handler") ?? "",
    concepts: (response.headers.get("X-Go-Concepts") ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean),
    at: new Date().toISOString(),
  };
  if (!response.ok) {
    throw new ApiRequestError(readError(responseBody, response.statusText), trace);
  }
  const data = (responseBody ? JSON.parse(responseBody) : null) as T;
  return { data, trace };
}

function readError(body: string, fallback: string): string {
  try {
    const parsed: unknown = JSON.parse(body);
    if (parsed && typeof parsed === "object" && "error" in parsed && typeof parsed.error === "string") {
      return parsed.error;
    }
  } catch {
    // Not JSON. Use the status text.
  }
  return fallback || "request failed";
}

export function curlCommand(trace: Trace, origin = apiOrigin): string {
  const lines = [`curl -sS -X ${trace.method} '${origin}${trace.url}'`];
  if (trace.requestBody) {
    lines.push("-H 'Content-Type: application/json'", `-d '${trace.requestBody}'`);
  }
  return lines.join(" \\\n  ");
}

export function cliCommand(trace: Trace): string {
  const url = new URL(trace.url, "http://todo.local");
  if (trace.method === "GET" && url.pathname === "/api/tasks") {
    return url.searchParams.get("all") === "true" ? "todo list -all" : "todo list";
  }
  if (trace.method === "GET" && /^\/api\/tasks\/\d+$/.test(url.pathname)) {
    return "todo list -all";
  }
  if (trace.method === "POST" && url.pathname === "/api/tasks") {
    let title = "";
    let due = "";
    try {
      const parsed: unknown = JSON.parse(trace.requestBody ?? "{}");
      if (parsed && typeof parsed === "object") {
        if ("title" in parsed && typeof parsed.title === "string") title = parsed.title;
        if ("due" in parsed && typeof parsed.due === "string") due = ` -due ${parsed.due.slice(0, 10)}`;
      }
    } catch {
      title = "";
    }
    return `todo add${due} "${title.replaceAll('"', '\\"')}"`;
  }
  const id = url.pathname.match(/^\/api\/tasks\/(\d+)/)?.[1];
  if (trace.method === "PATCH" && id) return `todo done ${id}`;
  if (trace.method === "DELETE" && id) return `todo delete ${id}`;
  if (url.pathname === "/api/health") return "# /api/health has no CLI subcommand";
  return "todo";
}
