import { useState } from "react";
import { cliCommand, curlCommand } from "../api/client";
import { prettyJSON } from "../format";
import type { Trace } from "../types";

type Props = { trace: Trace };

export function RequestInspector({ trace }: Props) {
  const curl = curlCommand(trace);
  const cli = cliCommand(trace);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 font-mono text-xs font-semibold ${methodClass(trace.method)}`}>
          {trace.method}
        </span>
        <code className="min-w-0 break-all font-mono text-sm">{trace.url}</code>
        <span className={`font-mono text-sm font-semibold ${statusClass(trace.status)}`}>{trace.status}</span>
        <span className="font-mono text-xs text-muted">{trace.durationMs} ms</span>
      </div>
      <Body label="Request" text={trace.requestBody ? prettyJSON(trace.requestBody) : "No body"} />
      <Body label="Response" text={trace.responseBody ? prettyJSON(trace.responseBody) : "No body"} />
      <CopyBlock label="curl" text={curl} />
      <CopyBlock label="CLI" text={cli} />
    </div>
  );
}

function Body({ label, text }: { label: string; text: string }) {
  return (
    <div>
      <h3 className="mb-1 font-mono text-xs tracking-wide text-muted uppercase">{label}</h3>
      <pre className="overflow-x-auto rounded-lg bg-code p-3 font-mono text-xs leading-5">{text}</pre>
    </div>
  );
}

function CopyBlock({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="font-mono text-xs tracking-wide text-muted uppercase">{label}</h3>
        <button
          type="button"
          className="text-xs font-semibold text-teal"
          onClick={() => {
            void copyText(text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-code p-3 font-mono text-xs leading-5">{text}</pre>
    </div>
  );
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
}

function methodClass(method: string): string {
  switch (method) {
    case "GET":
      return "bg-teal-ink text-teal";
    case "POST":
      return "bg-teal-ink text-good";
    case "PATCH":
      return "bg-teal-ink text-warn";
    case "DELETE":
      return "bg-teal-ink text-clay";
    default:
      return "bg-code text-ink";
  }
}

function statusClass(status: number): string {
  if (status >= 500) return "text-bad";
  if (status >= 400) return "text-clay";
  return "text-good";
}
