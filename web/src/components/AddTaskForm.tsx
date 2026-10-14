import { useState, type FormEvent } from "react";

type Props = {
  onAdd: (title: string, due?: string) => Promise<void>;
  error: string | null;
};

export function AddTaskForm({ onAdd, error }: Props) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      await onAdd(title, due ? endOfLocalDay(due) : undefined);
      setTitle("");
      setDue("");
    } catch {
      // The parent shows actionError. Keep the fields so a 400 is easy to retry.
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_11rem_auto] sm:items-end">
      <label className="grid gap-1 text-sm font-semibold">
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Buy milk"
          className="rounded-lg border border-line bg-panel px-3 py-2 font-normal text-ink"
          aria-describedby={error ? "add-error" : undefined}
        />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Due
        <input
          type="date"
          value={due}
          onChange={(event) => setDue(event.target.value)}
          className="rounded-lg border border-line bg-panel px-3 py-2 font-normal text-ink"
        />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg bg-teal px-4 py-2 font-semibold text-paper disabled:opacity-60"
      >
        {pending ? "Saving…" : "Add task"}
      </button>
      {error ? (
        <p id="add-error" className="sm:col-span-3 text-sm text-bad" role="alert">
          {error}
        </p>
      ) : (
        <p className="sm:col-span-3 text-sm text-muted">
          An empty title is allowed here on purpose. The Go handler answers 400, and the panel shows that error.
        </p>
      )}
    </form>
  );
}

function endOfLocalDay(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return date;
  return new Date(year, month - 1, day, 23, 59, 59).toISOString();
}
