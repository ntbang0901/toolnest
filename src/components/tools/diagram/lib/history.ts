import { useCallback, useRef, useState } from "react";
import type { DiagramSnapshot } from "./persist";

const MAX_HISTORY = 80;

export interface HistoryApi {
  push: (snap: DiagramSnapshot) => void;
  undo: () => DiagramSnapshot | null;
  redo: () => DiagramSnapshot | null;
  canUndo: boolean;
  canRedo: boolean;
  reset: (snap: DiagramSnapshot) => void;
}

function clone(snap: DiagramSnapshot): DiagramSnapshot {
  return {
    nodes: snap.nodes.map((n) => ({ ...n, data: { ...n.data } })),
    edges: snap.edges.map((e) => ({ ...e, data: e.data ? { ...e.data } : undefined })),
  };
}

export function useDiagramHistory(initial: DiagramSnapshot): HistoryApi {
  const past = useRef<DiagramSnapshot[]>([]);
  const future = useRef<DiagramSnapshot[]>([]);
  const present = useRef<DiagramSnapshot>(clone(initial));
  const [, force] = useState(0);
  const tick = () => force((n) => n + 1);

  const push = useCallback((snap: DiagramSnapshot) => {
    if (snapshotEqual(present.current, snap)) return;
    past.current.push(present.current);
    if (past.current.length > MAX_HISTORY) past.current.shift();
    present.current = clone(snap);
    future.current = [];
    tick();
  }, []);

  const undo = useCallback((): DiagramSnapshot | null => {
    const prev = past.current.pop();
    if (!prev) return null;
    future.current.push(present.current);
    present.current = prev;
    tick();
    return clone(prev);
  }, []);

  const redo = useCallback((): DiagramSnapshot | null => {
    const next = future.current.pop();
    if (!next) return null;
    past.current.push(present.current);
    present.current = next;
    tick();
    return clone(next);
  }, []);

  const reset = useCallback((snap: DiagramSnapshot) => {
    past.current = [];
    future.current = [];
    present.current = clone(snap);
    tick();
  }, []);

  return {
    push,
    undo,
    redo,
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    reset,
  };
}

function snapshotEqual(a: DiagramSnapshot, b: DiagramSnapshot): boolean {
  if (a.nodes.length !== b.nodes.length) return false;
  if (a.edges.length !== b.edges.length) return false;
  for (let i = 0; i < a.nodes.length; i++) {
    const an = a.nodes[i];
    const bn = b.nodes[i];
    if (an.id !== bn.id) return false;
    if (an.position.x !== bn.position.x || an.position.y !== bn.position.y) return false;
    if (JSON.stringify(an.data) !== JSON.stringify(bn.data)) return false;
  }
  for (let i = 0; i < a.edges.length; i++) {
    const ae = a.edges[i];
    const be = b.edges[i];
    if (ae.id !== be.id || ae.source !== be.source || ae.target !== be.target) return false;
    if (JSON.stringify(ae.data) !== JSON.stringify(be.data)) return false;
  }
  return true;
}
