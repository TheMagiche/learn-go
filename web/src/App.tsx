import { useEffect, useState } from "react";
import { Glossary } from "./pages/Glossary";
import { Home } from "./pages/Home";
import { Lessons } from "./pages/Lessons";

const links = [
  { href: "/", label: "App" },
  { href: "/lessons", label: "Lessons" },
  { href: "/glossary", label: "Glossary" },
];

export function App() {
  const { path, go } = usePath();
  const [dark, setDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    const titles: Record<string, string> = {
      "/": "todo — learn Go by clicking",
      "/lessons": "Lessons — todo",
      "/glossary": "Glossary — todo",
    };
    document.title = titles[path] ?? "todo";
  }, [path]);

  function toggleTheme() {
    setDark((prev) => {
      const next = !prev;
      document.documentElement.classList.toggle("dark", next);
      localStorage.setItem("todo-theme", next ? "dark" : "light");
      return next;
    });
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-4 px-4 py-3 lg:px-6">
          <a
            href="/"
            onClick={(event) => {
              event.preventDefault();
              go("/");
            }}
            className="mr-auto"
          >
            <span className="font-serif text-2xl leading-none">todo</span>
            <span className="mt-0.5 block text-xs text-muted">learn Go by clicking</span>
          </a>
          <nav aria-label="Primary" className="flex gap-1">
            {links.map((link) => {
              const current = path === link.href;
              return (
                <a
                  key={link.href}
                  href={link.href}
                  aria-current={current ? "page" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    go(link.href);
                  }}
                  className={
                    current
                      ? "rounded-full bg-teal-ink px-3 py-1 text-sm font-semibold text-teal"
                      : "rounded-full px-3 py-1 text-sm font-semibold text-muted hover:text-ink"
                  }
                >
                  {link.label}
                </a>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={toggleTheme}
            aria-pressed={dark}
            className="rounded-full border border-line px-3 py-1 text-sm font-semibold"
          >
            {dark ? "Light" : "Dark"}
          </button>
        </div>
      </header>
      <main>{pageFor(path, dark)}</main>
    </div>
  );
}

function pageFor(path: string, dark: boolean) {
  if (path === "/" || path === "/index.html") return <Home dark={dark} />;
  if (path === "/lessons") return <Lessons />;
  if (path === "/glossary") return <Glossary />;
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <h1 className="font-serif text-3xl">That page is not in this app</h1>
      <p className="mt-2 text-muted">The Go server falls back to this screen for unknown paths so the client router can answer.</p>
    </div>
  );
}

function usePath() {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const go = (to: string) => {
    if (window.location.pathname !== to) window.history.pushState({}, "", to);
    setPath(to);
  };
  return { path, go };
}
