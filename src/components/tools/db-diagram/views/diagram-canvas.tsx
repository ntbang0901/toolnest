import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
  type Viewport,
} from "@xyflow/react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CrowFootDefs, CrowFootEdge, type CrowFootEdgeData } from "../crow-foot-edge";
import { TableNode, type DbTableData } from "../table-node";
import {
  HighlightContext,
  HoverColumnContext,
  type HighlightState,
  type HoverColumn,
} from "../highlight-context";
import {
  loadViewport,
  saveViewport,
  schemaKey,
} from "../persist";

const NODE_TYPES = { table: TableNode };
const EDGE_TYPES = { crowfoot: CrowFootEdge };

interface ContextMenuPayload {
  tableId: string;
  tableName: string;
  schema?: string;
  x: number;
  y: number;
}

interface Props {
  nodes: Node<DbTableData>[];
  edges: Edge<CrowFootEdgeData>[];
  onNodesChange: (nodes: Node<DbTableData>[]) => void;
  onEdgesChange: (edges: Edge<CrowFootEdgeData>[]) => void;
  onPositionPersist?: (nodes: Node<DbTableData>[]) => void;
  focusTable?: string | null;
  onFocusHandled?: () => void;
  onRelayout?: () => void;
  onFit?: () => void;
  onTableContextMenu?: (payload: ContextMenuPayload) => void;
  searchRef?: React.RefObject<HTMLInputElement | null>;
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

function buildNeighborMap(edges: Edge<CrowFootEdgeData>[]) {
  const tableNeighbors = new Map<string, Set<string>>();
  const tableEdges = new Map<string, Set<string>>();
  const colPartners = new Map<string, Array<{ tableId: string; column: string; edgeId: string }>>();

  const add = <K, V>(map: Map<K, Set<V>>, key: K, val: V) => {
    let s = map.get(key);
    if (!s) {
      s = new Set();
      map.set(key, s);
    }
    s.add(val);
  };
  const addArr = <K, V>(map: Map<K, V[]>, key: K, val: V) => {
    let arr = map.get(key);
    if (!arr) {
      arr = [];
      map.set(key, arr);
    }
    arr.push(val);
  };

  for (const e of edges) {
    add(tableNeighbors, e.source, e.target);
    add(tableNeighbors, e.target, e.source);
    add(tableEdges, e.source, e.id);
    add(tableEdges, e.target, e.id);
    const d = e.data;
    if (d) {
      addArr(colPartners, `${e.source}.${d.fromField}`, {
        tableId: e.target,
        column: d.toField,
        edgeId: e.id,
      });
      addArr(colPartners, `${e.target}.${d.toField}`, {
        tableId: e.source,
        column: d.fromField,
        edgeId: e.id,
      });
    }
  }

  return { tableNeighbors, tableEdges, colPartners };
}

export function DiagramCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onPositionPersist,
  focusTable,
  onFocusHandled,
  onRelayout,
  onFit,
  onTableContextMenu,
  searchRef,
}: Props) {
  const [search, setSearch] = useState("");
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);
  const [hovered, setHovered] = useState<HoverColumn | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const localSearchRef = useRef<HTMLInputElement>(null);
  const inputRef = searchRef ?? localSearchRef;
  const { fitView, setViewport, getViewport } = useReactFlow();
  const initializedKeyRef = useRef<string | null>(null);

  const tableIds = useMemo(() => nodes.map((n) => n.id), [nodes]);
  const sKey = useMemo(() => schemaKey(tableIds), [tableIds]);

  const neighbors = useMemo(() => buildNeighborMap(edges), [edges]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set<string>();
    const set = new Set<string>();
    for (const n of nodes) {
      if (n.data.name.toLowerCase().includes(q)) set.add(n.id);
      else if (n.data.columns.some((c) => c.name.toLowerCase().includes(q))) set.add(n.id);
    }
    return set;
  }, [search, nodes]);

  const highlight = useMemo<HighlightState>(() => {
    const activeTables = new Set<string>();
    const activeEdges = new Set<string>();
    const columnHighlights = new Map<string, Set<string>>();

    if (selectedTableId) {
      activeTables.add(selectedTableId);
      const ns = neighbors.tableNeighbors.get(selectedTableId);
      if (ns) for (const n of ns) activeTables.add(n);
      const es = neighbors.tableEdges.get(selectedTableId);
      if (es) for (const e of es) activeEdges.add(e);
    }

    if (hovered) {
      const partners = neighbors.colPartners.get(`${hovered.tableId}.${hovered.column}`);
      if (partners && partners.length) {
        activeTables.add(hovered.tableId);
        let cols = columnHighlights.get(hovered.tableId);
        if (!cols) {
          cols = new Set();
          columnHighlights.set(hovered.tableId, cols);
        }
        cols.add(hovered.column);
        for (const p of partners) {
          activeTables.add(p.tableId);
          activeEdges.add(p.edgeId);
          let pCols = columnHighlights.get(p.tableId);
          if (!pCols) {
            pCols = new Set();
            columnHighlights.set(p.tableId, pCols);
          }
          pCols.add(p.column);
        }
      }
    }

    return {
      activeTables,
      activeEdges,
      columnHighlights,
      hasFocus: activeTables.size > 0,
    };
  }, [selectedTableId, hovered, neighbors]);

  const decoratedNodes = useMemo(() => {
    if (!search) return nodes;
    return nodes.map((n) => ({
      ...n,
      style: matches.has(n.id)
        ? { outline: "2px solid hsl(var(--brand))", outlineOffset: 2 }
        : { opacity: 0.35 },
    }));
  }, [nodes, matches, search]);

  const decoratedEdges = useMemo(() => {
    if (!highlight.hasFocus) return edges;
    return edges.map((e) => ({
      ...e,
      data: {
        ...(e.data as CrowFootEdgeData),
        active: highlight.activeEdges.has(e.id),
        dimmed: !highlight.activeEdges.has(e.id),
      },
    }));
  }, [edges, highlight]);

  // Restore / save viewport per schema-key.
  useEffect(() => {
    if (initializedKeyRef.current === sKey) return;
    initializedKeyRef.current = sKey;
    const saved = loadViewport(sKey);
    if (saved) {
      setViewport(saved, { duration: 0 });
    } else {
      const t = setTimeout(() => fitView({ padding: 0.2, duration: 250 }), 50);
      return () => clearTimeout(t);
    }
  }, [sKey, fitView, setViewport]);

  useEffect(() => {
    if (!focusTable) return;
    const node = nodes.find((n) => n.data.name === focusTable || n.id === focusTable);
    if (!node) return;
    setSelectedTableId(node.id);
    onFocusHandled?.();
  }, [focusTable, nodes, onFocusHandled]);

  const handleNodesChange = useCallback(
    (
      changes: {
        type: string;
        id?: string;
        position?: { x: number; y: number };
        dragging?: boolean;
      }[],
    ) => {
      let next = nodes;
      let positionsChanged = false;
      let dragEnded = false;
      for (const ch of changes) {
        if (ch.type === "position" && ch.position && ch.id) {
          next = next.map((n) => (n.id === ch.id ? { ...n, position: ch.position! } : n));
          positionsChanged = true;
          if (ch.dragging === false) dragEnded = true;
        }
      }
      onNodesChange(next);
      // Persist only when a drag finishes (or for non-drag programmatic moves).
      if (positionsChanged && onPositionPersist && (dragEnded || !changes.some((c) => c.dragging === true))) {
        onPositionPersist(next);
      }
    },
    [nodes, onNodesChange, onPositionPersist],
  );

  const handleNodeClick: NodeMouseHandler = useCallback((_e, node) => {
    setSelectedTableId((cur) => (cur === node.id ? null : node.id));
  }, []);

  const handlePaneClick = useCallback(() => {
    setSelectedTableId(null);
  }, []);

  const handleNodeContextMenu: NodeMouseHandler = useCallback(
    (e, node) => {
      e.preventDefault();
      const data = node.data as DbTableData;
      onTableContextMenu?.({
        tableId: node.id,
        tableName: data.name,
        schema: data.schema,
        x: e.clientX,
        y: e.clientY,
      });
    },
    [onTableContextMenu],
  );

  const handleMoveEnd = useCallback(
    (_e: unknown, viewport: Viewport) => {
      saveViewport(sKey, viewport);
    },
    [sKey],
  );

  // Keyboard shortcuts scoped to canvas focus
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName?.toLowerCase();
      const isTyping = tag === "input" || tag === "textarea" || t?.isContentEditable;
      if (isTyping && !(e.metaKey || e.ctrlKey)) return;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
        return;
      }
      if (isTyping) return;
      if (e.key === "Escape") {
        setSelectedTableId(null);
        setSearch("");
      } else if (e.key === "f" || e.key === "F") {
        onFit?.();
        fitView({ padding: 0.2, duration: 250 });
      } else if (e.key === "r" || e.key === "R") {
        onRelayout?.();
      } else if (e.key === "0") {
        fitView({ padding: 0.2, duration: 250 });
      } else if (e.key === "1") {
        const v = getViewport();
        setViewport({ ...v, zoom: 1 }, { duration: 200 });
      }
    };
    el.addEventListener("keydown", onKeyDown);
    return () => el.removeEventListener("keydown", onKeyDown);
  }, [fitView, getViewport, setViewport, onFit, onRelayout, inputRef]);

  return (
    <HighlightContext.Provider value={highlight}>
      <HoverColumnContext.Provider value={{ hovered, setHovered }}>
        <CrowFootDefs />
        <div className="absolute left-2 top-2 z-10 flex items-center gap-1 rounded-md border border-border bg-card/95 px-2 py-1 shadow-sm backdrop-blur">
          <Search className="h-3.5 w-3.5 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search table or column"
            className="h-6 w-40 border-0 bg-transparent px-1 text-xs shadow-none focus-visible:ring-0"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </button>
          )}
          {search && (
            <span className="text-[10px] text-muted-foreground">
              {matches.size} match{matches.size === 1 ? "" : "es"}
            </span>
          )}
        </div>
        <div
          ref={containerRef}
          tabIndex={0}
          className="absolute inset-0 outline-none"
          aria-label="Diagram canvas"
        >
          <ReactFlow
            nodes={decoratedNodes}
            edges={decoratedEdges}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            minZoom={0.15}
            maxZoom={2.5}
            proOptions={{ hideAttribution: true }}
            selectionOnDrag
            panOnDrag={[1, 2]}
            panOnScroll={false}
            multiSelectionKeyCode="Shift"
            selectionKeyCode={null}
            deleteKeyCode={null}
            onNodesChange={handleNodesChange}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onNodeContextMenu={handleNodeContextMenu}
            onMoveEnd={handleMoveEnd}
            onEdgesChange={(changes) => {
              let next = edges;
              for (const ch of changes) {
                if (ch.type === "select" && "id" in ch && "selected" in ch) {
                  next = next.map((e) =>
                    e.id === ch.id ? { ...e, selected: ch.selected } : e,
                  );
                }
              }
              onEdgesChange(next);
            }}
          >
            <Background gap={20} size={1} color="hsl(var(--border))" />
            <MiniMap
              zoomable
              pannable
              maskColor="hsl(var(--background) / 0.7)"
              nodeColor={(n) => schemaColor((n.data as DbTableData | undefined)?.schema)}
              nodeStrokeColor={(n) =>
                n.selected || highlight.activeTables.has(n.id)
                  ? "hsl(var(--brand))"
                  : "hsl(var(--border))"
              }
              nodeStrokeWidth={2}
              className="!bg-card !border !border-border"
            />
            <Controls className="!border !border-border [&_button]:!border-border [&_button]:!bg-card [&_button:hover]:!bg-accent [&_button]:!fill-foreground" />
          </ReactFlow>
        </div>
      </HoverColumnContext.Provider>
    </HighlightContext.Provider>
  );
}
