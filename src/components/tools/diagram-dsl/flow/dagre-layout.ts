import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import { THEME } from "../renderer/theme";
import type { DslNodeData } from "./graph-to-flow";

/**
 * Run dagre on React Flow nodes and return positioned copies.
 *
 * Ported from db-diagram/layout.ts: build a dagre graph, set spacing,
 * lay out, then translate dagre's center coordinates into React Flow's
 * top-left positions.
 */
export function layoutDslNodes(
  nodes: Node<DslNodeData>[],
  edges: Edge[],
  direction: "LR" | "TB",
): Node<DslNodeData>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: direction,
    nodesep: THEME.nodesep,
    ranksep: THEME.ranksep,
  });

  for (const node of nodes) {
    const width = node.data.width;
    const height = node.data.height;
    g.setNode(node.id, { width, height });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    const width = node.data.width;
    const height = node.data.height;
    return {
      ...node,
      position: { x: pos.x - width / 2, y: pos.y - height / 2 },
    };
  });
}
