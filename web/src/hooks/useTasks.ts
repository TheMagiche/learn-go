import { useCallback, useEffect, useRef, useState } from "react";
import { ApiRequestError, apiRequest } from "../api/client";
import type { Task, Trace } from "../types";

const TRACE_LIMIT = 20;

function pushTrace(setTraces: (value: Trace[] | ((prev: Trace[]) => Trace[])) => void, trace: Trace) {
  setTraces((prev) => [trace, ...prev].slice(0, TRACE_LIMIT));
}

function message(err: unknown): string {
  if (err instanceof ApiRequestError) return err.message;
  if (err instanceof Error && err.message) return err.message;
  return "The Go server is not reachable. Start it with make dev.";
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [traces, setTraces] = useState<Trace[]>([]);
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data, trace } = await apiRequest<Task[]>("GET", "/api/tasks?all=true");
      pushTrace(setTraces, trace);
      setTasks(data);
    } catch (err) {
      if (err instanceof ApiRequestError) pushTrace(setTraces, err.trace);
      setLoadError(message(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const add = useCallback(async (title: string, due?: string) => {
    const trimmed = title.trim();
    const tempId = -Math.floor(Math.random() * 1_000_000_000);
    if (trimmed) {
      const optimistic: Task = {
        id: tempId,
        title: trimmed,
        done: false,
        createdAt: new Date().toISOString(),
        due,
      };
      setTasks((prev) => [...prev, optimistic]);
    }
    setActionError(null);
    try {
      const body: { title: string; due?: string } = { title };
      if (due) body.due = due;
      const { data, trace } = await apiRequest<Task>("POST", "/api/tasks", body);
      pushTrace(setTraces, trace);
      setTasks((prev) => (trimmed ? prev.map((task) => (task.id === tempId ? data : task)) : [...prev, data]));
    } catch (err) {
      if (trimmed) setTasks((prev) => prev.filter((task) => task.id !== tempId));
      if (err instanceof ApiRequestError) pushTrace(setTraces, err.trace);
      setActionError(message(err));
      throw err;
    }
  }, []);

  const complete = useCallback(async (id: number) => {
    const snapshot = tasksRef.current;
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, done: true, doneAt: new Date().toISOString() } : task)),
    );
    setActionError(null);
    try {
      const { data, trace } = await apiRequest<Task>("PATCH", `/api/tasks/${id}/done`);
      pushTrace(setTraces, trace);
      setTasks((prev) => prev.map((task) => (task.id === id ? data : task)));
    } catch (err) {
      setTasks(snapshot);
      if (err instanceof ApiRequestError) pushTrace(setTraces, err.trace);
      setActionError(message(err));
      throw err;
    }
  }, []);

  const remove = useCallback(async (id: number) => {
    const snapshot = tasksRef.current;
    setTasks((prev) => prev.filter((task) => task.id !== id));
    setActionError(null);
    try {
      const { trace } = await apiRequest<null>("DELETE", `/api/tasks/${id}`);
      pushTrace(setTraces, trace);
    } catch (err) {
      setTasks(snapshot);
      if (err instanceof ApiRequestError) pushTrace(setTraces, err.trace);
      setActionError(message(err));
      throw err;
    }
  }, []);

  const ping = useCallback(async () => {
    setActionError(null);
    try {
      const { trace } = await apiRequest<{ ok: boolean }>("GET", "/api/health");
      pushTrace(setTraces, trace);
    } catch (err) {
      if (err instanceof ApiRequestError) pushTrace(setTraces, err.trace);
      setActionError(message(err));
    }
  }, []);

  return { tasks, loading, loadError, actionError, traces, add, complete, remove, refresh, ping };
}
