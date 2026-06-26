import type { Edge, Node } from "@xyflow/react";
import type { LayoutGraph } from "../transpiler/types";
import type { ShapeType } from "../renderer/shapes";

export interface DslNodeData extends Record<string, unknown> {
  label: string;
  shape: ShapeType;
  width: number;
  height: number;
  colorIndex?: number;
  dark: boolean;
}

export interface DslEdgeData extends Record<string, unknown> {
  label?: string;
  dashed: boolean;
  dark: boolean;
}

export interface FlowGraph {
  nodes: Node<DslNodeData>[];
  edges: Edge<DslEdgeData>[];
}

/**
 * Pure converter: LayoutGraph -> React Flow nodes/edges.
 * Positions are left at origin here; dagre-layout assigns them afterwards.
 */
export function graphToFlow(graph: LayoutGraph, dark: boolean): FlowGraph {
  const nodes: Node<DslNodeData>[] = graph.nodes.map((n) => ({
    id: n.id,
    type: "dsl",
    position: { x: 0, y: 0 },
    data: {
      label: n.label,
      shape: n.shape,
      width: n.width,
      height: n.height,
      colorIndex: n.colorIndex,
      dark,
    },
    width: n.width,
    height: n.height,
  }));

  const edges: Edge<DslEdgeData>[] = graph.edges.map((e, i) => ({
    id: `e-${e.from}-${e.to}-${i}`,
    type: "dsl",
    source: e.from,
    target: e.to,
    data: {
      label: e.label,
      dashed: e.style === "dashed",
      dark,
    },
  }));

  return { nodes, edges };
}
