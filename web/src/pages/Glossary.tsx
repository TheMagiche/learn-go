import { useMemo, useState } from "react";
import { ConceptCard } from "../components/ConceptCard";
import { concepts } from "../learn/concepts";
import { ownersOf } from "../learn/usage";

export function Glossary() {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = useMemo(
    () =>
      concepts.filter((concept) => {
        if (!needle) return true;
        return (
          concept.id.includes(needle) ||
          concept.title.toLowerCase().includes(needle) ||
          concept.summary.toLowerCase().includes(needle) ||
          concept.explanation.toLowerCase().includes(needle)
        );
      }),
    [needle],
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 lg:px-6">
      <p className="font-mono text-xs tracking-wide text-teal uppercase">Glossary</p>
      <h1 className="mt-1 font-serif text-4xl">Go, in the order you meet it</h1>
      <p className="mt-2 text-muted">
        Every id here is used by a <span className="font-mono text-sm">LEARN</span> comment or an{" "}
        <span className="font-mono text-sm">X-Go-Concepts</span> header. Search is local. Nothing is sent anywhere.
      </p>
      <label className="mt-5 grid gap-1 text-sm font-semibold">
        Search concepts
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="mutex, slices, embed"
          className="rounded-lg border border-line bg-panel px-3 py-2 font-normal"
        />
      </label>
      <p className="mt-3 text-sm text-muted">
        {shown.length} of {concepts.length}
      </p>
      <div className="mt-4 grid gap-4">
        {shown.length === 0 ? <p className="text-muted">No concept matches that search.</p> : null}
        {shown.map((concept) => {
          const owners = ownersOf(concept.id);
          return (
            <ConceptCard
              key={concept.id}
              concept={concept}
              active={false}
              footer={
                owners.length > 0 ? (
                  <p>
                    Seen in <span className="font-mono text-xs text-ink">{owners.join(", ")}</span>
                  </p>
                ) : (
                  <p>Run make gen to attach this concept to the functions that teach it.</p>
                )
              }
            />
          );
        })}
      </div>
    </div>
  );
}
