import { type Edge, type Node } from "@xyflow/react";
import { Bold, RotateCw } from "lucide-react";
import type { DiagramNodeData } from "../shapes/shape-node";
import type { DiagramEdgeData, EdgeKind, EdgePathStyle } from "../lib/connection-edge";
import { PASTEL_FILLS } from "../lib/factories";

interface PropertiesPanelProps {
  selectedNode: Node<DiagramNodeData> | null;
  selectedEdge: Edge<DiagramEdgeData> | null;
  onNodeChange: (id: string, patch: Partial<DiagramNodeData>) => void;
  onEdgeChange: (id: string, patch: Partial<DiagramEdgeData>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

export function PropertiesPanel({
  selectedNode,
  selectedEdge,
  onNodeChange,
  onEdgeChange,
  onDelete,
  onDuplicate,
}: PropertiesPanelProps) {
  if (!selectedNode && !selectedEdge) {
    return (
      <div className="grid h-full place-items-center p-4 text-center text-xs text-muted-foreground">
        <div>
          <p className="font-medium text-foreground/80">Nothing selected</p>
          <p className="mt-1">Click a shape or arrow to edit its style.</p>
          <ul className="mt-3 space-y-0.5 text-left text-[11px]">
            <li>· Drag from palette to add</li>
            <li>· Drag from a handle to connect</li>
            <li>· Double-click to rename</li>
            <li>· Delete / Backspace to remove</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {selectedNode ? "Shape style" : "Connection style"}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {selectedNode && (
          <NodeProperties node={selectedNode} onChange={(patch) => onNodeChange(selectedNode.id, patch)} />
        )}
        {selectedEdge && (
          <EdgeProperties edge={selectedEdge} onChange={(patch) => onEdgeChange(selectedEdge.id, patch)} />
        )}
      </div>
      <div className="flex gap-2 border-t border-border p-2">
        <button
          type="button"
          onClick={onDuplicate}
          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs hover:bg-accent"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex-1 rounded-md border border-destructive/40 bg-destructive/10 px-2 py-1.5 text-xs text-destructive hover:bg-destructive/20"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function NodeProperties({
  node,
  onChange,
}: {
  node: Node<DiagramNodeData>;
  onChange: (patch: Partial<DiagramNodeData>) => void;
}) {
  const d = node.data;
  return (
    <div className="space-y-3 text-xs">
      <Field label="Text">
        <textarea
          value={d.label}
          onChange={(e) => onChange({ label: e.target.value })}
          rows={2}
          className="w-full resize-none rounded-md border border-input bg-background px-2 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="Width">
          <NumberInput value={d.width} min={20} onChange={(v) => onChange({ width: v })} />
        </Field>
        <Field label="Height">
          <NumberInput value={d.height} min={20} onChange={(v) => onChange({ height: v })} />
        </Field>
      </div>

      <Field label="Fill">
        <div className="flex flex-wrap items-center gap-1.5">
          {PASTEL_FILLS.map((c) => (
            <Swatch key={c} color={c} active={d.fill === c} onClick={() => onChange({ fill: c })} />
          ))}
          <ColorInput value={d.fill} onChange={(v) => onChange({ fill: v })} />
        </div>
      </Field>

      <div className="grid grid-cols-[auto_1fr] items-center gap-2">
        <span className="text-muted-foreground">Stroke</span>
        <ColorInput value={d.stroke} onChange={(v) => onChange({ stroke: v })} />
        <span className="text-muted-foreground">Stroke width</span>
        <NumberInput value={d.strokeWidth} min={0} max={10} step={0.5} onChange={(v) => onChange({ strokeWidth: v })} />
        <span className="text-muted-foreground">Dash</span>
        <select
          value={d.strokeDash ?? ""}
          onChange={(e) => onChange({ strokeDash: e.target.value || undefined })}
          className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
        >
          <option value="">Solid</option>
          <option value="6 4">Dashed</option>
          <option value="2 4">Dotted</option>
          <option value="10 4 2 4">Dash-dot</option>
        </select>
      </div>

      <div className="grid grid-cols-[auto_1fr] items-center gap-2">
        <span className="text-muted-foreground">Font size</span>
        <NumberInput value={d.fontSize} min={8} max={48} onChange={(v) => onChange({ fontSize: v })} />
        <span className="text-muted-foreground">Font color</span>
        <ColorInput value={d.fontColor} onChange={(v) => onChange({ fontColor: v })} />
        <span className="text-muted-foreground">Bold</span>
        <button
          type="button"
          onClick={() =>
            onChange({ fontWeight: d.fontWeight === "bold" ? "normal" : "bold" })
          }
          className={`flex h-7 w-9 items-center justify-center rounded-md border ${
            d.fontWeight === "bold" ? "border-brand bg-brand/10" : "border-input bg-background"
          }`}
          aria-pressed={d.fontWeight === "bold"}
        >
          <Bold className="h-3.5 w-3.5" />
        </button>
        <span className="text-muted-foreground">Rotate</span>
        <div className="flex items-center gap-1.5">
          <NumberInput
            value={d.rotation ?? 0}
            min={-360}
            max={360}
            step={15}
            onChange={(v) => onChange({ rotation: v })}
          />
          <button
            type="button"
            onClick={() => onChange({ rotation: ((d.rotation ?? 0) + 90) % 360 })}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-input bg-background hover:bg-accent"
            aria-label="Rotate 90°"
          >
            <RotateCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function EdgeProperties({
  edge,
  onChange,
}: {
  edge: Edge<DiagramEdgeData>;
  onChange: (patch: Partial<DiagramEdgeData>) => void;
}) {
  const d = edge.data!;
  return (
    <div className="space-y-3 text-xs">
      <Field label="Label">
        <input
          value={d.label ?? ""}
          onChange={(e) => onChange({ label: e.target.value })}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
        />
      </Field>
      <Field label="Connection type">
        <select
          value={d.kind}
          onChange={(e) => onChange({ kind: e.target.value as EdgeKind })}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="sequence-flow">Sequence flow (BPMN)</option>
          <option value="default-flow">Default flow</option>
          <option value="conditional-flow">Conditional flow</option>
          <option value="message-flow">Message flow</option>
          <option value="association">Association</option>
          <option value="data-association">Data association</option>
        </select>
      </Field>
      <Field label="Path">
        <select
          value={d.pathStyle}
          onChange={(e) => onChange({ pathStyle: e.target.value as EdgePathStyle })}
          className="h-8 w-full rounded-md border border-input bg-background px-2 text-xs"
        >
          <option value="smoothstep">Orthogonal</option>
          <option value="bezier">Curved</option>
          <option value="straight">Straight</option>
        </select>
      </Field>
      <div className="grid grid-cols-[auto_1fr] items-center gap-2">
        <span className="text-muted-foreground">Stroke</span>
        <ColorInput value={d.stroke} onChange={(v) => onChange({ stroke: v })} />
        <span className="text-muted-foreground">Width</span>
        <NumberInput value={d.strokeWidth} min={0.5} max={6} step={0.5} onChange={(v) => onChange({ strokeWidth: v })} />
        <span className="text-muted-foreground">Font size</span>
        <NumberInput value={d.fontSize} min={8} max={24} onChange={(v) => onChange({ fontSize: v })} />
        <span className="text-muted-foreground">Font color</span>
        <ColorInput value={d.fontColor} onChange={(v) => onChange({ fontColor: v })} />
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (n: number) => void;
}) {
  return (
    <input
      type="number"
      value={Number.isFinite(value) ? value : 0}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (Number.isFinite(n)) onChange(n);
      }}
      className="h-7 w-full rounded-md border border-input bg-background px-1.5 text-xs"
    />
  );
}

function ColorInput({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <input
        type="color"
        value={normalizeHex(value)}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 w-9 cursor-pointer rounded border border-input bg-background"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-7 flex-1 rounded-md border border-input bg-background px-1.5 font-mono text-[11px]"
      />
    </div>
  );
}

function Swatch({ color, active, onClick }: { color: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-5 w-5 rounded-md border ${active ? "ring-2 ring-brand" : "border-border"}`}
      style={{ background: color }}
      aria-label={`Set fill ${color}`}
    />
  );
}

function normalizeHex(c: string): string {
  if (/^#[0-9a-fA-F]{6}$/.test(c)) return c;
  if (/^#[0-9a-fA-F]{3}$/.test(c)) {
    return "#" + c
      .slice(1)
      .split("")
      .map((ch) => ch + ch)
      .join("");
  }
  return "#ffffff";
}
