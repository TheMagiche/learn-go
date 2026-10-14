import type { ReactNode } from "react";
import type { Concept } from "../learn/concepts";

type Props = {
  concept: Concept;
  active: boolean;
  footer?: ReactNode;
};

export function ConceptCard({ concept, active, footer }: Props) {
  return (
    <article
      id={`concept-${concept.id}`}
      className={
        active
          ? "scroll-mt-24 rounded-xl border border-teal bg-teal-ink p-4"
          : "scroll-mt-24 rounded-xl border border-line bg-panel p-4"
      }
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="font-serif text-xl text-ink">{concept.title}</h3>
        <p className="font-mono text-xs text-teal">{concept.id}</p>
      </div>
      <p className="mt-2 text-sm font-semibold text-ink">{concept.summary}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{concept.explanation}</p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-code p-3 font-mono text-xs leading-5 text-ink">
        <code>{concept.example}</code>
      </pre>
      <ul className="mt-3 flex flex-wrap gap-3 text-sm">
        {concept.links.map((link) => (
          <li key={link.href}>
            <a className="font-semibold text-teal underline-offset-2 hover:underline" href={link.href}>
              {link.label}
            </a>
          </li>
        ))}
      </ul>
      {footer ? <div className="mt-3 border-t border-line pt-3 text-sm text-muted">{footer}</div> : null}
    </article>
  );
}
