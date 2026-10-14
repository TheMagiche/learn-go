import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useTasks } from "./useTasks";
import type { Task } from "../types";

const sample: Task = {
  id: 1,
  title: "Buy milk",
  done: false,
  createdAt: "2026-10-14T00:00:00Z",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

function json(body: unknown, status: number, handler: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "X-Go-Handler": handler,
      "X-Go-Concepts": "http-handler",
    },
  });
}

function install(routes: (method: string) => Response) {
  vi.stubGlobal(
    "fetch",
    vi.fn((_input: RequestInfo | URL, init?: RequestInit) => Promise.resolve(routes(init?.method ?? "GET"))),
  );
}

describe("useTasks", () => {
  it("loads tasks and records the trace", async () => {
    install((method) => {
      if (method !== "GET") throw new Error(method);
      return json([sample], 200, "handleList");
    });
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.tasks).toEqual([sample]);
    expect(result.current.traces[0]?.handler).toBe("handleList");
    expect(result.current.loadError).toBeNull();
  });

  it("rolls back an add that the server rejects", async () => {
    install((method) => {
      if (method === "GET") return json([sample], 200, "handleList");
      return json({ error: "title must not be empty" }, 400, "handleCreate");
    });
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await expect(result.current.add("   ")).rejects.toThrow(/title/);
    });
    expect(result.current.tasks).toEqual([sample]);
    expect(result.current.actionError).toMatch(/title/);
    expect(result.current.traces[0]?.status).toBe(400);
  });

  it("replaces the optimistic task with the server task", async () => {
    const created: Task = { ...sample, id: 2, title: "Write tests" };
    install((method) => {
      if (method === "GET") return json([sample], 200, "handleList");
      return json(created, 201, "handleCreate");
    });
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await result.current.add("Write tests");
    });
    expect(result.current.tasks.map((task) => task.id)).toEqual([1, 2]);
    expect(result.current.traces[0]?.status).toBe(201);
  });

  it("restores a task when delete fails", async () => {
    install((method) => {
      if (method === "GET") return json([sample], 200, "handleList");
      return json({ error: "task not found" }, 404, "handleDelete");
    });
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    await act(async () => {
      await expect(result.current.remove(1)).rejects.toThrow(/not found/);
    });
    expect(result.current.tasks).toEqual([sample]);
  });

  it("keeps the last 20 traces", async () => {
    install(() => json([sample], 200, "handleList"));
    const { result } = renderHook(() => useTasks());
    await waitFor(() => expect(result.current.loading).toBe(false));
    for (let i = 0; i < 25; i += 1) {
      await act(async () => {
        await result.current.refresh();
      });
    }
    expect(result.current.traces).toHaveLength(20);
  });
});
