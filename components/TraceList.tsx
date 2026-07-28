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
    <div className="flex flex-col gap-1.5 p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border)] hover:border-[var(--border-glow)] transition-all duration-150 group shadow-sm">
      <div className="flex items-center gap-2">
        <div className="cursor-grab text-[var(--text-muted)] opacity-40 group-hover:opacity-100 flex-shrink-0 transition-opacity" title="Drag to reorder">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="9" cy="6" r="1.5" fill="currentColor"></circle>
            <circle cx="15" cy="6" r="1.5" fill="currentColor"></circle>
            <circle cx="9" cy="12" r="1.5" fill="currentColor"></circle>
            <circle cx="15" cy="12" r="1.5" fill="currentColor"></circle>
            <circle cx="9" cy="18" r="1.5" fill="currentColor"></circle>
            <circle cx="15" cy="18" r="1.5" fill="currentColor"></circle>
          </svg>
        </div>

        <input
          type="checkbox"
          checked={trace.visible}
          onChange={() => onToggle(trace.id)}
          className="w-4 h-4 rounded accent-indigo-500 cursor-pointer flex-shrink-0"
          id={`trace-vis-${trace.id}`}
          aria-label={`Toggle visibility for ${trace.label}`}
        />

        <div className="relative flex items-center justify-center flex-shrink-0 group/color cursor-pointer">
          <input
            type="color"
            value={localColor}
            onChange={(e) => setLocalColor(e.target.value)}
            className="w-5 h-5 rounded-full cursor-pointer border-0 bg-transparent p-0 opacity-0 absolute inset-0 z-10"
            title="Change color"
            aria-label={`Change color for ${trace.label}`}
          />
          <div 
            className="w-4 h-4 rounded-full border border-white/20 transition-transform group-hover/color:scale-110 shadow-sm"
            style={{ backgroundColor: localColor, boxShadow: `0 0 8px ${localColor}66` }}
          />
        </div>

        {trace.channel === "L" && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shrink-0">
            L
          </span>
        )}
        {trace.channel === "R" && (
          <span className="px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 shrink-0">
            R
          </span>
        )}

        <div className="flex-1 min-w-0 flex flex-col justify-center">
          <input
            type="text"
            value={trace.label}
            onChange={(e) => onLabelChange(trace.id, e.target.value)}
            className="w-full bg-transparent text-xs text-[var(--text-primary)] outline-none truncate font-semibold focus:text-white"
            aria-label="Trace label"
          />
          {sourceLabel && (
            <span className="text-[10px] text-[var(--text-muted)] truncate opacity-75 font-mono">
              via {sourceLabel}
            </span>
          )}
        </div>

        {isToggleable && (
          <button
            onClick={() => onToggleChannelMode?.(trace.id)}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/25 hover:bg-indigo-500/25 shrink-0 transition-colors"
            title={trace.channel === "L" || trace.channel === "R" ? "Combine L & R into Average trace" : "Split into Left & Right channel traces"}
          >
            {trace.channel === "L" || trace.channel === "R" ? "L/R → Avg" : "Avg → L/R"}
          </button>
        )}

        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`text-[var(--text-muted)] hover:text-indigo-400 flex-shrink-0 transition-colors p-1 ${showNotes ? "text-indigo-400" : ""}`}
          title="Toggle notes"
          aria-label={`Toggle notes for ${trace.label}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9"></path>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
          </svg>
        </button>

        <button
          onClick={() => onRemove(trace.id)}
          className="text-[var(--text-muted)] hover:text-rose-400 flex-shrink-0 transition-colors p-1"
          title="Remove trace"
          aria-label={`Remove ${trace.label}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      {showNotes && (
        <div className="pl-6 pr-1 pb-1">
          <input
            type="text"
            placeholder="Add trace notes (mod, ear tips, measurement rig)..."
            value={trace.notes || ""}
            onChange={(e) => onNoteChange(trace.id, e.target.value)}
            className="input-field text-xs py-1 px-2"
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
