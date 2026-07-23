import { useState, useEffect } from "react";
import type { Trace } from "@/types/audio";
import { getTraceSourceLabel } from "@/lib/sourceUtils";

interface Props {
  trace: Trace;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onNoteChange: (id: string, note: string) => void;
  onToggleChannelMode?: (id: string) => void;
}

export function TraceItem({ trace, onToggle, onRemove, onColorChange, onLabelChange, onNoteChange, onToggleChannelMode }: Props) {
  const [showNotes, setShowNotes] = useState(!!trace.notes);
  const [localColor, setLocalColor] = useState(trace.color);
  const sourceLabel = getTraceSourceLabel(trace);

  useEffect(() => {
    setLocalColor(trace.color);
  }, [trace.color]);

  useEffect(() => {
    if (localColor !== trace.color) {
      const timer = setTimeout(() => {
        onColorChange(trace.id, localColor);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [localColor, trace.color, trace.id, onColorChange]);

  const isToggleable = !!trace.rawChannels || trace.source?.kind === "squiglink-share-url" || trace.source?.kind === "hangout-graph-url";

  return (
    <div className="flex flex-col gap-1 p-1.5 rounded bg-[var(--bg-raised)] border border-[var(--border-subtle)] group">
      <div className="flex items-center gap-2">
        <div className="cursor-grab text-[var(--text-muted)] opacity-50 group-hover:opacity-100 flex-shrink-0" title="Drag to reorder">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </div>
      <input
        type="checkbox"
        checked={trace.visible}
        onChange={() => onToggle(trace.id)}
        className="w-3.5 h-3.5 accent-indigo-500 flex-shrink-0"
        id={`trace-vis-${trace.id}`}
        aria-label={`Toggle visibility for ${trace.label}`}
      />
      <input
        type="color"
        value={localColor}
        onChange={(e) => setLocalColor(e.target.value)}
        className="w-5 h-5 rounded cursor-pointer flex-shrink-0 border-0 bg-transparent p-0"
        title="Change color"
        aria-label={`Change color for ${trace.label}`}
      />
      {trace.channel === "L" && (
        <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
          L
        </span>
      )}
      {trace.channel === "R" && (
        <span className="px-1 py-0.2 text-[9px] font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
          R
        </span>
      )}
      <div className="flex-1 min-w-0 flex flex-col">
        <input
          type="text"
          value={trace.label}
          onChange={(e) => onLabelChange(trace.id, e.target.value)}
          className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none truncate font-medium"
          style={{ fontFamily: "Inter, sans-serif" }}
          aria-label="Trace label"
        />
        {sourceLabel && (
          <span className="text-[10px] text-[var(--text-muted)] truncate opacity-75">
            via {sourceLabel}
          </span>
        )}
      </div>
        {isToggleable && (
          <button
            onClick={() => onToggleChannelMode?.(trace.id)}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-500/30 shrink-0 transition-colors"
            title={trace.channel === "L" || trace.channel === "R" ? "Combine L & R into Average trace" : "Split into Left & Right channel traces"}
          >
            {trace.channel === "L" || trace.channel === "R" ? "L/R → Avg" : "Avg → L/R"}
          </button>
        )}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-[var(--text-muted)] hover:text-[var(--text-primary)] flex-shrink-0 text-sm leading-none"
          title="Toggle notes"
          aria-label={`Toggle notes for ${trace.label}`}
        >
          ✎
        </button>
        <button
          onClick={() => onRemove(trace.id)}
          className="text-[var(--text-muted)] hover:text-rose-400 flex-shrink-0 text-sm leading-none"
          title="Remove trace"
          aria-label={`Remove ${trace.label}`}
        >
          ✕
        </button>
      </div>
      {showNotes && (
        <div className="pl-6 pr-1 pb-1">
          <input
            type="text"
            placeholder="Add notes (e.g. foam mod, spinfits)..."
            value={trace.notes || ""}
            onChange={(e) => onNoteChange(trace.id, e.target.value)}
            className="w-full bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded px-2 py-1 text-xs text-[var(--text-secondary)] outline-none focus:border-[var(--accent)]"
            aria-label={`Notes for ${trace.label}`}
          />
        </div>
      )}
    </div>
  );
}

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

export function TraceList({ traces, onToggle, onRemove, onColorChange, onLabelChange, onNoteChange, onReorder, onToggleChannelMode }: ListProps) {
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  if (traces.length === 0) {
    return (
      <p className="text-sm px-1" style={{ color: "var(--text-muted)" }}>
        No traces imported yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1" role="list" aria-label="Trace list">
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
              // Required for Firefox
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
              transform: "translate3d(0,0,0)",
              borderTop: isDragOver && insertAbove ? "2px solid var(--accent)" : "2px solid transparent",
              borderBottom: isDragOver && !insertAbove ? "2px solid var(--accent)" : "2px solid transparent",
              marginTop: isDragOver && insertAbove ? "-2px" : "0",
              marginBottom: isDragOver && !insertAbove ? "-2px" : "0",
            }}
            className="transition-all duration-100"
          >
            <TraceItem
              trace={t}
              onToggle={onToggle}
              onRemove={onRemove}
              onColorChange={onColorChange}
              onLabelChange={onLabelChange}
              onNoteChange={onNoteChange}
              onToggleChannelMode={onToggleChannelMode}
            />
          </div>
        );
      })}
    </div>
  );
}
