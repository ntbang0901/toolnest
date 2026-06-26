import type { ShapeType } from "../renderer/shapes";

export type DiagramType =
  | "flowchart"
  | "sequence"
  | "class"
  | "erd"
  | "gantt"
  | "state"
  | "pie"
  | "mindmap";

export interface LayoutNode {
  id: string;
  label: string;
  shape: ShapeType;
  width: number;
  height: number;
  x?: number;
  y?: number;
  colorIndex?: number;
}

export interface LayoutEdge {
  from: string;
  to: string;
  label?: string;
  style: "solid" | "dashed";
  points?: { x: number; y: number }[];
}

export interface LayoutGraph {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  direction: "LR" | "TB";
  type: DiagramType;
}

export type TranspileResult =
  | { ok: true; graph: LayoutGraph }
  | { ok: true; svg: string; type: DiagramType }
  | { ok: true; mermaid: string; type: DiagramType }
  | { ok: false; error: string; line?: number };
