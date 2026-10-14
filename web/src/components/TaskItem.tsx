import { formatDue } from "../format";
import type { Task } from "../types";

type Props = {
  task: Task;
  overdue: boolean;
  onComplete: (id: number) => void;
  onDelete: (id: number) => void;
};

export function TaskItem({ task, overdue, onComplete, onDelete }: Props) {
  const pendingSave = task.id < 0;
  return (
    <li className="flex items-start gap-3 border-b border-line py-3 last:border-b-0">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4 accent-teal"
        checked={task.done}
        disabled={task.done || pendingSave}
        onChange={() => onComplete(task.id)}
        aria-label={task.done ? `${task.title} is done` : `Mark ${task.title} done`}
      />
      <div className="min-w-0 flex-1">
        <p className={task.done ? "text-muted line-through" : "font-medium text-ink"}>{task.title}</p>
        <p className="mt-0.5 font-mono text-xs text-muted">
          <span className="text-teal">{pendingSave ? "saving" : `#${task.id}`}</span>
          <span> · {task.due ? formatDue(task.due) : "No due date"}</span>
          {overdue ? <span className="text-clay"> · overdue</span> : null}
        </p>
      </div>
      <button
        type="button"
        className="shrink-0 text-sm font-semibold text-clay underline-offset-2 hover:underline disabled:opacity-40"
        onClick={() => onDelete(task.id)}
        disabled={pendingSave}
        aria-label={`Delete ${task.title}`}
      >
        Delete
      </button>
    </li>
  );
}
