import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError, apiRequest, cliCommand, curlCommand } from "./client";
import type { Trace } from "../types";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiRequest", () => {
  it("builds a trace from the teaching headers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("[]", {
            status: 200,
            headers: {
              "X-Go-Handler": "handleList",
              "X-Go-Concepts": "http-handler, slices",
            },
          }),
      ),
    );
    const { data, trace } = await apiRequest<unknown[]>("GET", "/api/tasks?all=true");
    expect(data).toEqual([]);
    expect(trace.method).toBe("GET");
    expect(trace.url).toBe("/api/tasks?all=true");
    expect(trace.status).toBe(200);
    expect(trace.handler).toBe("handleList");
    expect(trace.concepts).toEqual(["http-handler", "slices"]);
    expect(trace.durationMs).toBeGreaterThanOrEqual(0);
    expect(trace.responseBody).toBe("[]");
  });

  it("throws ApiRequestError and keeps the trace", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response('{"error":"title must not be empty"}', {
            status: 400,
            headers: { "X-Go-Handler": "handleCreate", "X-Go-Concepts": "errors" },
          }),
      ),
    );
    const pending = apiRequest("POST", "/api/tasks", { title: "  " });
    await expect(pending).rejects.toBeInstanceOf(ApiRequestError);
    try {
      await pending;
    } catch (err) {
      if (!(err instanceof ApiRequestError)) throw err;
      expect(err.message).toBe("title must not be empty");
      expect(err.trace.status).toBe(400);
      expect(err.trace.requestBody).toBe('{"title":"  "}');
      expect(err.trace.concepts).toEqual(["errors"]);
    }
  });
});

describe("command helpers", () => {
  const trace = (over: Partial<Trace>): Trace => ({
    id: "1",
    method: "GET",
    url: "/api/tasks",
    status: 200,
    durationMs: 1,
    responseBody: "[]",
    handler: "handleList",
    concepts: [],
    at: "2026-10-14T00:00:00Z",
    ...over,
  });

  it("maps routes to curl and the CLI", () => {
    expect(curlCommand(trace({ method: "GET", url: "/api/health" }), "http://localhost:8080")).toContain(
      "GET 'http://localhost:8080/api/health'",
    );
    expect(cliCommand(trace({ method: "GET", url: "/api/tasks?all=true" }))).toBe("todo list -all");
    expect(
      cliCommand(
        trace({
          method: "POST",
          url: "/api/tasks",
          requestBody: '{"title":"Buy milk","due":"2026-10-20T23:59:59.000Z"}',
        }),
      ),
    ).toBe('todo add -due 2026-10-20 "Buy milk"');
    expect(cliCommand(trace({ method: "PATCH", url: "/api/tasks/3/done" }))).toBe("todo done 3");
    expect(cliCommand(trace({ method: "DELETE", url: "/api/tasks/3" }))).toBe("todo delete 3");
  });
});
