import dagre from "@dagrejs/dagre";
import type { Edge, Node } from "@xyflow/react";
import type { DbTableData } from "./table-node";

const NODE_WIDTH = 260;
const HEADER_HEIGHT = 36;
const ROW_HEIGHT = 28;
const INDEX_BLOCK_BASE = 28;
const INDEX_ROW = 18;

function tableHeight(node: Node<DbTableData>): number {
  let h = HEADER_HEIGHT + ROW_HEIGHT * node.data.columns.length;
  if (node.data.indexes && node.data.indexes.length > 0) {
    h += INDEX_BLOCK_BASE + INDEX_ROW * node.data.indexes.length;
  }
  return h;
}

export function layoutTables(nodes: Node<DbTableData>[], edges: Edge[]): Node<DbTableData>[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "LR", nodesep: 60, ranksep: 110, edgesep: 16, ranker: "tight-tree" });

  for (const node of nodes) {
    g.setNode(node.id, { width: NODE_WIDTH, height: tableHeight(node) });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map((node) => {
    const pos = g.node(node.id);
    const height = tableHeight(node);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - height / 2 },
    };
  });
}
