import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import { ShapeNode, type DiagramNodeData } from "../shapes/shape-node";
import { ConnectionEdge, type DiagramEdgeData } from "../lib/connection-edge";
import { makeDefaultEdge, makeDefaultNode } from "../lib/factories";

const NODE_TYPES = { shape: ShapeNode };
const EDGE_TYPES = { connection: ConnectionEdge };

let _id = 0;
const nextId = (prefix: string) => {
  _id += 1;
  return `${prefix}-${Date.now().toString(36)}-${_id.toString(36)}`;
};

interface DiagramCanvasProps {
  nodes: Node<DiagramNodeData>[];
  edges: Edge<DiagramEdgeData>[];
  onNodesChange: (nodes: Node<DiagramNodeData>[]) => void;
  onEdgesChange: (edges: Edge<DiagramEdgeData>[]) => void;
  onCommit: (nodes: Node<DiagramNodeData>[], edges: Edge<DiagramEdgeData>[]) => void;
  onSelectionChange: (sel: OnSelectionChangeParams) => void;
  flowRef: React.RefObject<HTMLDivElement | null>;
}

export function DiagramCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onCommit,
  onSelectionChange,
  flowRef,
}: DiagramCanvasProps) {
  const { screenToFlowPosition } = useReactFlow();
  const dragging = useRef(false);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      const next = applyNodeChanges(changes, nodes) as Node<DiagramNodeData>[];
      onNodesChange(next);

      const isDragStart = changes.some((c) => c.type === "position" && c.dragging === true);
      const isDragEnd = changes.some((c) => c.type === "position" && c.dragging === false);
      const isDimensions = changes.some((c) => c.type === "dimensions" && c.resizing === false);
      const isStructural = changes.some(
        (c) =>
          c.type === "remove" ||
          c.type === "add" ||
          (c.type === "dimensions" && c.resizing === false),
      );

      if (isDragStart) dragging.current = true;
      if (isDragEnd && dragging.current) {
        dragging.current = false;
        // Sync data.width/height with node width/height after resize via NodeResizer
        const synced = next.map((n) => {
          const w = n.width ?? n.measured?.width ?? n.data.width;
          const h = n.height ?? n.measured?.height ?? n.data.height;
          if (w === n.data.width && h === n.data.height) return n;
          return { ...n, data: { ...n.data, width: w!, height: h! } };
        });
        onCommit(synced, edges);
        return;
      }
      if (isDimensions) {
        const synced = next.map((n) => {
          const w = n.width ?? n.measured?.width ?? n.data.width;
          const h = n.height ?? n.measured?.height ?? n.data.height;
          if (w === n.data.width && h === n.data.height) return n;
          return { ...n, data: { ...n.data, width: w!, height: h! } };
        });
        onCommit(synced, edges);
        return;
      }
      if (isStructural) onCommit(next, edges);
    },
    [nodes, edges, onNodesChange, onCommit],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const next = applyEdgeChanges(changes, edges) as Edge<DiagramEdgeData>[];
      onEdgesChange(next);
      const structural = changes.some((c) => c.type === "remove" || c.type === "add");
      if (structural) onCommit(nodes, next);
    },
    [nodes, edges, onEdgesChange, onCommit],
  );

  const handleConnect = useCallback(
    (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      const newEdge = makeDefaultEdge(
        conn.source,
        conn.target,
        conn.sourceHandle,
        conn.targetHandle,
        nextId("e"),
      );
      const next = addEdge(newEdge, edges) as Edge<DiagramEdgeData>[];
      onEdgesChange(next);
      onCommit(nodes, next);
    },
    [nodes, edges, onEdgesChange, onCommit],
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const shapeId = event.dataTransfer.getData("application/x-toolnest-shape");
      if (!shapeId) return;
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      const node = makeDefaultNode(
        shapeId,
        { x: position.x - 50, y: position.y - 30 },
        nextId("n"),
      );
      const next = [...nodes, node];
      onNodesChange(next);
      onCommit(next, edges);
    },
    [nodes, edges, onNodesChange, onCommit, screenToFlowPosition],
  );

  // Listen for inline label edits dispatched by the node component.
  useEffect(() => {
    const onNodeLabel = (e: Event) => {
      const evt = e as CustomEvent<{ id: string; label: string }>;
      const next = nodes.map((n) =>
        n.id === evt.detail.id ? { ...n, data: { ...n.data, label: evt.detail.label } } : n,
      );
      onNodesChange(next);
      onCommit(next, edges);
    };
    const onEdgeLabel = (e: Event) => {
      const evt = e as CustomEvent<{ id: string; label: string }>;
      const next = edges.map((ed) =>
        ed.id === evt.detail.id
          ? { ...ed, data: { ...ed.data!, label: evt.detail.label } }
          : ed,
      );
      onEdgesChange(next);
      onCommit(nodes, next);
    };
    window.addEventListener("diagram-node-label-change", onNodeLabel as EventListener);
    window.addEventListener("diagram-edge-label-change", onEdgeLabel as EventListener);
    return () => {
      window.removeEventListener("diagram-node-label-change", onNodeLabel as EventListener);
      window.removeEventListener("diagram-edge-label-change", onEdgeLabel as EventListener);
    };
  }, [nodes, edges, onNodesChange, onEdgesChange, onCommit]);

  const defaultEdgeOptions = useMemo(() => ({ type: "connection" }), []);

  return (
    <div ref={flowRef} className="h-full w-full" onDragOver={handleDragOver} onDrop={handleDrop}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onSelectionChange={onSelectionChange}
        defaultEdgeOptions={defaultEdgeOptions}
        connectionMode={ConnectionMode.Loose}
        snapToGrid
        snapGrid={[10, 10]}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        proOptions={{ hideAttribution: true }}
        minZoom={0.1}
        maxZoom={3}
      >
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeStrokeWidth={2}
          maskColor="rgba(15,23,42,0.05)"
          className="!bg-background/80"
        />
      </ReactFlow>
    </div>
  );
}

export const generateId = nextId;
