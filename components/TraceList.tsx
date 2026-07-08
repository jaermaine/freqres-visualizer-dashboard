import { useState } from "react";
import type { Trace } from "@/types/audio";

interface Props {
  trace: Trace;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onLabelChange: (id: string, label: string) => void;
}

export function TraceItem({ trace, onToggle, onRemove, onColorChange, onLabelChange }: Props) {
  return (
    <div
      className="flex items-center gap-2 px-2 py-1.5 rounded bg-[var(--bg-raised)] border border-[var(--border-subtle)] group"
    >
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
      />
      <input
        type="color"
        value={trace.color}
        onChange={(e) => onColorChange(trace.id, e.target.value)}
        className="w-5 h-5 rounded cursor-pointer flex-shrink-0 border-0 bg-transparent p-0"
        title="Change color"
      />
      <input
        type="text"
        value={trace.label}
        onChange={(e) => onLabelChange(trace.id, e.target.value)}
        className="flex-1 min-w-0 bg-transparent text-sm text-slate-200 outline-none"
        style={{ fontFamily: "Inter, sans-serif" }}
      />
      <button
        onClick={() => onRemove(trace.id)}
        className="text-slate-600 hover:text-red-400 flex-shrink-0 text-sm leading-none"
        title="Remove trace"
        aria-label={`Remove ${trace.label}`}
      >
        ✕
      </button>
    </div>
  );
}

interface ListProps {
  traces: Trace[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  onLabelChange: (id: string, label: string) => void;
  onReorder: (dragIndex: number, hoverIndex: number) => void;
}

export function TraceList({ traces, onToggle, onRemove, onColorChange, onLabelChange, onReorder }: ListProps) {
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
    <div className="flex flex-col gap-1">
      {traces.map((t, index) => {
        const isDragging = draggedIdx === index;
        const isDragOver = dragOverIdx === index && draggedIdx !== null && draggedIdx !== index;
        const insertAbove = draggedIdx !== null && draggedIdx > index;

        return (
          <div
            key={t.id}
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
            />
          </div>
        );
      })}
    </div>
  );
}
