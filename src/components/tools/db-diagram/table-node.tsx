import { memo, useContext, useState } from "react";
import { Handle, Position, useStore } from "@xyflow/react";
import { Key, Link as LinkIcon, Asterisk, StickyNote } from "lucide-react";
import { HighlightContext, HoverColumnContext } from "./highlight-context";

export interface DbColumn {
  name: string;
  type: string;
  pk: boolean;
  fk: boolean;
  unique: boolean;
  notNull: boolean;
  default?: string;
  note?: string;
  increment?: boolean;
}

export interface DbIndexEntry {
  columns: string[];
  unique?: boolean;
  pk?: boolean;
  name?: string;
}

export interface DbTableData extends Record<string, unknown> {
  name: string;
  schema?: string;
  note?: string;
  headerColor?: string;
  columns: DbColumn[];
  indexes?: DbIndexEntry[];
  highlightCols?: string[];
}

interface NodeProps {
  id: string;
  data: DbTableData;
  selected?: boolean;
}

function TableNodeImpl({ id, data, selected }: NodeProps) {
  const [hover, setHover] = useState<string | null>(null);
  const highlight = useContext(HighlightContext);
  const { setHovered } = useContext(HoverColumnContext);

  const ctxColHighlights = highlight.columnHighlights.get(id);
  const highlightSet = new Set([
    ...(data.highlightCols ?? []),
    ...(ctxColHighlights ?? []),
  ]);

  // Edge-selection dimming (legacy behavior)
  const edgeDimmed = useStore((s) => {
    const anySelectedEdge = s.edges.some((e) => e.selected);
    if (!anySelectedEdge) return false;
    const touched = s.edges.some(
      (e) => e.selected && (e.source === id || e.target === id),
    );
    return !touched;
  });

  const focusDimmed = highlight.hasFocus && !highlight.activeTables.has(id);
  const focusActive = highlight.hasFocus && highlight.activeTables.has(id);
  const dimmed = edgeDimmed || focusDimmed;

  return (
    <div
      className={`min-w-[240px] rounded-md border bg-card font-mono text-xs shadow-sm transition-all ${
        selected || focusActive ? "border-brand shadow-md" : "border-border"
      } ${dimmed ? "opacity-30" : ""}`}
    >
      <div
        className="flex items-center justify-between rounded-t-md px-3 py-2 text-xs font-semibold"
        style={{
          background: data.headerColor ?? "hsl(var(--muted))",
          color: data.headerColor ? readableText(data.headerColor) : "hsl(var(--foreground))",
        }}
      >
        <span className="font-sans flex items-center gap-1.5">
          {data.schema && data.schema !== "public" && (
            <span className="opacity-60">{data.schema}.</span>
          )}
          {data.name}
          {data.note && (
            <span title={data.note}>
              <StickyNote className="h-3 w-3 opacity-70" />
            </span>
          )}
        </span>
        <span className="font-sans text-[10px] opacity-70">{data.columns.length}</span>
      </div>
      <ul className="divide-y divide-border">
        {data.columns.map((col) => {
          const isHighlight = highlightSet.has(col.name);
          const isHover = hover === col.name;
          return (
            <li
              key={col.name}
              onMouseEnter={() => {
                setHover(col.name);
                setHovered({ tableId: id, column: col.name });
              }}
              onMouseLeave={() => {
                setHover(null);
                setHovered(null);
              }}
              className={`relative flex items-center gap-2 px-3 py-1.5 transition-colors ${
                isHighlight
                  ? "bg-brand/10"
                  : isHover
                    ? "bg-accent/40"
                    : ""
              }`}
            >
              <Handle
                type="target"
                position={Position.Left}
                id={`${col.name}__t`}
                className="!h-2 !w-2 !border !border-border !bg-muted"
                style={{ top: "50%" }}
              />
              <Handle
                type="source"
                position={Position.Right}
                id={`${col.name}__s`}
                className="!h-2 !w-2 !border !border-border !bg-muted"
                style={{ top: "50%" }}
              />
              <span className="flex w-4 shrink-0 items-center justify-center" title={iconTitle(col)}>
                {col.pk ? (
                  <Key className="h-3 w-3 text-brand" />
                ) : col.fk ? (
                  <LinkIcon className="h-3 w-3 text-muted-foreground" />
                ) : col.unique ? (
                  <Asterisk className="h-3 w-3 text-muted-foreground" />
                ) : null}
              </span>
              <span className={`flex-1 truncate ${col.pk ? "font-semibold" : ""} text-foreground`}>
                {col.name}
                {col.notNull && <span className="ml-1 text-destructive" title="NOT NULL">*</span>}
              </span>
              <span className="shrink-0 truncate text-[11px] text-muted-foreground" title={col.default ? `Default: ${col.default}` : undefined}>
                {col.type}
              </span>
            </li>
          );
        })}
        {data.indexes && data.indexes.length > 0 && (
          <li className="border-t border-border bg-muted/30 px-3 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Indexes</div>
            <ul className="mt-0.5 flex flex-col gap-0.5">
              {data.indexes.map((idx, i) => (
                <li key={i} className="font-mono text-[11px] text-muted-foreground">
                  {idx.unique && <span className="mr-1 text-brand">U</span>}
                  ({idx.columns.join(", ")})
                  {idx.name && <span className="ml-1 opacity-60">· {idx.name}</span>}
                </li>
              ))}
            </ul>
          </li>
        )}
      </ul>
    </div>
  );
}

function iconTitle(col: DbColumn): string {
  const parts = [];
  if (col.pk) parts.push("Primary key");
  if (col.fk) parts.push("Foreign key");
  if (col.unique && !col.pk) parts.push("Unique");
  if (col.notNull) parts.push("NOT NULL");
  if (col.increment) parts.push("Auto-increment");
  if (col.default) parts.push(`Default: ${col.default}`);
  if (col.note) parts.push(col.note);
  return parts.join(" · ");
}

function readableText(bg: string): string {
  const hex = bg.replace("#", "");
  if (hex.length !== 6) return "hsl(var(--foreground))";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0a0a0a" : "#fafafa";
}

export const TableNode = memo(TableNodeImpl);
