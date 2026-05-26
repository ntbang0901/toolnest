import { useMemo } from "react";
import { Search, Sigma } from "lucide-react";
import type { Node } from "@xyflow/react";
import type { DbTableData } from "../table-node";

interface Props {
  nodes: Node<DbTableData>[];
  selectedTableId?: string | null;
  onSelectTable: (tableId: string) => void;
  onJumpToEditor: (tableId: string) => void;
}

const SCHEMA_PALETTE = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#06b6d4",
  "#8b5cf6",
  "#ec4899",
  "#84cc16",
];

function schemaColor(schema: string | undefined): string {
  const key = schema ?? "public";
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return SCHEMA_PALETTE[h % SCHEMA_PALETTE.length];
}

export function TableListSidebar({
  nodes,
  selectedTableId,
  onSelectTable,
  onJumpToEditor,
}: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, Node<DbTableData>[]>();
    for (const n of nodes) {
      const s = n.data.schema ?? "public";
      const arr = map.get(s) ?? [];
      arr.push(n);
      map.set(s, arr);
    }
    return [...map.entries()].sort(([a], [b]) => {
      if (a === "public") return -1;
      if (b === "public") return 1;
      return a.localeCompare(b);
    });
  }, [nodes]);

  if (!nodes.length) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        No tables yet.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="flex items-center gap-2 border-b border-border bg-card/40 px-3 py-2 text-xs font-medium">
        <Sigma className="h-3.5 w-3.5 text-muted-foreground" />
        <span>Tables</span>
        <span className="ml-auto text-muted-foreground">{nodes.length}</span>
      </div>
      <div className="flex-1 overflow-auto">
        {grouped.map(([schema, tables]) => (
          <div key={schema}>
            <div className="sticky top-0 z-[1] flex items-center gap-2 border-b border-border bg-muted/40 px-3 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground backdrop-blur">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: schemaColor(schema) }}
                aria-hidden
              />
              {schema}
              <span className="ml-auto opacity-60">{tables.length}</span>
            </div>
            <ul>
              {tables.map((n) => {
                const active = selectedTableId === n.id;
                const fkCount = n.data.columns.filter((c) => c.fk).length;
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      onClick={() => onSelectTable(n.id)}
                      onDoubleClick={() => onJumpToEditor(n.id)}
                      title="Click to focus · Double-click to jump to editor"
                      className={`group flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                        active ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                      }`}
                    >
                      <span className="truncate font-mono">{n.data.name}</span>
                      <span className="ml-auto flex shrink-0 items-center gap-2 text-[10px] text-muted-foreground">
                        <span title="Columns">{n.data.columns.length}c</span>
                        {fkCount > 0 && <span title="Foreign keys">{fkCount}fk</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground">
        <Search className="mr-1 inline h-3 w-3" />
        Click to focus · Double-click to jump
      </div>
    </div>
  );
}
