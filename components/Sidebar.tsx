"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { TraceList } from "./TraceList";
import { BandToggleGroup } from "./BandToggleGroup";
import type { Trace, ImportResult } from "@/types/audio";
import { TUNING_TARGETS } from "@/lib/targets";

interface Props {
  traces: Trace[];
  enabledBands: Set<string>;
  lastResult: ImportResult | null;
  loading: boolean;
  onImport: (url: string, channelMode?: "separate" | "avg") => Promise<boolean>;
  onToggleTrace: (id: string) => void;
  onRemoveTrace: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onReorderTraces: (sourceIndex: number, destIndex: number) => void;
  onToggleBand: (id: string) => void;
  onClearAllBands: () => void;
  onClearCategory: (categoryId: string) => void;
  onHoverBand?: (id: string | null) => void;
  isInteractiveGraph: boolean;
  onToggleInteractiveGraph: () => void;
  selectedTarget: string;
  onSelectTarget: (id: string) => void;
  isCompensated: boolean;
  onToggleCompensated: () => void;
  onShareWorkspace: () => void;
  onExportImage: () => void;
  isCopied: boolean;
  isSharing?: boolean;
  isExportingImage?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  savedWorkspaces: Record<string, any>;
  onSaveWorkspace: (name: string) => void;
  onLoadWorkspace: (name: string) => void;
  onDeleteWorkspace: (name: string) => void;
  onToggleChannelMode?: (id: string) => void;
}

export function Sidebar({
  traces,
  enabledBands,
  loading,
  onImport,
  onToggleTrace,
  onRemoveTrace,
  onColorChange,
  onLabelChange,
  onNoteChange,
  onReorderTraces,
  onToggleBand,
  onClearAllBands,
  onClearCategory,
  onHoverBand,
  isInteractiveGraph,
  onToggleInteractiveGraph,
  selectedTarget,
  onSelectTarget,
  isCompensated,
  onToggleCompensated,
  onShareWorkspace,
  onExportImage,
  isCopied,
  isSharing,
  isExportingImage,
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  savedWorkspaces,
  onSaveWorkspace,
  onLoadWorkspace,
  onDeleteWorkspace,
  onToggleChannelMode,
}: Props) {
  const [ingestMode, setIngestMode] = useState<"search" | "url">("search");
  const [channelMode, setChannelMode] = useState<"separate" | "avg">("avg");
  const [url, setUrl] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

  const [openSections, setOpenSections] = useState({
    traces: true,
    targets: true,
    bands: false,
    workspaces: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleImport = useCallback(async () => {
    if (!url.trim() || loading || cooldown > 0) return;
    const urls = url.split(/[\n, ]+/).map((u) => u.trim()).filter(Boolean);
    let successCount = 0;
    for (const u of urls) {
      const ok = await onImport(u, channelMode);
      if (ok) successCount++;
    }
    if (successCount > 0) setUrl("");
    setCooldown(2);
  }, [url, loading, cooldown, onImport, channelMode]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleImport();
    }
  };

  const handleClearAllTraces = () => {
    traces.forEach((t) => onRemoveTrace(t.id));
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex flex-col h-full overflow-hidden transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      }`}
      style={{
        width: 310,
        minWidth: 310,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Brand & Action Bar Header */}
      <div className="flex items-center justify-between px-3.5 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]">
        <div className="flex items-center gap-2">
          <span className="text-indigo-400 font-bold text-lg leading-none">〰</span>
          <span className="font-bold text-sm tracking-tight text-[var(--text-primary)]">
            FreqRes
          </span>
        </div>

        {/* Header SVG Icon Actions */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onExportImage}
            disabled={isExportingImage || traces.length === 0}
            className="p-1.5 rounded-md bg-[var(--bg-raised)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors disabled:opacity-40"
            title="Export Graph Image (PNG)"
            aria-label="Export PNG"
          >
            {isExportingImage ? (
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
            )}
          </button>

          <button
            onClick={onShareWorkspace}
            disabled={isSharing}
            className="p-1.5 rounded-md bg-[var(--bg-raised)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors relative disabled:opacity-40"
            title="Share Workspace Link"
            aria-label="Share Workspace Link"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            {isCopied && (
              <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] whitespace-nowrap shadow-lg z-20 font-sans">
                Copied!
              </span>
            )}
          </button>

          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-md bg-[var(--bg-raised)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors"
            title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {theme === "dark" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            )}
          </button>

          <Link
            href="/tutorial"
            className="p-1.5 rounded-md bg-[var(--bg-raised)] border border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] transition-colors"
            title="Open Guide & Help"
            aria-label="Guide"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </Link>

          <button
            className="md:hidden text-[var(--text-muted)] hover:text-white ml-1 p-1"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      {/* Main Scrollable Control Panel */}
      <div className="flex flex-col gap-3.5 p-3 flex-1 overflow-y-auto custom-scrollbar">
        {/* Unified Smart Ingestion & Search Panel */}
        <section className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-[var(--text-primary)]">Import Measurements</span>
            <div className="flex bg-[var(--bg-surface)] p-0.5 rounded border border-[var(--border-subtle)]">
              <button
                onClick={() => setChannelMode("avg")}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                  channelMode === "avg"
                    ? "bg-indigo-600 text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                title="Import Left & Right channels merged into a single Average trace"
              >
                Avg
              </button>
              <button
                onClick={() => setChannelMode("separate")}
                className={`px-2 py-0.5 text-[10px] font-semibold rounded transition-colors ${
                  channelMode === "separate"
                    ? "bg-indigo-600 text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                title="Import Left and Right channels as individual curves"
              >
                L + R
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              className="w-full bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none focus:border-indigo-500 font-mono transition-all"
              placeholder="Search model or paste graph URL..."
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                setUrl(val);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (searchQuery.includes("http://") || searchQuery.includes("https://") || searchQuery.includes(".txt") || searchQuery.includes("share=")) {
                    handleImport();
                  }
                }
              }}
              disabled={loading || cooldown > 0}
            />

            {isSearching && (
              <p className="text-[10px] text-[var(--text-muted)] mt-1">Searching Squiglink database...</p>
            )}

            {searchResults.length > 0 && (
              <ul className="absolute z-20 top-[42px] left-0 w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <li key={result.id}>
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border-b border-[var(--border-subtle)] flex flex-col gap-0.5"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onImport(result.url, channelMode);
                        setSearchQuery("");
                        setUrl("");
                        setSearchResults([]);
                      }}
                    >
                      <span className="font-semibold block truncate">{result.name}</span>
                      <span className="text-[10px] text-[var(--text-muted)] block truncate font-mono">
                        {result.source}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {(searchQuery.includes("http://") || searchQuery.includes("https://") || searchQuery.includes(".txt") || searchQuery.includes("share=")) && (
            <button
              className="btn-primary w-full py-1.5 text-xs font-semibold"
              onClick={handleImport}
              disabled={loading || !url.trim() || cooldown > 0}
            >
              {loading ? "Importing..." : "Import URL"}
            </button>
          )}
        </section>

        {/* Traces Section */}
        <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] overflow-hidden">
          <div
            onClick={() => toggleSection("traces")}
            className="flex items-center justify-between px-3 py-2 cursor-pointer bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors select-none"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[var(--text-primary)]">
                Active Traces ({traces.length})
              </span>
            </div>
            <div className="flex items-center gap-2">
              {traces.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearAllTraces();
                  }}
                  className="text-[10px] font-semibold text-rose-400 hover:text-rose-300"
                >
                  Clear All
                </button>
              )}
              <span className={`transition-transform duration-200 ${openSections.traces ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </span>
            </div>
          </div>

          {openSections.traces && (
            <div className="p-2 border-t border-[var(--border-subtle)]">
              <TraceList
                traces={traces}
                onToggle={onToggleTrace}
                onRemove={onRemoveTrace}
                onColorChange={onColorChange}
                onLabelChange={onLabelChange}
                onNoteChange={onNoteChange}
                onReorder={onReorderTraces}
                onToggleChannelMode={onToggleChannelMode}
              />
            </div>
          )}
        </section>

        {/* Parameter Bands Section */}
        <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] overflow-hidden">
          <div
            onClick={() => toggleSection("bands")}
            className="flex items-center justify-between px-3 py-2 cursor-pointer bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors select-none"
          >
            <span className="text-xs font-bold text-[var(--text-primary)]">Parameter Bands</span>
            <span className={`transition-transform duration-200 ${openSections.bands ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </div>

          {openSections.bands && (
            <div className="p-3 border-t border-[var(--border-subtle)] flex flex-col gap-2">
              {enabledBands.size > 0 && (
                <div className="flex items-center justify-end">
                  <button
                    onClick={onClearAllBands}
                    className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    Clear All Bands
                  </button>
                </div>
              )}

              <BandToggleGroup
                enabled={enabledBands}
                onToggle={onToggleBand}
                onClearCategory={onClearCategory}
                onHover={onHoverBand}
                disabled={traces.length === 0}
              />
            </div>
          )}
        </section>

        {/* Saved Workspaces Section */}
        <section className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-base)] overflow-hidden">
          <div
            onClick={() => toggleSection("workspaces")}
            className="flex items-center justify-between px-3 py-2 cursor-pointer bg-[var(--bg-surface)] hover:bg-[var(--bg-hover)] transition-colors select-none"
          >
            <span className="text-xs font-bold text-[var(--text-primary)]">
              Saved Workspaces ({Object.keys(savedWorkspaces).length})
            </span>
            <span className={`transition-transform duration-200 ${openSections.workspaces ? "rotate-180" : ""}`} style={{ color: "var(--text-muted)" }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </span>
          </div>

          {openSections.workspaces && (
            <div className="p-3 border-t border-[var(--border-subtle)] flex flex-col gap-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Workspace name..."
                  className="flex-1 bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2.5 py-1 text-xs text-[var(--text-primary)] outline-none focus:border-indigo-500"
                />
                <button
                  onClick={() => {
                    if (newWorkspaceName.trim()) {
                      onSaveWorkspace(newWorkspaceName.trim());
                      setNewWorkspaceName("");
                    }
                  }}
                  className="btn-primary px-3 py-1 text-xs font-semibold shrink-0"
                >
                  Save
                </button>
              </div>

              <div className="flex flex-col gap-1 max-h-32 overflow-y-auto custom-scrollbar mt-1">
                {Object.keys(savedWorkspaces).length === 0 ? (
                  <p className="text-[11px] text-[var(--text-muted)] py-1">No saved workspaces yet.</p>
                ) : (
                  Object.keys(savedWorkspaces).map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2.5 py-1 text-xs"
                    >
                      <button
                        className="font-medium text-[var(--text-primary)] hover:text-indigo-400 truncate flex-1 text-left"
                        onClick={() => onLoadWorkspace(name)}
                      >
                        {name}
                      </button>
                      <button
                        className="text-[11px] text-rose-400 hover:text-rose-300 ml-2"
                        onClick={() => onDeleteWorkspace(name)}
                        aria-label={`Delete workspace ${name}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Clean Footer Bar */}
      <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-base)] flex items-center justify-between text-[11px] text-[var(--text-muted)]">
        <Link href="/tutorial" className="hover:text-[var(--text-primary)] transition-colors">
          Guide
        </Link>
        <span>•</span>
        <Link href="/legal" className="hover:text-[var(--text-primary)] transition-colors">
          Legal
        </Link>
        <span>•</span>
        <a
          href="https://github.com/jaermaine/freqres-visualizer-dashboard/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          Feedback
        </a>
      </div>
    </aside>
  );
}
