"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { TraceList } from "./TraceList";
import { BandToggleGroup } from "./BandToggleGroup";
import type { Trace } from "@/types/audio";

interface Props {
  traces: Trace[];
  enabledBands: Set<string>;
  loading: boolean;
  onImport: (url: string, channelMode?: "separate" | "avg") => Promise<boolean>;
  onToggleTrace: (id: string) => void;
  onToggleAllTraces?: () => void;
  onRemoveTrace: (id: string) => void;
  onClearAllTraces?: () => void;
  onColorChange: (id: string, color: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onReorderTraces: (sourceIndex: number, destIndex: number) => void;
  onToggleBand: (id: string) => void;
  onClearAllBands: () => void;
  onClearCategory: (categoryId: string) => void;
  onHoverBand?: (id: string | null) => void;
  onShareWorkspace: () => void;
  onExportImage: () => void;
  isCopied: boolean;
  isSharing?: boolean;
  isExportingImage?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
  savedWorkspaces: Record<string, any>;
  onSaveWorkspace: (name: string) => void;
  onLoadWorkspace: (name: string) => void;
  onDeleteWorkspace: (name: string) => void;
  onToggleChannelMode?: (id: string) => void;
  onOpenQuickStart?: () => void;
}

export const Sidebar = React.memo(function Sidebar({
  traces,
  enabledBands,
  loading,
  onImport,
  onToggleTrace,
  onToggleAllTraces,
  onRemoveTrace,
  onClearAllTraces,
  onColorChange,
  onLabelChange,
  onNoteChange,
  onReorderTraces,
  onToggleBand,
  onClearAllBands,
  onClearCategory,
  onHoverBand,
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
  onOpenQuickStart,
}: Props) {
  const [channelMode, setChannelMode] = useState<"separate" | "avg">("avg");
  const [url, setUrl] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [activeResultIndex, setActiveResultIndex] = useState<number>(-1);
  const [isSearching, setIsSearching] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const [openSections, setOpenSections] = useState({
    traces: true,
    bands: false,
    workspaces: false,
  });

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSearchResults([]);
        setActiveResultIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setActiveResultIndex(-1);
      return;
    }
    if (
      searchQuery.includes("http://") ||
      searchQuery.includes("https://") ||
      searchQuery.includes("share=")
    ) {
      setSearchResults([]);
      setActiveResultIndex(-1);
      return;
    }

    const controller = new AbortController();
    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        const items = Array.isArray(data) ? data : [];
        setSearchResults(items);
        setActiveResultIndex(items.length > 0 ? 0 : -1);
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          console.error(err);
        }
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => {
      clearTimeout(delayDebounceFn);
      controller.abort();
    };
  }, [searchQuery]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleImport = useCallback(async () => {
    if (!url.trim() || loading || cooldown > 0) return;
    const urls = url
      .split(/[\n, ]+/)
      .map((u) => u.trim())
      .filter(Boolean);
    const results = await Promise.all(urls.map((u) => onImport(u, channelMode)));
    if (results.some(Boolean)) {
      setUrl("");
      setSearchQuery("");
      setSearchResults([]);
      setActiveResultIndex(-1);
    }
    setCooldown(2);
  }, [url, loading, cooldown, onImport, channelMode]);

  const handleSelectSearchResult = useCallback(
    (result: any) => {
      onImport(result.url, channelMode);
      setSearchQuery("");
      setUrl("");
      setSearchResults([]);
      setActiveResultIndex(-1);
    },
    [onImport, channelMode]
  );

  const handleClearAll = () => {
    if (onClearAllTraces) {
      onClearAllTraces();
    } else {
      traces.forEach((t) => onRemoveTrace(t.id));
    }
  };

  const handleToggleAll = () => {
    if (onToggleAllTraces) {
      onToggleAllTraces();
    } else {
      const allVisible = traces.every((t) => t.visible);
      traces.forEach((t) => {
        if (allVisible && t.visible) onToggleTrace(t.id);
        else if (!allVisible && !t.visible) onToggleTrace(t.id);
      });
    }
  };

  const isUrlInput =
    searchQuery.includes("http://") ||
    searchQuery.includes("https://") ||
    searchQuery.includes(".txt") ||
    searchQuery.includes(".csv") ||
    searchQuery.includes(".tsv") ||
    searchQuery.includes("share=");

  const workspaceNames = Object.keys(savedWorkspaces);

  return (
    <aside
      aria-label="Measurement Control Rack"
      className={`fixed inset-y-0 left-0 z-50 flex flex-col h-full overflow-hidden transform transition-transform duration-200 ease-out md:relative md:translate-x-0 ${
        isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      }`}
      style={{
        width: 320,
        minWidth: 320,
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-subtle)",
      }}
    >
      {/* Instrument Rack Top Bar */}
      <div className="h-12 flex items-center justify-between px-3.5 border-b border-[var(--border-subtle)] bg-[var(--bg-base)] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[var(--bg-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--accent-text)]">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M2 13.5C4.5 13.5 5.5 6 8.2 6C11 6 12.2 18 15 18C17.5 18 18.8 10.5 22 10.5" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-semibold text-sm tracking-tight text-[var(--text-primary)]">
              FreqRes
            </span>
            <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--text-muted)]">
              SPL Lab
            </span>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onExportImage}
            disabled={isExportingImage || traces.length === 0}
            className="inline-flex items-center justify-center w-8 h-8 rounded bg-[var(--bg-raised)] border border-[var(--border)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-glow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="PNG Export Studio"
            aria-label="Open PNG Export Studio"
          >
            {isExportingImage ? (
              <svg
                className="animate-spin"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
          </button>

          <button
            type="button"
            onClick={onShareWorkspace}
            disabled={isSharing || traces.length === 0}
            className="inline-flex items-center justify-center w-8 h-8 rounded bg-[var(--bg-raised)] border border-[var(--border)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-glow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors relative disabled:opacity-40 disabled:cursor-not-allowed"
            title="Share Workspace Shortlink (Ctrl+S)"
            aria-label="Share Workspace Link"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="18" cy="5" r="3" />
              <circle cx="6" cy="12" r="3" />
              <circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
            {isCopied && (
              <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-white px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap shadow-lg z-30">
                Copied
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={onToggleTheme}
            className="inline-flex items-center justify-center w-8 h-8 rounded bg-[var(--bg-raised)] border border-[var(--border)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-glow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title={theme === "dark" ? "Switch to Paper-Stone Light Mode" : "Switch to Carbon Dark Mode"}
            aria-label={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {theme === "dark" ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>

          <Link
            href="/tutorial"
            className="inline-flex items-center justify-center w-8 h-8 rounded bg-[var(--bg-raised)] border border-[var(--border)] hover:bg-[var(--bg-hover)] hover:border-[var(--border-glow)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Documentation & URL Compatibility Guide"
            aria-label="Open Guide and Documentation"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </Link>

          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center w-8 h-8 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] ml-0.5"
            onClick={onClose}
            aria-label="Close sidebar drawer"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Scrollable Control Rack */}
      <div className="flex flex-col gap-3 p-3 flex-1 overflow-y-auto custom-scrollbar">
        {/* Ingestion & Database Search Module */}
        <section
          aria-label="Import Measurements"
          className="p-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] flex flex-col gap-2.5"
        >
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="measurement-search-input" className="text-xs font-semibold text-[var(--text-primary)]">
              Import Measurement
            </label>
            <div
              role="group"
              aria-label="Default channel import mode"
              className="flex bg-[var(--bg-surface)] p-0.5 rounded border border-[var(--border-subtle)]"
            >
              <button
                type="button"
                onClick={() => setChannelMode("avg")}
                aria-pressed={channelMode === "avg"}
                className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-sm transition-colors ${
                  channelMode === "avg"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                title="Import Left & Right channels merged into a single Average trace"
              >
                Avg
              </button>
              <button
                type="button"
                onClick={() => setChannelMode("separate")}
                aria-pressed={channelMode === "separate"}
                className={`px-2 py-0.5 text-[10px] font-mono font-semibold rounded-sm transition-colors ${
                  channelMode === "separate"
                    ? "bg-[var(--accent)] text-white"
                    : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                }`}
                title="Import Left and Right channels as separate L and R curves"
              >
                L + R
              </button>
            </div>
          </div>

          <div className="relative" ref={searchContainerRef}>
            <input
              id="measurement-search-input"
              type="text"
              role="combobox"
              aria-expanded={searchResults.length > 0}
              aria-controls="squig-search-listbox"
              aria-autocomplete="list"
              aria-activedescendant={
                activeResultIndex >= 0 && searchResults[activeResultIndex]
                  ? `search-opt-${searchResults[activeResultIndex].id}`
                  : undefined
              }
              className="input-field"
              placeholder="Search IEM or paste Squig / .txt URL..."
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                setUrl(val);
              }}
              onKeyDown={(e) => {
                if (searchResults.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setActiveResultIndex((prev) => (prev + 1) % searchResults.length);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveResultIndex((prev) =>
                      prev <= 0 ? searchResults.length - 1 : prev - 1
                    );
                    return;
                  }
                  if (e.key === "Enter" && activeResultIndex >= 0) {
                    e.preventDefault();
                    handleSelectSearchResult(searchResults[activeResultIndex]);
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setSearchResults([]);
                    setActiveResultIndex(-1);
                    return;
                  }
                }
                if (e.key === "Enter" && isUrlInput) {
                  e.preventDefault();
                  handleImport();
                }
              }}
              disabled={loading || cooldown > 0}
            />

            {isSearching && (
              <p className="text-[11px] font-mono text-[var(--text-muted)] mt-1.5">
                Querying Squig.link indexes...
              </p>
            )}

            {searchResults.length > 0 && (
              <ul
                id="squig-search-listbox"
                role="listbox"
                aria-label="Matching IEM and headphone measurements"
                className="absolute z-40 top-[calc(100%+4px)] left-0 w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded-md shadow-2xl max-h-56 overflow-y-auto custom-scrollbar"
              >
                {searchResults.map((result, idx) => {
                  const isSelected = idx === activeResultIndex;
                  return (
                    <li
                      key={result.id}
                      id={`search-opt-${result.id}`}
                      role="option"
                      aria-selected={isSelected}
                    >
                      <button
                        type="button"
                        className={`w-full text-left px-3 py-2 text-xs border-b border-[var(--border-subtle)] flex flex-col gap-0.5 transition-colors ${
                          isSelected
                            ? "bg-[var(--bg-hover)] text-[var(--text-primary)]"
                            : "text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                        }`}
                        onMouseEnter={() => setActiveResultIndex(idx)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSelectSearchResult(result);
                        }}
                      >
                        <span className="font-medium block truncate">{result.name}</span>
                        <span className="text-[10px] text-[var(--text-muted)] block truncate font-mono">
                          {result.source}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {isUrlInput && (
            <button
              type="button"
              className="btn-primary w-full py-1.5 text-xs font-semibold"
              onClick={handleImport}
              disabled={loading || !url.trim() || cooldown > 0}
            >
              {loading
                ? "Importing Curve..."
                : cooldown > 0
                ? `Ready in ${cooldown}s`
                : "Import URL"}
            </button>
          )}
        </section>

        {/* Active Traces Module */}
        <section className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => toggleSection("traces")}
              aria-expanded={openSections.traces}
              className="flex items-center gap-2 text-left flex-1 min-w-0 py-0.5 text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent-text)] transition-colors"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-150 shrink-0 text-[var(--text-muted)] ${
                  openSections.traces ? "rotate-180" : ""
                }`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>Active Traces</span>
              <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                ({traces.length})
              </span>
            </button>

            {traces.length > 0 && (
              <div className="flex items-center gap-2 shrink-0 ml-2">
                <button
                  type="button"
                  onClick={handleToggleAll}
                  className="text-[11px] font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-1 py-0.5 rounded"
                  title={
                    traces.every((t) => t.visible)
                      ? "Hide all active traces"
                      : "Show all active traces"
                  }
                >
                  {traces.every((t) => t.visible) ? "Hide All" : "Show All"}
                </button>
                <span className="text-[var(--border)]" aria-hidden="true">
                  |
                </span>
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="text-[11px] font-mono text-[var(--error)] hover:opacity-80 transition-opacity px-1 py-0.5 rounded"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {openSections.traces && (
            <div className="p-2 max-h-[340px] overflow-y-auto custom-scrollbar flex flex-col">
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

        {/* Parameter Bands Module */}
        <section className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => toggleSection("bands")}
              aria-expanded={openSections.bands}
              className="flex items-center gap-2 text-left flex-1 min-w-0 py-0.5 text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent-text)] transition-colors"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-150 shrink-0 text-[var(--text-muted)] ${
                  openSections.bands ? "rotate-180" : ""
                }`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>Parameter Bands</span>
              {enabledBands.size > 0 && (
                <span className="font-mono text-[11px] text-[var(--accent-text)] tabular-nums">
                  ({enabledBands.size})
                </span>
              )}
            </button>

            {enabledBands.size > 0 && (
              <button
                type="button"
                onClick={onClearAllBands}
                className="text-[11px] font-mono text-[var(--accent-text)] hover:opacity-80 transition-opacity px-1 py-0.5 rounded shrink-0"
              >
                Reset
              </button>
            )}
          </div>

          {openSections.bands && (
            <div className="p-2.5 flex flex-col gap-2 max-h-[300px] overflow-y-auto custom-scrollbar">
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

        {/* Saved Workspaces Module */}
        <section className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-base)] overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
            <button
              type="button"
              onClick={() => toggleSection("workspaces")}
              aria-expanded={openSections.workspaces}
              className="flex items-center gap-2 text-left flex-1 min-w-0 py-0.5 text-xs font-semibold text-[var(--text-primary)] hover:text-[var(--accent-text)] transition-colors"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform duration-150 shrink-0 text-[var(--text-muted)] ${
                  openSections.workspaces ? "rotate-180" : ""
                }`}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>Saved Workspaces</span>
              <span className="font-mono text-[11px] text-[var(--text-muted)] tabular-nums">
                ({workspaceNames.length})
              </span>
            </button>
          </div>

          {openSections.workspaces && (
            <div className="p-2.5 flex flex-col gap-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (newWorkspaceName.trim()) {
                    onSaveWorkspace(newWorkspaceName.trim());
                    setNewWorkspaceName("");
                  }
                }}
                className="flex gap-1.5"
              >
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="Snapshot name..."
                  aria-label="New workspace snapshot name"
                  className="input-field py-1 text-xs flex-1"
                />
                <button
                  type="submit"
                  disabled={!newWorkspaceName.trim()}
                  className="btn-primary px-3 py-1 text-xs font-semibold shrink-0"
                >
                  Save
                </button>
              </form>

              <div className="flex flex-col gap-1 max-h-36 overflow-y-auto custom-scrollbar">
                {workspaceNames.length === 0 ? (
                  <p className="text-[11px] text-[var(--text-muted)] py-1">
                    No saved local snapshots yet.
                  </p>
                ) : (
                  workspaceNames.map((name) => (
                    <div
                      key={name}
                      className="flex items-center justify-between bg-[var(--bg-surface)] border border-[var(--border-subtle)] rounded px-2.5 py-1.5 text-xs"
                    >
                      <button
                        type="button"
                        className="font-medium text-[var(--text-primary)] hover:text-[var(--accent-text)] truncate flex-1 text-left transition-colors"
                        onClick={() => onLoadWorkspace(name)}
                      >
                        {name}
                      </button>
                      <button
                        type="button"
                        className="inline-flex items-center justify-center w-6 h-6 rounded text-[var(--text-muted)] hover:text-[var(--error)] hover:bg-[var(--bg-hover)] ml-1 transition-colors"
                        onClick={() => onDeleteWorkspace(name)}
                        aria-label={`Delete workspace ${name}`}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <line x1="18" y1="6" x2="6" y2="18" />
                          <line x1="6" y1="6" x2="18" y2="18" />
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

      {/* Rack Footer Bar */}
      <div className="px-3.5 py-2.5 border-t border-[var(--border-subtle)] bg-[var(--bg-base)] flex items-center justify-between text-[11px] font-mono text-[var(--text-muted)] shrink-0">
        <div className="flex items-center gap-2.5">
          <Link href="/tutorial" className="hover:text-[var(--text-primary)] transition-colors">
            Guide
          </Link>
          <span>·</span>
          <Link href="/legal" className="hover:text-[var(--text-primary)] transition-colors">
            Legal
          </Link>
          {onOpenQuickStart && (
            <>
              <span>·</span>
              <button
                type="button"
                onClick={onOpenQuickStart}
                className="hover:text-[var(--text-primary)] transition-colors"
              >
                Shortcuts
              </button>
            </>
          )}
        </div>
        <a
          href="https://github.com/jaermaine/freqres-visualizer-dashboard/issues"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-[var(--text-primary)] transition-colors"
        >
          Issues ↗
        </a>
      </div>
    </aside>
  );
});
