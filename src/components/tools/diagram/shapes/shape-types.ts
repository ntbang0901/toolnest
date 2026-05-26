/**
 * Shape definitions: each shape provides an SVG path/element renderer
 * given a width/height. The shape-renderer wraps it with handles, label,
 * and selection styling so all shapes share identical behavior.
 */

export interface ShapeRenderArgs {
  w: number;
  h: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDash?: string;
}

export interface ShapeDefinition {
  id: string;
  name: string;
  category: ShapeCategory;
  defaultWidth: number;
  defaultHeight: number;
  defaultLabel?: string;
  defaultFill?: string;
  defaultStroke?: string;
  /** Some shapes (pool/lane) want label rotated/positioned differently. */
  labelPosition?: "center" | "top" | "left-rotated";
  /** SVG returned must fit within (0,0) to (w,h). */
  render: (args: ShapeRenderArgs) => React.ReactNode;
}

export type ShapeCategory =
  | "general"
  | "flowchart"
  | "bpmn-events"
  | "bpmn-activities"
  | "bpmn-gateways"
  | "bpmn-swimlane"
  | "uml"
  | "misc";

export const SHAPE_CATEGORIES: { id: ShapeCategory; label: string }[] = [
  { id: "general", label: "General" },
  { id: "flowchart", label: "Flowchart" },
  { id: "bpmn-events", label: "BPMN · Events" },
  { id: "bpmn-activities", label: "BPMN · Activities" },
  { id: "bpmn-gateways", label: "BPMN · Gateways" },
  { id: "bpmn-swimlane", label: "BPMN · Swimlane" },
  { id: "uml", label: "UML" },
  { id: "misc", label: "Misc" },
];
