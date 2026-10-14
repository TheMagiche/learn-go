import { goSources, handlerConcepts } from "./goSources";

export function ownersOf(id: string): string[] {
  const found = new Set<string>();
  for (const [name, source] of Object.entries(goSources)) {
    if (source.code.includes(`LEARN(${id})`)) found.add(name);
  }
  for (const [handler, ids] of Object.entries(handlerConcepts)) {
    if (ids.includes(id)) found.add(handler);
  }
  return [...found].sort((a, b) => a.localeCompare(b));
}

export function learnIDsIn(code: string): string[] {
  return [...code.matchAll(/LEARN\(([a-z0-9-]+)\)/g)].map((match) => match[1]);
}
