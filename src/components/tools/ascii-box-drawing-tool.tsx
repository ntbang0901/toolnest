import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";

// ─── Types ────────────────────────────────────────────────────────────────────

type Style = "unicode" | "ascii";
type ArrowDir = "right" | "left" | "both" | "none";

interface Node {
  id: string;
  label: string;
  row: number; // 0-indexed row in the layout
}

interface Connection {
  id: string;
  fromId: string;
  toId: string;
  dir: ArrowDir;
}

// ─── Box-drawing character sets ───────────────────────────────────────────────

const CHARS = {
  unicode: {
    tl: "┌", tr: "┐", bl: "└", br: "┘",
    h: "─", v: "│",
    arrowRight: "──▶",
    arrowLeft:  "◀──",
    arrowBoth:  "◀──▶",
    line:       "───",
  },
  ascii: {
    tl: "+", tr: "+", bl: "+", br: "+",
    h: "-", v: "|",
    arrowRight: "-->",
    arrowLeft:  "<--",
    arrowBoth:  "<-->",
    line:       "---",
  },
} as const;

// ─── Unique id helper ─────────────────────────────────────────────────────────

let _counter = 0;
function uid() {
  return `id_${++_counter}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Default state ────────────────────────────────────────────────────────────

const DEFAULT_NODES: Node[] = [
  { id: "n1", label: "Client",   row: 0 },
  { id: "n2", label: "Server",   row: 0 },
  { id: "n3", label: "Database", row: 0 },
];

const DEFAULT_CONNS: Connection[] = [
  { id: "c1", fromId: "n1", toId: "n2", dir: "right" },
  { id: "c2", fromId: "n2", toId: "n3", dir: "right" },
];

// ─── ASCII renderer ───────────────────────────────────────────────────────────

function renderDiagram(nodes: Node[], connections: Connection[], style: Style): string {
  const ch = CHARS[style];

  if (nodes.length === 0) return "";

  // Group nodes by row
  const rowMap = new Map<number, Node[]>();
  for (const node of nodes) {
    if (!rowMap.has(node.row)) rowMap.set(node.row, []);
    rowMap.get(node.row)!.push(node);
  }
  const rowNums = Array.from(rowMap.keys()).sort((a, b) => a - b);

  // Determine box width for each node (label + 2 spaces padding, minimum 8)
  const boxWidth = (label: string) => Math.max(label.length + 4, 8);

  // Build connection lookup: fromId+toId → dir
  // We care about same-row connections rendered inline
  const connLookup = new Map<string, ArrowDir>();
  for (const c of connections) {
    connLookup.set(`${c.fromId}__${c.toId}`, c.dir);
    // also store reverse for "left" arrows
    connLookup.set(`${c.toId}__${c.fromId}`, c.dir);
  }

  function getConnector(fromNode: Node, toNode: Node): string {
    const fwd = connLookup.get(`${fromNode.id}__${toNode.id}`);
    const rev = connLookup.get(`${toNode.id}__${fromNode.id}`);
    const dir = fwd ?? rev;
    if (!dir || dir === "none") return "     ";
    if (fwd !== undefined) {
      // fromNode is the declared "from"
      if (dir === "right") return `  ${ch.arrowRight}  `;
      if (dir === "left")  return `  ${ch.arrowLeft}  `;
      if (dir === "both")  return `  ${ch.arrowBoth}  `;
    } else {
      // toNode is the declared "from" — reverse the direction
      if (dir === "right") return `  ${ch.arrowLeft}  `;
      if (dir === "left")  return `  ${ch.arrowRight}  `;
      if (dir === "both")  return `  ${ch.arrowBoth}  `;
    }
    return `  ${ch.line}  `;
  }

  const lines: string[] = [];

  for (const rowNum of rowNums) {
    const rowNodes = rowMap.get(rowNum)!;
    const widths = rowNodes.map((n) => boxWidth(n.label));

    // Build connectors between adjacent nodes in this row
    const connectors: string[] = [];
    for (let i = 0; i < rowNodes.length - 1; i++) {
      connectors.push(getConnector(rowNodes[i], rowNodes[i + 1]));
    }

    // Top border line
    let topLine = "";
    let midLine = "";
    let botLine = "";

    for (let i = 0; i < rowNodes.length; i++) {
      const w = widths[i];
      const label = rowNodes[i].label;
      const inner = w - 2; // width between the vertical bars

      topLine += ch.tl + ch.h.repeat(inner) + ch.tr;
      // center the label
      const pad = inner - label.length;
      const padL = Math.floor(pad / 2);
      const padR = pad - padL;
      midLine += ch.v + " ".repeat(padL) + label + " ".repeat(padR) + ch.v;
      botLine += ch.bl + ch.h.repeat(inner) + ch.br;

      if (i < connectors.length) {
        const conn = connectors[i];
        // connector must be same height for all 3 lines
        topLine += " ".repeat(conn.length);
        midLine += conn;
        botLine += " ".repeat(conn.length);
      }
    }

    lines.push(topLine, midLine, botLine);

    // Add a blank separator between rows
    if (rowNums.indexOf(rowNum) < rowNums.length - 1) {
      lines.push("");
    }
  }

  return lines.join("\n");
}

// ─── Arrow direction options ──────────────────────────────────────────────────

const ARROW_OPTIONS = [
  { value: "right", label: "→" },
  { value: "left",  label: "←" },
  { value: "both",  label: "↔" },
  { value: "none",  label: "—" },
] as const;

const STYLE_OPTIONS = [
  { value: "unicode", label: "Unicode" },
  { value: "ascii",   label: "ASCII" },
] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function NodeRow({
  node,
  rowCount,
  onLabelChange,
  onRowChange,
  onDelete,
}: {
  node: Node;
  rowCount: number;
  onLabelChange: (id: string, label: string) => void;
  onRowChange: (id: string, row: number) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Input
        value={node.label}
        onChange={(e) => onLabelChange(node.id, e.target.value)}
        placeholder="Label"
        className="flex-1 font-mono text-sm"
        aria-label="Node label"
      />
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-muted-foreground whitespace-nowrap">Row</span>
        <select
          value={node.row}
          onChange={(e) => onRowChange(node.id, Number(e.target.value))}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          aria-label="Row number"
        >
          {Array.from({ length: Math.max(rowCount, node.row + 1) }, (_, i) => (
            <option key={i} value={i}>{i + 1}</option>
          ))}
          <option value={rowCount}>+ New row</option>
        </select>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(node.id)}
        aria-label={`Remove node ${node.label}`}
        className="text-muted-foreground hover:text-destructive shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function ConnectionRow({
  conn,
  nodes,
  onUpdate,
  onDelete,
}: {
  conn: Connection;
  nodes: Node[];
  onUpdate: (id: string, patch: Partial<Connection>) => void;
  onDelete: (id: string) => void;
}) {
  const nodeOptions = nodes.map((n) => (
    <option key={n.id} value={n.id}>{n.label || "(unnamed)"}</option>
  ));

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={conn.fromId}
        onChange={(e) => onUpdate(conn.id, { fromId: e.target.value })}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="From node"
      >
        {nodeOptions}
      </select>
      <SegmentedControl
        options={ARROW_OPTIONS as unknown as { value: ArrowDir; label: string }[]}
        value={conn.dir}
        onChange={(v) => onUpdate(conn.id, { dir: v as ArrowDir })}
        size="sm"
        ariaLabel="Arrow direction"
      />
      <select
        value={conn.toId}
        onChange={(e) => onUpdate(conn.id, { toId: e.target.value })}
        className="h-9 rounded-md border border-input bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="To node"
      >
        {nodeOptions}
      </select>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(conn.id)}
        aria-label="Remove connection"
        className="text-muted-foreground hover:text-destructive shrink-0"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AsciiBoxDrawingTool() {
  const [nodes, setNodes] = useState<Node[]>(DEFAULT_NODES);
  const [connections, setConnections] = useState<Connection[]>(DEFAULT_CONNS);
  const [style, setStyle] = useState<Style>("unicode");

  // Compute how many distinct rows exist
  const rowCount = useMemo(() => {
    if (nodes.length === 0) return 1;
    return Math.max(...nodes.map((n) => n.row)) + 1;
  }, [nodes]);

  const output = useMemo(
    () => renderDiagram(nodes, connections, style),
    [nodes, connections, style],
  );

  // ── Node handlers ──────────────────────────────────────────────────────────

  function addNode() {
    setNodes((prev) => [
      ...prev,
      { id: uid(), label: "Node", row: rowCount - 1 },
    ]);
  }

  function updateLabel(id: string, label: string) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, label } : n)));
  }

  function updateRow(id: string, row: number) {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, row } : n)));
  }

  function deleteNode(id: string) {
    setNodes((prev) => prev.filter((n) => n.id !== id));
    setConnections((prev) =>
      prev.filter((c) => c.fromId !== id && c.toId !== id),
    );
  }

  // ── Connection handlers ────────────────────────────────────────────────────

  function addConnection() {
    if (nodes.length < 2) return;
    setConnections((prev) => [
      ...prev,
      { id: uid(), fromId: nodes[0].id, toId: nodes[1].id, dir: "right" },
    ]);
  }

  function updateConnection(id: string, patch: Partial<Connection>) {
    setConnections((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }

  function deleteConnection(id: string) {
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">

      {/* Style toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Box style</span>
        <SegmentedControl
          options={STYLE_OPTIONS as unknown as { value: Style; label: string }[]}
          value={style}
          onChange={(v) => setStyle(v as Style)}
          ariaLabel="Box drawing style"
        />
      </div>

      {/* Nodes */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Nodes</span>
          <Button variant="outline" size="sm" onClick={addNode}>
            <Plus className="h-4 w-4" />
            Add node
          </Button>
        </div>
        {nodes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No nodes yet. Add one to get started.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {nodes.map((node) => (
              <NodeRow
                key={node.id}
                node={node}
                rowCount={rowCount}
                onLabelChange={updateLabel}
                onRowChange={updateRow}
                onDelete={deleteNode}
              />
            ))}
          </div>
        )}
      </div>

      {/* Connections */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Connections</span>
          <Button
            variant="outline"
            size="sm"
            onClick={addConnection}
            disabled={nodes.length < 2}
          >
            <Plus className="h-4 w-4" />
            Add connection
          </Button>
        </div>
        {connections.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No connections yet.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {connections.map((conn) => (
              <ConnectionRow
                key={conn.id}
                conn={conn}
                nodes={nodes}
                onUpdate={updateConnection}
                onDelete={deleteConnection}
              />
            ))}
          </div>
        )}
      </div>

      {/* Output */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Output</span>
          <CopyButton value={output} label="Copy" />
        </div>
        <pre
          className="rounded-lg border border-border bg-muted/40 p-4 text-sm font-mono leading-snug overflow-x-auto whitespace-pre"
          aria-label="ASCII diagram output"
        >
          {output || <span className="text-muted-foreground">Add nodes to see output.</span>}
        </pre>
      </div>

    </div>
  );
}
