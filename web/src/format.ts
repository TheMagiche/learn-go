import type { Task } from "./types";

export function formatDue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isOverdue(task: Pick<Task, "done" | "due">, now = Date.now()): boolean {
  if (task.done || !task.due) return false;
  const due = new Date(task.due).getTime();
  return !Number.isNaN(due) && due < now;
}

export function prettyJSON(text: string | undefined): string {
  if (!text) return "";
  try {
    return JSON.stringify(JSON.parse(text), null, 2);
  } catch {
    return text;
  }
}
