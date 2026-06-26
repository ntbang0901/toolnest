import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { LayoutGraph } from "../transpiler/types";
import { getNodeColor } from "../renderer/theme";
import { graphToFlow } from "./graph-to-flow";
import { layoutDslNodes } from "./dagre-layout";
import { DslNode } from "./dsl-node";
import { DslEdge } from "./dsl-edge";

const nodeTypes = { dsl: DslNode };
const edgeTypes = { dsl: DslEdge };

interface FlowCanvasProps {
  graph: LayoutGraph;
  dark: boolean;
  animated?: boolean;
}

function FlowCanvasInner({ graph, dark, animated }: FlowCanvasProps) {
  const { fitView } = useReactFlow();

  const laid = useMemo(() => {
    const { nodes, edges } = graphToFlow(graph, dark);
    const positioned = layoutDslNodes(nodes, edges, graph.direction);
    const styledEdges = edges.map((e) => ({ ...e, animated: animated ?? false }));
    return { nodes: positioned, edges: styledEdges };
  }, [graph, dark, animated]);

  const [nodes, setNodes, onNodesChange] = useNodesState(laid.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(laid.edges);

  // Reseed when the graph (or dark/animated) changes, then refit.
  useEffect(() => {
    setNodes(laid.nodes);
    setEdges(laid.edges);
    const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    return () => clearTimeout(t);
  }, [laid, setNodes, setEdges, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      minZoom={0.1}
      maxZoom={2.5}
      proOptions={{ hideAttribution: true }}
      colorMode={dark ? "dark" : "light"}
    >
      <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
      <Controls showInteractive={false} />
      <MiniMap
        pannable
        zoomable
        nodeColor={(n) => {
          const idx = (n.data as { colorIndex?: number })?.colorIndex ?? 0;
          return getNodeColor(idx, dark).fill;
        }}
        nodeStrokeColor={(n) => {
          const idx = (n.data as { colorIndex?: number })?.colorIndex ?? 0;
          return getNodeColor(idx, dark).stroke;
        }}
      />
    </ReactFlow>
  );
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
