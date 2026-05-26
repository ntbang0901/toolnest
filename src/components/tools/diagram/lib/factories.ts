import type { Edge, Node } from "@xyflow/react";
import type { DiagramNodeData } from "../shapes/shape-node";
import type { DiagramEdgeData } from "./connection-edge";
import { getShape } from "../shapes/shape-registry";

export const DIAGRAM_DEFAULTS = {
  fill: "#ffffff",
  stroke: "#1f2937",
  strokeWidth: 1.5,
  fontSize: 13,
  fontColor: "#1f2937",
} as const;

export const PASTEL_FILLS = [
  "#ffffff",
  "#fee2e2",
  "#fef3c7",
  "#dcfce7",
  "#dbeafe",
  "#ede9fe",
  "#fce7f3",
  "#f1f5f9",
  "#0f172a",
];

export function makeDefaultNode(
  shapeId: string,
  position: { x: number; y: number },
  id: string,
): Node<DiagramNodeData> {
  const shape = getShape(shapeId);
  if (!shape) throw new Error(`Unknown shape: ${shapeId}`);
  const isContainer =
    shape.id === "bpmn-pool" ||
    shape.id === "bpmn-lane" ||
    shape.id === "bpmn-group" ||
    shape.id === "uml-package";
  return {
    id,
    type: "shape",
    position,
    data: {
      shapeId,
      label: shape.defaultLabel ?? "",
      fill: shape.defaultFill ?? DIAGRAM_DEFAULTS.fill,
      stroke: shape.defaultStroke ?? DIAGRAM_DEFAULTS.stroke,
      strokeWidth: DIAGRAM_DEFAULTS.strokeWidth,
      fontSize: DIAGRAM_DEFAULTS.fontSize,
      fontColor: DIAGRAM_DEFAULTS.fontColor,
      width: shape.defaultWidth,
      height: shape.defaultHeight,
    },
    width: shape.defaultWidth,
    height: shape.defaultHeight,
    style: { width: shape.defaultWidth, height: shape.defaultHeight },
    zIndex: isContainer ? -1 : 0,
  };
}

export function makeDefaultEdge(
  source: string,
  target: string,
  sourceHandle: string | null | undefined,
  targetHandle: string | null | undefined,
  id: string,
): Edge<DiagramEdgeData> {
  return {
    id,
    source,
    target,
    sourceHandle: sourceHandle ?? undefined,
    targetHandle: targetHandle ?? undefined,
    type: "connection",
    data: {
      kind: "sequence-flow",
      pathStyle: "smoothstep",
      label: "",
      stroke: "#475569",
      strokeWidth: 1.6,
      fontSize: 11,
      fontColor: "#475569",
    },
  };
}
