import { useEffect, useRef } from "react";
import { Crosshair, Copy, ArrowRightToLine, Palette, Trash2 } from "lucide-react";

export interface ContextMenuState {
  tableId: string;
  tableName: string;
  schema?: string;
  x: number;
  y: number;
}

interface Props {
  menu: ContextMenuState;
  onClose: () => void;
  onCenter: (tableId: string) => void;
  onCopyBlock: (tableId: string) => void;
  onJumpToEditor: (tableId: string) => void;
  onSetHeaderColor: (tableId: string, color: string | null) => void;
  onDelete: (tableId: string) => void;
}

const SWATCHES = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#475569",
];

export function TableContextMenu({
  menu,
  onClose,
  onCenter,
  onCopyBlock,
  onJumpToEditor,
  onSetHeaderColor,
  onDelete,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  // Clamp inside viewport.
  const style: React.CSSProperties = {
    position: "fixed",
    left: Math.min(menu.x, typeof window !== "undefined" ? window.innerWidth - 240 : menu.x),
    top: Math.min(menu.y, typeof window !== "undefined" ? window.innerHeight - 280 : menu.y),
    zIndex: 60,
  };

  const item =
    "flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-accent hover:text-accent-foreground";

  return (
    <div
      ref={ref}
      style={style}
      className="w-56 overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
      role="menu"
    >
      <div className="border-b border-border bg-muted/40 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {menu.schema && menu.schema !== "public" ? `${menu.schema}.` : ""}
        {menu.tableName}
      </div>
      <button type="button" className={item} onClick={() => onCenter(menu.tableId)}>
        <Crosshair className="h-3.5 w-3.5" /> Center on this
      </button>
      <button type="button" className={item} onClick={() => onCopyBlock(menu.tableId)}>
        <Copy className="h-3.5 w-3.5" /> Copy DBML block
      </button>
      <button type="button" className={item} onClick={() => onJumpToEditor(menu.tableId)}>
        <ArrowRightToLine className="h-3.5 w-3.5" /> Jump to editor line
      </button>
      <div className="border-t border-border px-3 py-2">
        <div className="mb-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          <Palette className="h-3 w-3" /> Header color
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onSetHeaderColor(menu.tableId, c)}
              aria-label={`Set color ${c}`}
              className="h-5 w-5 rounded border border-border transition-transform hover:scale-110"
              style={{ background: c }}
            />
          ))}
          <button
            type="button"
            onClick={() => onSetHeaderColor(menu.tableId, null)}
            className="ml-1 rounded border border-border px-1.5 py-0.5 text-[10px] hover:bg-accent"
          >
            Reset
          </button>
        </div>
      </div>
      <button
        type="button"
        className={`${item} border-t border-border text-destructive hover:bg-destructive/10`}
        onClick={() => onDelete(menu.tableId)}
      >
        <Trash2 className="h-3.5 w-3.5" /> Delete table
      </button>
    </div>
  );
}
