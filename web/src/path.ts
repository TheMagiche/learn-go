// Logical routes stay "/", "/lessons", and "/glossary". GitHub Pages serves
// the app under /<repo>/, so the address bar includes that prefix.

export function withBase(path: string, base = import.meta.env.BASE_URL): string {
  const prefix = basePrefix(base);
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (!prefix) return normalized;
  if (normalized === "/") return `${prefix}/`;
  return `${prefix}${normalized}`;
}

export function appPath(pathname = window.location.pathname, base = import.meta.env.BASE_URL): string {
  const prefix = basePrefix(base);
  let path = pathname || "/";
  if (prefix && (path === prefix || path.startsWith(`${prefix}/`))) {
    path = path.slice(prefix.length) || "/";
  }
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

function basePrefix(base: string): string {
  if (!base || base === "/" || base === "./") return "";
  return base.endsWith("/") ? base.slice(0, -1) : base;
}
