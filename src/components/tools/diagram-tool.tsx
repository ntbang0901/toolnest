import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ShapePalette } from "@/components/tools/diagram/views/shape-palette";
import { PropertiesPanel } from "@/components/tools/diagram/views/properties-panel";
import { DiagramToolbar } from "@/components/tools/diagram/views/diagram-toolbar";
import {
  DiagramCanvas,
  generateId,
} from "@/components/tools/diagram/views/diagram-canvas";
import type { DiagramNodeData } from "@/components/tools/diagram/shapes/shape-node";
import type { DiagramEdgeData } from "@/components/tools/diagram/lib/connection-edge";
import { useDiagramHistory } from "@/components/tools/diagram/lib/history";
import {
  loadDoc,
  loadPaletteOpen,
  loadPropsOpen,
  saveDoc,
  savePaletteOpen,
  savePropsOpen,
  type DiagramSnapshot,
} from "@/components/tools/diagram/lib/persist";
import {
  exportImage,
  exportJson,
  importJson,
} from "@/components/tools/diagram/lib/export";
import { SAMPLES } from "@/components/tools/diagram/samples";

const INITIAL_SAMPLE = SAMPLES.find((s) => s.id === "bpmn-order")!;

export default function DiagramTool() {
  return (
    <ReactFlowProvider>
      <DiagramToolInner />
    </ReactFlowProvider>
  );
}

function DiagramToolInner() {
  const initial = useMemo<DiagramSnapshot>(() => {
    const stored = loadDoc();
    if (stored && (stored.nodes.length > 0 || stored.edges.length > 0)) return stored;
    return INITIAL_SAMPLE.snapshot;
  }, []);

  const [nodes, setNodes] = useState<Node<DiagramNodeData>[]>(initial.nodes as Node<DiagramNodeData>[]);
  const [edges, setEdges] = useState<Edge<DiagramEdgeData>[]>(initial.edges as Edge<DiagramEdgeData>[]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const [selectedEdgeIds, setSelectedEdgeIds] = useState<string[]>([]);
  const [paletteOpen, setPaletteOpen] = useState<boolean>(loadPaletteOpen());
  const [propsOpen, setPropsOpen] = useState<boolean>(loadPropsOpen());
  const [fullscreen, setFullscreen] = useState(false);

  const history = useDiagramHistory(initial);
  const flowRef = useRef<HTMLDivElement>(null);
  const { zoomIn, zoomOut, fitView, getViewport, setViewport } = useReactFlow();

  // Persist sidebar state.
  useEffect(() => savePaletteOpen(paletteOpen), [paletteOpen]);
  useEffect(() => savePropsOpen(propsOpen), [propsOpen]);

  // Autosave (debounced).
  useEffect(() => {
    const t = setTimeout(() => saveDoc({ nodes, edges }), 350);
    return () => clearTimeout(t);
  }, [nodes, edges]);

  const commit = useCallback(
    (n: Node<DiagramNodeData>[], e: Edge<DiagramEdgeData>[]) => {
      history.push({ nodes: n, edges: e });
    },
    [history],
  );

  const handleSelectionChange = useCallback((sel: OnSelectionChangeParams) => {
    setSelectedNodeIds(sel.nodes.map((n) => n.id));
    setSelectedEdgeIds(sel.edges.map((e) => e.id));
  }, []);

  const selectedNode = useMemo(
    () => (selectedNodeIds.length === 1 ? nodes.find((n) => n.id === selectedNodeIds[0]) ?? null : null),
    [selectedNodeIds, nodes],
  );
  const selectedEdge = useMemo(
    () => (selectedEdgeIds.length === 1 && selectedNodeIds.length === 0
      ? edges.find((e) => e.id === selectedEdgeIds[0]) ?? null
      : null),
    [selectedEdgeIds, selectedNodeIds, edges],
  );
  const hasSelection = selectedNodeIds.length > 0 || selectedEdgeIds.length > 0;

  const updateNodeData = useCallback(
    (id: string, patch: Partial<DiagramNodeData>) => {
      const next = nodes.map((n) => {
        if (n.id !== id) return n;
        const data = { ...n.data, ...patch };
        const newNode: Node<DiagramNodeData> = { ...n, data };
        if (patch.width !== undefined) {
          newNode.width = patch.width;
          newNode.style = { ...(newNode.style ?? {}), width: patch.width };
        }
        if (patch.height !== undefined) {
          newNode.height = patch.height;
          newNode.style = { ...(newNode.style ?? {}), height: patch.height };
        }
        return newNode;
      });
      setNodes(next);
      commit(next, edges);
    },
    [nodes, edges, commit],
  );

  const updateEdgeData = useCallback(
    (id: string, patch: Partial<DiagramEdgeData>) => {
      const next = edges.map((e) =>
        e.id === id ? { ...e, data: { ...e.data!, ...patch } } : e,
      );
      setEdges(next);
      commit(nodes, next);
    },
    [nodes, edges, commit],
  );

  const handleDuplicate = useCallback(() => {
    if (selectedNodeIds.length === 0) return;
    const idMap = new Map<string, string>();
    const dup: Node<DiagramNodeData>[] = selectedNodeIds.map((id) => {
      const orig = nodes.find((n) => n.id === id);
      if (!orig) return null as never;
      const newId = generateId("n");
      idMap.set(id, newId);
      return {
        ...orig,
        id: newId,
        position: { x: orig.position.x + 30, y: orig.position.y + 30 },
        selected: true,
        data: { ...orig.data },
      };
    }).filter(Boolean);
    const dupEdges: Edge<DiagramEdgeData>[] = edges
      .filter((e) => idMap.has(e.source) && idMap.has(e.target))
      .map((e) => ({
        ...e,
        id: generateId("e"),
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
        data: e.data ? { ...e.data } : undefined,
      }));
    const cleared = nodes.map((n) => ({ ...n, selected: false }));
    const nextNodes = [...cleared, ...dup];
    const nextEdges = [...edges, ...dupEdges];
    setNodes(nextNodes);
    setEdges(nextEdges);
    commit(nextNodes, nextEdges);
    setSelectedNodeIds(dup.map((n) => n.id));
    setSelectedEdgeIds([]);
  }, [nodes, edges, selectedNodeIds, commit]);

  const handleDelete = useCallback(() => {
    if (!hasSelection) return;
    const nodeIds = new Set(selectedNodeIds);
    const edgeIds = new Set(selectedEdgeIds);
    const nextNodes = nodes.filter((n) => !nodeIds.has(n.id));
    const nextEdges = edges.filter(
      (e) => !edgeIds.has(e.id) && !nodeIds.has(e.source) && !nodeIds.has(e.target),
    );
    setNodes(nextNodes);
    setEdges(nextEdges);
    commit(nextNodes, nextEdges);
    setSelectedNodeIds([]);
    setSelectedEdgeIds([]);
  }, [nodes, edges, selectedNodeIds, selectedEdgeIds, hasSelection, commit]);

  const handleUndo = useCallback(() => {
    const prev = history.undo();
    if (!prev) return;
    setNodes(prev.nodes as Node<DiagramNodeData>[]);
    setEdges(prev.edges as Edge<DiagramEdgeData>[]);
  }, [history]);

  const handleRedo = useCallback(() => {
    const nxt = history.redo();
    if (!nxt) return;
    setNodes(nxt.nodes as Node<DiagramNodeData>[]);
    setEdges(nxt.edges as Edge<DiagramEdgeData>[]);
  }, [history]);

  const replaceDoc = useCallback(
    (snap: DiagramSnapshot) => {
      const ns = snap.nodes.map((n) => ({
        ...n,
        type: n.type ?? "shape",
        style: { width: n.data?.width ?? n.width, height: n.data?.height ?? n.height },
      })) as Node<DiagramNodeData>[];
      setNodes(ns);
      setEdges(snap.edges as Edge<DiagramEdgeData>[]);
      history.reset({ nodes: ns, edges: snap.edges as Edge<DiagramEdgeData>[] });
      setSelectedNodeIds([]);
      setSelectedEdgeIds([]);
      setTimeout(() => fitView({ padding: 0.2, duration: 250 }), 30);
    },
    [history, fitView],
  );

  const handleClear = useCallback(() => replaceDoc({ nodes: [], edges: [] }), [replaceDoc]);
  const handleLoadSample = useCallback(
    (id: string) => {
      const sample = SAMPLES.find((s) => s.id === id);
      if (sample) replaceDoc(sample.snapshot);
    },
    [replaceDoc],
  );

  const handleImportJson = useCallback(
    async (file: File) => {
      const snap = await importJson(file);
      if (!snap) {
        alert("Invalid diagram JSON.");
        return;
      }
      replaceDoc(snap);
    },
    [replaceDoc],
  );

  const handleExportPng = useCallback(async () => {
    const root = flowRef.current?.querySelector(".react-flow") as HTMLElement | null;
    if (!root) return;
    try {
      await exportImage(root, "png");
    } catch (err) {
      alert(`PNG export failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }, []);

  const handleExportSvg = useCallback(async () => {
    const root = flowRef.current?.querySelector(".react-flow") as HTMLElement | null;
    if (!root) return;
    try {
      await exportImage(root, "svg");
    } catch (err) {
      alert(`SVG export failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }, []);

  const handleExportJson = useCallback(() => {
    exportJson({ nodes, edges });
  }, [nodes, edges]);

  // Keyboard shortcuts.
  useEffect(() => {
    const isEditableTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return true;
      return false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
        return;
      }
      if ((meta && e.key.toLowerCase() === "z" && e.shiftKey) || (meta && e.key.toLowerCase() === "y")) {
        e.preventDefault();
        handleRedo();
        return;
      }
      if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        handleDuplicate();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (hasSelection) {
          e.preventDefault();
          handleDelete();
        }
        return;
      }
      if (e.key === "f" || e.key === "F") {
        if (!meta) {
          fitView({ padding: 0.2, duration: 250 });
        }
      }
      if (e.key === "Escape") {
        setSelectedNodeIds([]);
        setSelectedEdgeIds([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleUndo, handleRedo, handleDuplicate, handleDelete, hasSelection, fitView]);

  // Save viewport too — restore on load.
  useEffect(() => {
    const raw = localStorage.getItem("toolnest:diagram:viewport");
    if (raw) {
      try {
        const vp = JSON.parse(raw);
        setTimeout(() => setViewport(vp), 60);
      } catch {
        /* ignore */
      }
    }
    const t = setInterval(() => {
      try {
        localStorage.setItem("toolnest:diagram:viewport", JSON.stringify(getViewport()));
      } catch {
        /* ignore */
      }
    }, 1500);
    return () => clearInterval(t);
  }, [getViewport, setViewport]);

  const containerClass = fullscreen
    ? "fixed inset-0 z-50 flex flex-col bg-background"
    : "flex h-[640px] flex-col overflow-hidden rounded-md border border-border bg-card lg:h-[760px]";

  return (
    <div className={containerClass}>
      <DiagramToolbar
        paletteOpen={paletteOpen}
        propsOpen={propsOpen}
        fullscreen={fullscreen}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        hasSelection={hasSelection}
        nodeCount={nodes.length}
        edgeCount={edges.length}
        onTogglePalette={() => setPaletteOpen((v) => !v)}
        onToggleProps={() => setPropsOpen((v) => !v)}
        onToggleFullscreen={() => setFullscreen((v) => !v)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onDuplicate={handleDuplicate}
        onDelete={handleDelete}
        onZoomIn={() => zoomIn({ duration: 200 })}
        onZoomOut={() => zoomOut({ duration: 200 })}
        onFit={() => fitView({ padding: 0.2, duration: 250 })}
        onClear={handleClear}
        onExportPng={handleExportPng}
        onExportSvg={handleExportSvg}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onLoadSample={handleLoadSample}
      />
      <div className="flex flex-1 overflow-hidden">
        {paletteOpen && (
          <aside className="w-[230px] shrink-0 border-r border-border bg-background/50">
            <ShapePalette />
          </aside>
        )}
        <main className="relative flex-1 overflow-hidden">
          <DiagramCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={setNodes}
            onEdgesChange={setEdges}
            onCommit={commit}
            onSelectionChange={handleSelectionChange}
            flowRef={flowRef}
          />
        </main>
        {propsOpen && (
          <aside className="w-[260px] shrink-0 border-l border-border bg-background/50">
            <PropertiesPanel
              selectedNode={selectedNode}
              selectedEdge={selectedEdge}
              onNodeChange={updateNodeData}
              onEdgeChange={updateEdgeData}
              onDelete={handleDelete}
              onDuplicate={handleDuplicate}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
