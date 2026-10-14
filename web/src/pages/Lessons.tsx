import { useEffect, useState } from "react";
import { lessons } from "../learn/lessons";

const storageKey = "todo-lessons-done";

function readDone(): string[] {
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

export function Lessons() {
  const [done, setDone] = useState<string[]>(readDone);
  const [current, setCurrent] = useState(lessons[0].id);
  const lesson = lessons.find((item) => item.id === current) ?? lessons[0];

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(done));
  }, [done]);

  function toggle(id: string) {
    setDone((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 lg:grid-cols-[16rem_minmax(0,1fr)] lg:px-6">
      <div>
        <p className="font-mono text-xs tracking-wide text-teal uppercase">Lessons</p>
        <h1 className="mt-1 font-serif text-4xl">Eight passes through the code</h1>
        <p className="mt-2 text-sm text-muted">
          {done.length} of {lessons.length} marked done. Progress stays in this browser.
        </p>
        <ol className="mt-4 grid gap-1">
          {lessons.map((item) => {
            const selected = item.id === lesson.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setCurrent(item.id)}
                  className={
                    selected
                      ? "flex w-full items-baseline gap-2 rounded-lg bg-teal-ink px-2 py-1.5 text-left"
                      : "flex w-full items-baseline gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-code"
                  }
                  aria-current={selected ? "true" : undefined}
                >
                  <span className="font-mono text-xs text-teal">{item.number}</span>
                  <span className="text-sm font-semibold">{item.title}</span>
                  {done.includes(item.id) ? <span className="ml-auto text-xs text-good">Done</span> : null}
                </button>
              </li>
            );
          })}
        </ol>
        <button type="button" onClick={() => setDone([])} className="mt-3 text-sm text-muted underline-offset-2 hover:underline">
          Reset progress
        </button>
      </div>
      <article className="rounded-2xl border border-line bg-panel p-5">
        <p className="font-mono text-xs text-teal">Lesson {lesson.number}</p>
        <h2 className="mt-1 font-serif text-3xl">{lesson.title}</h2>
        <dl className="mt-5 grid gap-4">
          <Item term="Goal" text={lesson.goal} />
          <Item term="What to click" text={lesson.click} />
          <Item term="File to open" text={lesson.file} />
          <Item term="Exercise" text={lesson.exercise} />
          <Item term="Hint" text={lesson.hint} />
          <Item term="Check" text={lesson.check} />
        </dl>
        <button
          type="button"
          onClick={() => toggle(lesson.id)}
          className="mt-6 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-paper"
          aria-pressed={done.includes(lesson.id)}
        >
          {done.includes(lesson.id) ? "Mark as not done" : "Mark lesson done"}
        </button>
      </article>
    </div>
  );
}

function Item({ term, text }: { term: string; text: string }) {
  return (
    <div>
      <dt className="font-mono text-xs tracking-wide text-muted uppercase">{term}</dt>
      <dd className="mt-1 leading-6">{text}</dd>
    </div>
  );
}
