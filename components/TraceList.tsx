import { useState } from "react";
import type { Trace } from "@/types/audio";

interface Props {
  trace: Trace;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onNoteChange: (id: string, note: string) => void;
}

export function TraceItem({ trace, onToggle, onRemove, onColorChange, onLabelChange, onNoteChange }: Props) {
  const [showNotes, setShowNotes] = useState(!!trace.notes);

  return (
    <div className="flex flex-col gap-1 p-1.5 rounded bg-[var(--bg-raised)] border border-[var(--border-subtle)] group">
      <div className="flex items-center gap-2">
        <div className="cursor-grab text-slate-500 opacity-50 group-hover:opacity-100 flex-shrink-0" title="Drag to reorder">
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
        key={trace.color}
        type="color"
        defaultValue={trace.color}
        onBlur={(e) => onColorChange(trace.id, e.target.value)}
        className="w-5 h-5 rounded cursor-pointer flex-shrink-0 border-0 bg-transparent p-0"
        title="Change color"
        aria-label={`Change color for ${trace.label}`}
      />
      <input
        type="text"
        value={trace.label}
        onChange={(e) => onLabelChange(trace.id, e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-sm text-slate-200 outline-none"
        style={{ fontFamily: "Inter, sans-serif" }}
        aria-label="Trace label"
      />
        <button
          onClick={() => setShowNotes(!showNotes)}
          className="text-slate-500 hover:text-[var(--text-primary)] flex-shrink-0 text-sm leading-none"
          title="Toggle notes"
          aria-label={`Toggle notes for ${trace.label}`}
        >
          ✎
        </button>
        <button
          onClick={() => onRemove(trace.id)}
          className="text-slate-600 hover:text-red-400 flex-shrink-0 text-sm leading-none"
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
}

export function TraceList({ traces, onToggle, onRemove, onColorChange, onLabelChange, onNoteChange, onReorder }: ListProps) {
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
            />
          </div>
        );
      })}
    </div>
  );
}
