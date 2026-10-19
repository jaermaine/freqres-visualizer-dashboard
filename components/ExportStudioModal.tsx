"use client";

import { useState, useEffect } from "react";
import type { Trace } from "@/types/audio";
import { getReviewerName } from "@/lib/sourceUtils";

export interface ExportOptions {
  aspectRatio: "16:9" | "1:1" | "4:3";
  exportTheme: "dark" | "light";
  includeSourceCredit: boolean;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  traces: Trace[];
  currentTheme: "dark" | "light";
  onExport: (options: ExportOptions) => Promise<void>;
  generatePreview: (options: ExportOptions) => Promise<string | null>;
  isExporting: boolean;
}

export function ExportStudioModal({
  isOpen,
  onClose,
  traces,
  currentTheme,
  onExport,
  generatePreview,
  isExporting,
}: Props) {
  const [aspectRatio, setAspectRatio] = useState<"16:9" | "1:1" | "4:3">("16:9");
  const [exportTheme, setExportTheme] = useState<"dark" | "light">(currentTheme);
  const [includeSourceCredit, setIncludeSourceCredit] = useState(true);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);

  useEffect(() => {
    setExportTheme(currentTheme);
  }, [currentTheme]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const visibleTraces = traces.filter((t) => t.visible);
  const reviewers = Array.from(new Set(visibleTraces.map(getReviewerName).filter(Boolean)));

  // Generate live preview whenever options change
  useEffect(() => {
    if (!isOpen || visibleTraces.length === 0) return;

    let isMounted = true;
    const timer = setTimeout(async () => {
      setIsGeneratingPreview(true);
      try {
        const url = await generatePreview({
          aspectRatio,
          exportTheme,
          includeSourceCredit,
        });
        if (isMounted) setPreviewUrl(url);
      } catch (err) {
        console.error("Preview generation failed:", err);
      } finally {
        if (isMounted) setIsGeneratingPreview(false);
      }
    }, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, aspectRatio, exportTheme, includeSourceCredit, generatePreview, visibleTraces.length]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onExport({ aspectRatio, exportTheme, includeSourceCredit });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-studio-title"
        className="w-full max-w-2xl rounded-lg border border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl p-5 max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border-subtle)] shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-[var(--accent-dim)] border border-[var(--accent-border)] text-[var(--accent-text)] flex items-center justify-center">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
            <div>
              <h2 id="export-studio-title" className="text-sm font-semibold">
                PNG Export Studio
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                High-resolution plot rendering with aspect presets & source attribution
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close PNG Export Studio"
            className="inline-flex items-center justify-center w-8 h-8 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-colors"
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

        {/* Content Body (2 Columns on MD+) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-4 overflow-y-auto pr-1 custom-scrollbar">
          {/* Left Column: Live Preview Window */}
          <div className="flex flex-col gap-2">
            <span className="label-xs">Live Render Preview</span>
            <div
              className={`w-full rounded border overflow-hidden flex items-center justify-center min-h-[220px] max-h-[300px] relative transition-colors ${
                exportTheme === "light"
                  ? "bg-white border-[#d4d4cc]"
                  : "bg-[#0b0c0e] border-[#262a34]"
              }`}
            >
              {isGeneratingPreview && (
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center z-10">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-[var(--bg-surface)] border border-[var(--border)] text-xs font-mono text-[var(--text-primary)] shadow">
                    <svg
                      className="animate-spin"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Rendering...
                  </div>
                </div>
              )}

              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Frequency response export preview"
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="text-xs font-mono text-[var(--text-muted)] p-4 text-center">
                  {visibleTraces.length === 0
                    ? "No visible traces loaded"
                    : "Generating preview..."}
                </div>
              )}
            </div>
            <p className="text-[11px] font-mono text-[var(--text-muted)] text-center">
              Canvas: {exportTheme === "dark" ? "Anodized Carbon (Dark)" : "Paper Stone (Light)"} ·{" "}
              {aspectRatio}
            </p>
          </div>

          {/* Right Column: Customization Controls */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Aspect Ratio Selector */}
            <div>
              <span className="label-xs block mb-1.5">Aspect Ratio Preset</span>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "16:9", label: "16:9", desc: "YouTube / Web" },
                  { id: "1:1", label: "1:1", desc: "Square Post" },
                  { id: "4:3", label: "4:3", desc: "Forum Embed" },
                ].map((preset) => {
                  const active = aspectRatio === preset.id;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setAspectRatio(preset.id as any)}
                      aria-pressed={active}
                      className={`flex flex-col items-center justify-center p-2 rounded border text-xs transition-colors ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent-text)] font-semibold"
                          : "border-[var(--border)] bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                      }`}
                    >
                      <span className="text-xs font-mono font-bold">{preset.label}</span>
                      <span className="text-[10px] opacity-75 mt-0.5">{preset.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Theme Style Toggle */}
            <div>
              <span className="label-xs block mb-1.5">Canvas Background</span>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "dark", label: "Dark Carbon" },
                  { id: "light", label: "Light Stone" },
                ].map((style) => {
                  const active = exportTheme === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      onClick={() => setExportTheme(style.id as any)}
                      aria-pressed={active}
                      className={`py-2 px-3 rounded border text-xs font-medium inline-flex items-center justify-center gap-2 transition-colors ${
                        active
                          ? "border-[var(--accent)] bg-[var(--accent-dim)] text-[var(--accent-text)] font-semibold"
                          : "border-[var(--border)] bg-[var(--bg-raised)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)]"
                      }`}
                    >
                      {style.id === "dark" ? (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                        </svg>
                      ) : (
                        <svg
                          width="13"
                          height="13"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
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
                      )}
                      {style.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reviewer Credit Toggle */}
            {reviewers.length > 0 && (
              <div className="flex items-start gap-2 pt-2 border-t border-[var(--border-subtle)]">
                <input
                  type="checkbox"
                  id="include-source-credit"
                  checked={includeSourceCredit}
                  onChange={(e) => setIncludeSourceCredit(e.target.checked)}
                  className="w-4 h-4 mt-0.5 accent-[var(--accent)] rounded-sm cursor-pointer"
                />
                <label
                  htmlFor="include-source-credit"
                  className="text-xs text-[var(--text-secondary)] cursor-pointer select-none leading-relaxed"
                >
                  Embed Reviewer Attribution:{" "}
                  <span className="font-mono font-semibold text-[var(--accent-text)] block">
                    {reviewers.join(", ")}
                  </span>
                </label>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-subtle)] mt-auto">
              <button
                type="button"
                onClick={onClose}
                className="btn-ghost px-3.5 py-1.5 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isExporting || visibleTraces.length === 0}
                className="btn-primary px-4 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
              >
                {isExporting ? (
                  <>
                    <svg
                      className="animate-spin"
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Exporting...
                  </>
                ) : (
                  <>
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    Download PNG ({aspectRatio})
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
