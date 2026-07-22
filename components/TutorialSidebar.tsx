import Link from "next/link";

export function TutorialSidebar() {
  const sections = [
    { id: "url-checker", label: "URL Checker" },
    { id: "features-overview", label: "Features Overview" },
    { id: "url-patterns", label: "URL Patterns & Ingestion" },
    { id: "managing-traces", label: "Trace Controls & Shortcuts" },
    { id: "parse-failures", label: "Troubleshooting" },
    { id: "feedback", label: "Feedback & Issues" },
  ];

  return (
    <nav className="md:w-48 flex-shrink-0 flex md:flex-col md:pt-2 border-b md:border-b-0 md:border-r border-[var(--border-subtle)] bg-[var(--bg-surface)] md:bg-transparent overflow-x-auto md:overflow-visible custom-scrollbar">
      <div className="flex md:flex-col min-w-max md:min-w-0">
        <div className="px-4 py-3 md:pb-3 flex items-center">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs hover:underline"
            style={{ color: "var(--text-muted)" }}
          >
            ← Dashboard
          </Link>
        </div>
        <p className="hidden md:block label-xs px-4 mb-1">On this page</p>
        <div className="flex md:flex-col flex-1">
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="block px-4 py-3 md:py-1.5 text-xs rounded-none hover:bg-slate-800/40 transition-colors whitespace-nowrap"
              style={{ color: "var(--text-secondary)" }}
            >
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
