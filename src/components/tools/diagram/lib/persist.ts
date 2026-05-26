import type { Edge, Node } from "@xyflow/react";
import type { DiagramNodeData } from "../shapes/shape-node";
import type { DiagramEdgeData } from "./connection-edge";

export interface DiagramSnapshot {
  nodes: Node<DiagramNodeData>[];
  edges: Edge<DiagramEdgeData>[];
}

const STORAGE_KEY = "toolnest:diagram:doc-v1";
const PALETTE_OPEN_KEY = "toolnest:diagram:palette-open";
const PROPS_OPEN_KEY = "toolnest:diagram:props-open";

export function saveDoc(snap: DiagramSnapshot) {
  try {
    const minimal = {
      nodes: snap.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        width: n.width ?? n.measured?.width,
        height: n.height ?? n.measured?.height,
        zIndex: n.zIndex,
        data: n.data,
      })),
      edges: snap.edges.map((e) => ({
        id: e.id,
        type: e.type,
        source: e.source,
        target: e.target,
        sourceHandle: e.sourceHandle,
        targetHandle: e.targetHandle,
        data: e.data,
      })),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(minimal));
  } catch {
    /* ignore quota / private mode */
  }
}

export function loadDoc(): DiagramSnapshot | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    const nodes = parsed.nodes.map((n: Node<DiagramNodeData>) => ({
      ...n,
      type: n.type ?? "shape",
      style: {
        width: n.data?.width ?? n.width,
        height: n.data?.height ?? n.height,
      },
    }));
    return { nodes, edges: parsed.edges };
  } catch {
    return null;
  }
}

export function clearDoc() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function loadPaletteOpen(): boolean {
  try {
    const v = localStorage.getItem(PALETTE_OPEN_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function savePaletteOpen(open: boolean) {
  try {
    localStorage.setItem(PALETTE_OPEN_KEY, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function loadPropsOpen(): boolean {
  try {
    const v = localStorage.getItem(PROPS_OPEN_KEY);
    return v === null ? true : v === "1";
  } catch {
    return true;
  }
}

export function savePropsOpen(open: boolean) {
  try {
    localStorage.setItem(PROPS_OPEN_KEY, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}
