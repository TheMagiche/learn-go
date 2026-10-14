import { useEffect, useState } from "react";
import { conceptById } from "../learn/concepts";
import { goSources } from "../learn/goSources";
import { relatedMethods } from "../learn/related";
import { learnIDsIn } from "../learn/usage";
import type { Trace } from "../types";
import { ConceptCard } from "./ConceptCard";
import { GoCodeViewer } from "./GoCodeViewer";
import { RequestInspector } from "./RequestInspector";

type Props = {
  traces: Trace[];
  dark: boolean;
  onClose: () => void;
};

export function LearnPanel({ traces, dark, onClose }: Props) {
  const newest = traces[0]?.id ?? null;
  const [selectedId, setSelectedId] = useState<string | null>(newest);
  const [activeConcept, setActiveConcept] = useState<string | null>(null);

  useEffect(() => {
    setSelectedId(newest);
    setActiveConcept(null);
  }, [newest]);

  const selected = traces.find((trace) => trace.id === selectedId) ?? traces[0] ?? null;
  const conceptIDs = selected ? conceptsFor(selected) : [];

  return (
    <aside className="grid min-w-0 gap-5" aria-label="Go behind this click">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs tracking-wide text-teal uppercase">Learn</p>
          <h2 className="font-serif text-2xl">The Go behind that click</h2>
        </div>
        <button type="button" onClick={onClose} className="text-sm font-semibold text-muted hover:text-ink">
          Hide
        </button>
      </div>
      {selected ? (
        <>
          <RequestInspector trace={selected} />
          <GoCodeViewer
            handler={selected.handler}
            dark={dark}
            activeConcept={activeConcept}
            onConcept={(id) => {
              setActiveConcept(id);
              document.getElementById(`concept-${id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
            }}
          />
          <div className="grid min-w-0 gap-3">
            {conceptIDs.map((id) => {
              const concept = conceptById[id];
              if (!concept) return null;
              return <ConceptCard key={id} concept={concept} active={id === activeConcept} />;
            })}
          </div>
        </>
      ) : (
        <p className="text-sm leading-6 text-muted">
          The list request has not finished. When it does, this panel shows the HTTP exchange and the Go function that
          handled it.
        </p>
      )}
      <div className="min-w-0">
        <h3 className="mb-2 font-mono text-xs tracking-wide text-muted uppercase">Earlier requests</h3>
        {traces.length === 0 ? (
          <p className="text-sm text-muted">No requests yet.</p>
        ) : (
          <ul className="grid gap-1">
            {traces.map((trace) => {
              const current = trace.id === selected?.id;
              return (
                <li key={trace.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setSelectedId(trace.id)}
                    className={
                      current
                        ? "flex w-full items-center justify-between gap-2 rounded-lg bg-teal-ink px-2 py-1.5 text-left font-mono text-xs text-ink"
                        : "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left font-mono text-xs text-muted hover:bg-code"
                    }
                  >
                    <span className="truncate">
                      {trace.method} {trace.url}
                    </span>
                    <span className="shrink-0">{trace.status}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function conceptsFor(trace: Trace): string[] {
  const ordered = [...trace.concepts];
  const seen = new Set(ordered);
  const names = [trace.handler, ...(relatedMethods[trace.handler] ?? [])];
  for (const name of names) {
    const code = goSources[name]?.code ?? "";
    for (const id of learnIDsIn(code)) {
      if (!seen.has(id)) {
        seen.add(id);
        ordered.push(id);
      }
    }
  }
  return ordered.filter((id) => conceptById[id]);
}
