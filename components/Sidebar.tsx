"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { TraceList } from "./TraceList";
import { BandToggleGroup } from "./BandToggleGroup";
import { ImportStatus } from "./HelpPanel";
import type { Trace, ImportResult } from "@/types/audio";
import { TUNING_TARGETS } from "@/lib/targets";

interface Props {
  traces: Trace[];
  enabledBands: Set<string>;
  lastResult: ImportResult | null;
  loading: boolean;
  onImport: (url: string) => Promise<boolean>;
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
  isCopied: boolean;
  isSharing?: boolean;
  isOpen?: boolean;
  onClose?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  savedWorkspaces: Record<string, any>;
  onSaveWorkspace: (name: string) => void;
  onLoadWorkspace: (name: string) => void;
  onDeleteWorkspace: (name: string) => void;
}

export function Sidebar({
  traces,
  enabledBands,
  lastResult,
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
  isCopied,
  isSharing,
  isOpen,
  onClose,
  theme,
  onToggleTheme,
  savedWorkspaces,
  onSaveWorkspace,
  onLoadWorkspace,
  onDeleteWorkspace,
}: Props) {
  const [url, setUrl] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");

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
    const urls = url.split(/[\n, ]+/).map(u => u.trim()).filter(Boolean);
    
    for (const singleUrl of urls) {
      await onImport(singleUrl);
    }
    
    setUrl("");
    setCooldown(3); // 3-second UI rate limit
  }, [url, onImport, loading, cooldown]);

  const handleKey = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleImport();
      }
    },
    [handleImport]
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden transition-opacity" 
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col h-full overflow-y-auto transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          isOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
        style={{
          width: 300,
          minWidth: 300,
          background: "var(--bg-surface)",
          borderRight: "1px solid var(--border-subtle)",
        }}
      >
        {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-3"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <span className="text-indigo-400 text-base">〰</span>
        <span className="font-semibold text-sm tracking-tight" style={{ color: "var(--text-primary)" }}>
          FreqRes
        </span>
        <span className="ml-auto flex items-center gap-3">
          <button 
            onClick={onShareWorkspace}
            disabled={isSharing}
            className="label-xs hover:text-white transition-colors flex items-center gap-1 relative disabled:opacity-50"
            style={{ color: "var(--text-muted)" }}
            title="Copy shareable workspace link"
          >
            {isSharing ? (
              <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
              </svg>
            )}
            {isSharing ? 'Saving...' : 'Share'}
            {isCopied && <span className="absolute -top-6 -left-3 bg-indigo-600 text-white px-2 py-0.5 rounded text-[10px] whitespace-nowrap shadow-lg">Copied!</span>}
          </button>
          <Link
            href="/tutorial"
            className="label-xs hover:text-indigo-400 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            Guide
          </Link>
          {/* Mobile Close Button */}
          <button 
            className="md:hidden text-[var(--text-muted)] hover:text-white"
            onClick={onClose}
            aria-label="Close menu"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </span>
      </div>

      <div className="flex flex-col gap-4 p-3 flex-1 overflow-y-auto">
        {/* Search Database */}
        <section className="relative">
          <p className="label-xs mb-1.5">Search Databases (Squiglink)</p>
          <input
            type="text"
            className="flex-1 w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            placeholder="Type IEM name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {isSearching && <p className="text-xs text-[var(--text-muted)] mt-1">Searching...</p>}
          {searchResults.length > 0 && (
            <ul className="absolute z-10 top-[60px] left-0 w-full bg-[var(--bg-surface)] border border-[var(--border)] rounded shadow-lg max-h-48 overflow-y-auto">
              {searchResults.map((result) => (
                <li key={result.id}>
                  <button
                    className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-hover)] text-[var(--text-primary)] border-b border-[var(--border-subtle)]"
                    onClick={() => {
                      setUrl(prev => prev ? prev + '\n' + result.url : result.url);
                      setSearchQuery("");
                      setSearchResults([]);
                    }}
                  >
                    <span className="font-semibold block">{result.name}</span>
                    <span className="text-xs text-[var(--text-muted)] block">{result.source}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* URL Input */}
        <section>
          <p className="label-xs mb-1.5">Import URL</p>
          <textarea
            id="url-input"
            className="flex-1 w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-3 py-2 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)] disabled:opacity-50 min-h-[60px] resize-y"
            placeholder="Paste squig.link URL(s) or raw data..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={handleKey}
            spellCheck={false}
            disabled={loading || cooldown > 0}
          />
          <button
            id="import-btn"
            className="btn-primary w-full mt-2"
            onClick={handleImport}
            disabled={loading || !url.trim() || cooldown > 0}
          >
            {loading ? "Importing…" : cooldown > 0 ? `Wait ${cooldown}s…` : "Import"}
          </button>
        </section>

        <hr className="divider" />

        {/* Workspace Management */}
        <section className="mt-2 border-t border-[var(--border-subtle)] pt-4">
          <p className="label-xs mb-1.5">Saved Workspaces</p>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newWorkspaceName}
              onChange={(e) => setNewWorkspaceName(e.target.value)}
              placeholder="Workspace name..."
              className="flex-1 bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
            />
            <button
              onClick={() => {
                if (newWorkspaceName.trim()) {
                  onSaveWorkspace(newWorkspaceName.trim());
                  setNewWorkspaceName("");
                }
              }}
              className="btn-primary px-3 py-1 text-xs"
            >
              Save
            </button>
          </div>
          <div className="flex flex-col gap-1 max-h-32 overflow-y-auto">
            {Object.keys(savedWorkspaces).map((name) => (
              <div key={name} className="flex items-center justify-between bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1.5">
                <button
                  className="text-sm font-medium text-[var(--text-primary)] hover:text-[var(--accent)] truncate flex-1 text-left"
                  onClick={() => onLoadWorkspace(name)}
                >
                  {name}
                </button>
                <button
                  className="text-xs text-red-400 hover:text-red-500 ml-2"
                  onClick={() => onDeleteWorkspace(name)}
                  aria-label={`Delete workspace ${name}`}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Traces */}
        <section>
          <p className="label-xs mb-1.5">Traces ({traces.length})</p>
          <TraceList
            traces={traces}
            onToggle={onToggleTrace}
            onRemove={onRemoveTrace}
            onColorChange={onColorChange}
            onLabelChange={onLabelChange}
            onNoteChange={onNoteChange}
            onReorder={onReorderTraces}
          />
        </section>

        <hr className="divider" />

        {/* Parameter Bands */}
        <section className={traces.length === 0 ? "opacity-50 pointer-events-none select-none transition-opacity" : "transition-opacity"}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <p className="label-xs m-0">Parameter Bands</p>
              {enabledBands.size > 0 && (
                <button onClick={onClearAllBands} className="text-[10px] text-indigo-400 hover:text-indigo-300">
                  Clear All
                </button>
              )}
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer text-xs" style={{ color: "var(--text-muted)" }}>
              <input type="checkbox" checked={isInteractiveGraph} onChange={onToggleInteractiveGraph} className="accent-indigo-500" />
              Graph Select
            </label>
          </div>
          <BandToggleGroup 
            enabled={enabledBands} 
            onToggle={onToggleBand} 
            onClearCategory={onClearCategory}
            onHover={onHoverBand} 
            disabled={traces.length === 0} 
          />
        </section>

        <hr className="divider" />

        {/* Tuning Targets */}
        <section className="transition-opacity">
          <p className="label-xs mb-1.5">Tuning Target</p>
          <select
            aria-label="Tuning Target"
            value={selectedTarget}
            onChange={(e) => onSelectTarget(e.target.value)}
            className="w-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded text-sm px-2 py-1.5 focus:outline-none focus:border-indigo-500"
            style={{ color: "var(--text-primary)" }}
          >
            <option value="none">None</option>
            {TUNING_TARGETS.map(target => (
              <option key={target.id} value={target.id}>{target.label}</option>
            ))}
          </select>
          <label 
            className={`flex items-center gap-1.5 mt-2 cursor-pointer text-xs transition-opacity ${selectedTarget === "none" ? "opacity-40 pointer-events-none" : ""}`} 
            style={{ color: "var(--text-muted)" }}
          >
            <input 
              type="checkbox" 
              checked={isCompensated} 
              onChange={onToggleCompensated} 
              disabled={selectedTarget === "none"}
              className="accent-indigo-500" 
            />
            Compensate to Target
          </label>
        </section>

        <hr className="divider" />

        <div className="pb-2 flex flex-col gap-2">
          <Link
            href="/tutorial"
            className="text-xs hover:underline py-1"
            style={{ color: "var(--text-muted)" }}
          >
            📖 Tutorial & Troubleshooting →
          </Link>
          <Link
            href="/legal"
            className="text-xs hover:underline py-1"
            style={{ color: "var(--text-muted)" }}
          >
            ⚖️ Legal & Privacy Policy
          </Link>
          <a
            href="https://github.com/jaermaine/freqres-visualizer-dashboard/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs hover:underline py-1"
            style={{ color: "var(--text-muted)" }}
          >
            🐛 Report Bug / Feedback
          </a>
          <button
            onClick={onToggleTheme}
            className="text-xs hover:underline py-1 text-left"
            style={{ color: "var(--text-muted)" }}
          >
            {theme === 'dark' ? '☀️ Switch to Light Mode' : '🌙 Switch to Dark Mode'}
          </button>
        </div>
      </div>
      </aside>
    </>
  );
}
