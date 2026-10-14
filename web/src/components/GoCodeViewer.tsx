import { Highlight, themes } from "prism-react-renderer";
import { goSources } from "../learn/goSources";
import { relatedMethods } from "../learn/related";

type Props = {
  handler: string;
  dark: boolean;
  activeConcept: string | null;
  onConcept: (id: string) => void;
};

export function GoCodeViewer({ handler, dark, activeConcept, onConcept }: Props) {
  const names = [handler, ...(relatedMethods[handler] ?? [])].filter((name, index, all) => all.indexOf(name) === index);
  return (
    <div className="grid min-w-0 gap-4">
      <p className="text-sm text-muted">
        Highlighted lines are <span className="font-mono">LEARN</span> comments. Click one to open its card.
        {activeConcept ? <span className="text-teal"> Showing {activeConcept}.</span> : null}
      </p>
      {names.map((name) => (
        <Snippet key={name} name={name} dark={dark} onConcept={onConcept} />
      ))}
    </div>
  );
}

function Snippet({ name, dark, onConcept }: { name: string; dark: boolean; onConcept: (id: string) => void }) {
  const source = goSources[name];
  if (!source) {
    return (
      <p className="rounded-lg border border-line p-3 text-sm text-muted">
        No snippet for <span className="font-mono">{name}</span>. Run <span className="font-mono">make gen</span>.
      </p>
    );
  }
  return (
    <figure className="m-0 min-w-0 max-w-full">
      <figcaption className="mb-1 truncate font-mono text-xs text-muted">
        {source.file}:{source.startLine} · {name}
      </figcaption>
      <Highlight theme={dark ? themes.vsDark : themes.github} code={source.code} language="go">
        {({ style, tokens, getLineProps, getTokenProps }) => (
          <pre
            style={{ ...style, margin: 0 }}
            className="min-w-0 max-w-full overflow-x-auto rounded-lg border border-line p-2 text-[12.5px] leading-5"
          >
            {tokens.map((line, index) => {
              const text = line.map((token) => token.content).join("");
              const learn = /LEARN\(([a-z0-9-]+)\)/.exec(text);
              const lineProps = getLineProps({ line });
              return (
                <div
                  key={`${source.startLine + index}`}
                  {...lineProps}
                  className={`${lineProps.className ?? ""} grid w-fit min-w-full grid-cols-[2.75rem_minmax(0,1fr)] ${learn ? "cursor-pointer bg-teal-ink" : ""}`}
                  onClick={learn ? () => onConcept(learn[1]) : undefined}
                  onKeyDown={
                    learn
                      ? (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onConcept(learn[1]);
                          }
                        }
                      : undefined
                  }
                  role={learn ? "button" : undefined}
                  tabIndex={learn ? 0 : undefined}
                >
                  <span className="pr-3 text-right text-muted select-none">{source.startLine + index}</span>
                  <span className="whitespace-pre">
                    {line.map((token, key) => (
                      <span key={key} {...getTokenProps({ token })} />
                    ))}
                  </span>
                </div>
              );
            })}
          </pre>
        )}
      </Highlight>
    </figure>
  );
}
