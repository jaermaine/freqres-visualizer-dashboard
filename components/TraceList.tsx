import React, { useState, useEffect } from "react";
import type { Trace } from "@/types/audio";
import { getTraceSourceLabel } from "@/lib/sourceUtils";

interface Props {
  trace: Trace;
  index: number;
  totalCount: number;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleChannelMode?: (id: string) => void;
}

export const TraceItem = React.memo(function TraceItem({
  trace,
  index,
  totalCount,
  onToggle,
  onRemove,
  onColorChange,
  onLabelChange,
  onNoteChange,
  onMoveUp,
  onMoveDown,
  onToggleChannelMode,
}: Props) {
  const [showNotes, setShowNotes] = useState(!!trace.notes);
  const [localColor, setLocalColor] = useState(trace.color);
  const [localLabel, setLocalLabel] = useState(trace.label);
  const [localNotes, setLocalNotes] = useState(trace.notes || "");
  const sourceLabel = getTraceSourceLabel(trace);

  useEffect(() => {
    setLocalColor(trace.color);
  }, [trace.color]);

  useEffect(() => {
    setLocalLabel(trace.label);
  }, [trace.label]);

  useEffect(() => {
    setLocalNotes(trace.notes || "");
  }, [trace.notes]);

  useEffect(() => {
    if (localColor !== trace.color) {
      const timer = setTimeout(() => {
        onColorChange(trace.id, localColor);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [localColor, trace.color, trace.id, onColorChange]);

  const commitLabel = () => {
    const trimmed = localLabel.trim() || trace.label;
    setLocalLabel(trimmed);
    if (trimmed !== trace.label) {
      onLabelChange(trace.id, trimmed);
    }
  };

  const commitNotes = () => {
    const currentNotes = trace.notes || "";
    if (localNotes !== currentNotes) {
      onNoteChange(trace.id, localNotes);
    }
  };

  const isToggleable =
    !!trace.rawChannels ||
    trace.source?.kind === "squiglink-share-url" ||
    trace.source?.kind === "hangout-graph-url";

  return (
    <div
      className={`flex flex-col gap-1.5 p-2 rounded bg-[var(--bg-surface)] border transition-colors duration-120 group ${
        trace.visible
          ? "border-[var(--border)] hover:border-[var(--border-glow)]"
          : "border-[var(--border-subtle)] opacity-60"
      }`}
    >
      <div className="flex items-center gap-1.5">
        {/* Drag Handle + Keyboard Reorder Support */}
        <div className="flex flex-col items-center shrink-0">
          <div
            className="cursor-grab text-[var(--text-muted)] opacity-50 group-hover:opacity-100 transition-opacity p-0.5"
            title="Drag to reorder trace (or use Alt + Up/Down arrows)"
          >
            <svg
              width="11"
              height="11"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="9" cy="6" r="1.5" fill="currentColor" />
              <circle cx="15" cy="6" r="1.5" fill="currentColor" />
              <circle cx="9" cy="12" r="1.5" fill="currentColor" />
              <circle cx="15" cy="12" r="1.5" fill="currentColor" />
              <circle cx="9" cy="18" r="1.5" fill="currentColor" />
              <circle cx="15" cy="18" r="1.5" fill="currentColor" />
            </svg>
          </div>
        </div>

        {/* Visibility Checkbox + Shortcut Index */}
        <input
          type="checkbox"
          checked={trace.visible}
          onChange={() => onToggle(trace.id)}
          className="w-4 h-4 rounded-sm accent-[var(--accent)] cursor-pointer flex-shrink-0"
          id={`trace-vis-${trace.id}`}
          aria-label={`Toggle visibility for ${trace.label} (Shortcut ${index + 1})`}
        />

        {/* Color Swatch Picker */}
        <div className="relative flex items-center justify-center flex-shrink-0 w-5 h-5 cursor-pointer">
          <input
            type="color"
            value={localColor}
            onChange={(e) => setLocalColor(e.target.value)}
            className="w-5 h-5 rounded-sm cursor-pointer border-0 bg-transparent p-0 opacity-0 absolute inset-0 z-10"
            title={`Trace color (${localColor})`}
            aria-label={`Change color for ${trace.label}`}
          />
          <div
            className="w-3.5 h-3.5 rounded-xs border border-black/30 dark:border-white/25"
            style={{ backgroundColor: localColor }}
          />
        </div>

        {/* Channel Indicator Badge */}
        {trace.channel === "L" && (
          <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-wider uppercase rounded-xs bg-cyan-600/15 text-cyan-600 dark:text-cyan-400 border border-cyan-600/30 shrink-0">
            L
          </span>
        )}
        {trace.channel === "R" && (
          <span className="px-1.5 py-0.2 text-[9px] font-mono font-bold tracking-wider uppercase rounded-xs bg-rose-600/15 text-rose-600 dark:text-rose-400 border border-rose-600/30 shrink-0">
            R
          </span>
        )}

        {/* Editable Trace Label & Source Attribution */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <input
            type="text"
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.currentTarget.blur();
              } else if (e.altKey && e.key === "ArrowUp" && index > 0) {
                e.preventDefault();
                onMoveUp();
              } else if (e.altKey && e.key === "ArrowDown" && index < totalCount - 1) {
                e.preventDefault();
                onMoveDown();
              }
            }}
            className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none truncate font-medium focus:bg-[var(--bg-base)] focus:px-1 rounded-xs transition-all"
            aria-label={`Trace label for ${trace.label}`}
          />
          {sourceLabel && (
            <span className="text-[10px] text-[var(--text-muted)] truncate font-mono">
              via {sourceLabel}
            </span>
          )}
        </div>

        {/* Avg <-> L/R Channel Split Toggle */}
        {isToggleable && (
          <button
            type="button"
            onClick={() => onToggleChannelMode?.(trace.id)}
            className="text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded-xs bg-[var(--accent-dim)] text-[var(--accent-text)] border border-[var(--accent-border)] hover:opacity-85 shrink-0 transition-opacity"
            title={
              trace.channel === "L" || trace.channel === "R"
                ? "Combine Left & Right into Average trace"
                : "Split into Left & Right channel traces"
            }
          >
            {trace.channel === "L" || trace.channel === "R" ? "L/R→Avg" : "Avg→L/R"}
          </button>
        )}

        {/* Accessible Reorder Buttons (Keyboard & Touch) */}
        {totalCount > 1 && (
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onMoveUp}
              disabled={index === 0}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-25 p-1 transition-colors"
              title="Move trace up"
              aria-label={`Move ${trace.label} up`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onMoveDown}
              disabled={index === totalCount - 1}
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] disabled:opacity-25 p-1 transition-colors"
              title="Move trace down"
              aria-label={`Move ${trace.label} down`}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>
        )}

        {/* Notes Toggle Button */}
        <button
          type="button"
          onClick={() => setShowNotes(!showNotes)}
          aria-expanded={showNotes}
          className={`flex-shrink-0 transition-colors p-1 rounded-xs ${
            showNotes || trace.notes
              ? "text-[var(--accent-text)] bg-[var(--accent-dim)]"
              : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          }`}
          title="Toggle trace notes"
          aria-label={`Toggle notes for ${trace.label}`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>

        {/* Remove Trace Button */}
        <button
          type="button"
          onClick={() => onRemove(trace.id)}
          className="text-[var(--text-muted)] hover:text-[var(--error)] flex-shrink-0 transition-colors p-1 rounded-xs"
          title="Remove trace"
          aria-label={`Remove ${trace.label}`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {showNotes && (
        <div className="pl-5 pr-1 pb-0.5">
          <input
            type="text"
            placeholder="Add trace notes (ear tips, mod, coupler)..."
            value={localNotes}
            onChange={(e) => setLocalNotes(e.target.value)}
            onBlur={commitNotes}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
            }}
            className="input-field text-xs py-1 px-2"
            aria-label={`Notes for ${trace.label}`}
          />
        </div>
      )}
    </div>
  );
});

interface ListProps {
  traces: Trace[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
  onToggleChannelMode?: (id: string) => void;
}

export const TraceList = React.memo(function TraceList({
  traces,
  onToggle,
  onRemove,
  onColorChange,
  onLabelChange,
  onNoteChange,
  onReorder,
  onToggleChannelMode,
}: ListProps) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  if (traces.length === 0) {
    return (
      <p className="text-xs px-1 py-1 font-mono text-[var(--text-muted)]">
        No active curves in rack.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1" role="list" aria-label="Active frequency response traces">
      {traces.map((t, index) => {
        const isDragging = draggedIdx === index;
        const isDragOver = dragOverIdx === index && draggedIdx !== null && draggedIdx !== index;
        const insertAbove = draggedIdx !== null && draggedIdx > index;

        return (
          <div
            key={t.id}
            role="listitem"
            draggable
            onDragStart={(e) => {
              setDraggedIdx(index);
              if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", t.id);
              }
            }}
            onDragEnter={(e) => {
              e.preventDefault();
              setDragOverIdx(index);
            }}
            onDragOver={(e) => {
              e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (draggedIdx !== null && draggedIdx !== index) {
                onReorder(draggedIdx, index);
              }
              setDraggedIdx(null);
              setDragOverIdx(null);
            }}
            onDragEnd={() => {
              setDraggedIdx(null);
              setDragOverIdx(null);
            }}
            style={{
              opacity: isDragging ? 0.4 : 1,
              borderTop:
                isDragOver && insertAbove ? "2px solid var(--accent)" : "2px solid transparent",
              borderBottom:
                isDragOver && !insertAbove ? "2px solid var(--accent)" : "2px solid transparent",
              marginTop: isDragOver && insertAbove ? "-2px" : "0",
              marginBottom: isDragOver && !insertAbove ? "-2px" : "0",
            }}
            className="transition-opacity duration-100"
          >
            <TraceItem
              trace={t}
              index={index}
              totalCount={traces.length}
              onToggle={onToggle}
              onRemove={onRemove}
              onColorChange={onColorChange}
              onLabelChange={onLabelChange}
              onNoteChange={onNoteChange}
              onMoveUp={() => index > 0 && onReorder(index, index - 1)}
              onMoveDown={() => index < traces.length - 1 && onReorder(index, index + 1)}
              onToggleChannelMode={onToggleChannelMode}
            />
          </div>
        );
      })}
    </div>
  );
});
