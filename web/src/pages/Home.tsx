import { useState } from "react";
import { AddTaskForm } from "../components/AddTaskForm";
import { Filters, type Filter } from "../components/Filters";
import { LearnPanel } from "../components/LearnPanel";
import { TaskList } from "../components/TaskList";
import { isOverdue } from "../format";
import { useTasks } from "../hooks/useTasks";

const emptyCopy: Record<Filter, string> = {
  pending: "Nothing pending. Add a task and the panel will show the POST and the Go that stored it.",
  all: "The list is empty. The JSON file stays empty until the first save succeeds.",
  overdue: "Nothing is past its due date.",
};

type Props = { dark: boolean };

export function Home({ dark }: Props) {
  const { tasks, loading, loadError, actionError, traces, add, complete, remove, refresh, ping } = useTasks();
  const [filter, setFilter] = useState<Filter>("pending");
  const [open, setOpen] = useState(() => window.matchMedia("(min-width: 1024px)").matches);

  const visible = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "overdue") return isOverdue(task);
    return !task.done;
  });
  const counts: Record<Filter, number> = {
    pending: tasks.filter((task) => !task.done).length,
    all: tasks.length,
    overdue: tasks.filter((task) => isOverdue(task)).length,
  };
  const latest = traces[0];
  const showGoLabel = `${latest ? `${latest.method} ${latest.status}` : "Learn"} · Show the Go`;

  return (
    <>
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,28rem)] lg:px-6">
      <section className="min-w-0">
        <p className="font-mono text-xs tracking-wide text-teal uppercase">App</p>
        <h1 className="mt-1 font-serif text-4xl text-ink">Today’s list</h1>
        <p className="mt-2 max-w-xl text-muted">
          The checkbox, the delete button, and the form each call the Go API. The same JSON file is what the{" "}
          <span className="font-mono text-sm">todo</span> command reads.
        </p>
        <div className="mt-6 rounded-2xl border border-line bg-panel p-4">
          <AddTaskForm onAdd={add} error={actionError} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Filters value={filter} counts={counts} onChange={setFilter} />
          <button type="button" onClick={() => void ping()} className="text-sm font-semibold text-teal">
            Check health
          </button>
        </div>
        {loadError ? (
          <div className="mt-4 rounded-xl border border-bad/40 bg-panel p-4" role="alert">
            <p className="text-sm text-bad">{loadError}</p>
            <button type="button" onClick={() => void refresh()} className="mt-2 text-sm font-semibold text-teal">
              Try again
            </button>
          </div>
        ) : null}
        <div className="mt-2">
          {loading && tasks.length === 0 ? (
            <p className="py-8 text-center text-muted">Loading tasks…</p>
          ) : (
            <TaskList
              tasks={visible}
              empty={emptyCopy[filter]}
              onComplete={(id) => void complete(id).catch(() => undefined)}
              onDelete={(id) => void remove(id).catch(() => undefined)}
            />
          )}
        </div>
      </section>
      {open ? (
        <div className="fixed inset-0 z-20 overflow-auto bg-paper p-4 lg:static lg:z-auto lg:overflow-visible lg:bg-transparent lg:p-0">
          <div className="rounded-2xl border border-line bg-panel p-4 lg:sticky lg:top-4">
            <LearnPanel traces={traces} dark={dark} onClose={() => setOpen(false)} />
          </div>
        </div>
      ) : (
        <div className="hidden self-start lg:block">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-full bg-teal px-4 py-2 text-sm font-semibold text-paper"
          >
            {showGoLabel}
          </button>
        </div>
      )}
    </div>
    {!open ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed right-4 bottom-4 z-10 w-auto rounded-full bg-teal px-4 py-2 text-sm font-semibold text-paper shadow-lg lg:hidden"
      >
        {showGoLabel}
      </button>
    ) : null}
    </>
  );
}
