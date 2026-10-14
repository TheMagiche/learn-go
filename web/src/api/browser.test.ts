import { afterEach, describe, expect, it } from "vitest";
import { ApiRequestError } from "./client";
import { browserRequest } from "./browser";

afterEach(() => {
  localStorage.clear();
});

describe("browserRequest", () => {
  it("stores a task and records the Go handler that route uses", async () => {
    const created = await browserRequest<{ id: number; title: string }>("POST", "/api/tasks", { title: "Buy milk" });
    expect(created.data.title).toBe("Buy milk");
    expect(created.trace.status).toBe(201);
    expect(created.trace.handler).toBe("handleCreate");
    expect(created.trace.concepts).toContain("struct-tags");

    const listed = await browserRequest<{ title: string }[]>("GET", "/api/tasks?all=true");
    expect(listed.data.map((task) => task.title)).toEqual(["Buy milk"]);
    expect(listed.trace.handler).toBe("handleList");
  });

  it("rejects an empty title the way the API does", async () => {
    await expect(browserRequest("POST", "/api/tasks", { title: "   " })).rejects.toMatchObject({
      message: "title must not be empty",
      status: 400,
    });
    await expect(browserRequest("POST", "/api/tasks", { title: "   " })).rejects.toBeInstanceOf(ApiRequestError);
    const listed = await browserRequest<unknown[]>("GET", "/api/tasks?all=true");
    expect(listed.data).toEqual([]);
  });

  it("completes and deletes a task", async () => {
    const created = await browserRequest<{ id: number }>("POST", "/api/tasks", { title: "Write tests" });
    const done = await browserRequest<{ done: boolean; doneAt?: string }>("PATCH", `/api/tasks/${created.data.id}/done`);
    expect(done.data.done).toBe(true);
    expect(done.data.doneAt).toBeTruthy();
    expect(done.trace.handler).toBe("handleDone");

    const removed = await browserRequest<null>("DELETE", `/api/tasks/${created.data.id}`);
    expect(removed.data).toBeNull();
    expect(removed.trace.status).toBe(204);
    expect(removed.trace.responseBody).toBe("");
  });

  it("answers health", async () => {
    const health = await browserRequest<{ ok: boolean }>("GET", "/api/health");
    expect(health.data).toEqual({ ok: true });
    expect(health.trace.handler).toBe("handleHealth");
  });
});
