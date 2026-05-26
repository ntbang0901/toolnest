import type { Node, Viewport } from "@xyflow/react";
import type { DbTableData } from "./table-node";

const LAYOUT_PREFIX = "toolnest:db-diagram:layout:";
const VIEWPORT_PREFIX = "toolnest:db-diagram:viewport:";
const SIDEBAR_KEY = "toolnest:db-diagram:sidebar-open";

export function schemaKey(tableIds: string[]): string {
  // Hash a stable signature of the table set so viewport survives small DBML edits
  // (renaming/adding columns) but resets when the table set itself changes.
  const sig = [...tableIds].sort().join("|");
  let h = 5381;
  for (let i = 0; i < sig.length; i++) h = (h * 33) ^ sig.charCodeAt(i);
  return (h >>> 0).toString(36);
}

function layoutKey(dbml: string): string {
  let h = 5381;
  for (let i = 0; i < dbml.length; i++) h = (h * 33) ^ dbml.charCodeAt(i);
  return LAYOUT_PREFIX + (h >>> 0).toString(36);
}

export type LayoutMap = Record<string, { x: number; y: number }>;

export function loadLayout(dbml: string): LayoutMap | null {
  try {
    const raw = localStorage.getItem(layoutKey(dbml));
    if (!raw) return null;
    return JSON.parse(raw) as LayoutMap;
  } catch {
    return null;
  }
}

export function saveLayout(dbml: string, nodes: Node<DbTableData>[]): void {
  try {
    const map: LayoutMap = {};
    for (const n of nodes) map[n.id] = { x: n.position.x, y: n.position.y };
    localStorage.setItem(layoutKey(dbml), JSON.stringify(map));
  } catch {
    /* ignore storage errors */
  }
}

export function applyLayout(nodes: Node<DbTableData>[], map: LayoutMap): Node<DbTableData>[] {
  return nodes.map((n) => {
    const pos = map[n.id];
    if (!pos) return n;
    return { ...n, position: pos };
  });
}

export function clearLayout(dbml: string): void {
  try {
    localStorage.removeItem(layoutKey(dbml));
  } catch {
    /* ignore */
  }
}

export function loadViewport(key: string): Viewport | null {
  try {
    const raw = localStorage.getItem(VIEWPORT_PREFIX + key);
    if (!raw) return null;
    const v = JSON.parse(raw) as Viewport;
    if (
      typeof v?.x !== "number" ||
      typeof v?.y !== "number" ||
      typeof v?.zoom !== "number"
    )
      return null;
    return v;
  } catch {
    return null;
  }
}

export function saveViewport(key: string, viewport: Viewport): void {
  try {
    localStorage.setItem(VIEWPORT_PREFIX + key, JSON.stringify(viewport));
  } catch {
    /* ignore */
  }
}

export function loadSidebarOpen(): boolean | null {
  try {
    const raw = localStorage.getItem(SIDEBAR_KEY);
    if (raw === "1") return true;
    if (raw === "0") return false;
    return null;
  } catch {
    return null;
  }
}

export function saveSidebarOpen(open: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_KEY, open ? "1" : "0");
  } catch {
    /* ignore */
  }
}
