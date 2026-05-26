import { generalShapes } from "./general-shapes";
import { flowchartShapes } from "./flowchart-shapes";
import { bpmnEventShapes } from "./bpmn-events";
import { bpmnActivityShapes } from "./bpmn-activities";
import { bpmnGatewayShapes, bpmnSwimlaneShapes } from "./bpmn-gateways";
import { umlShapes, miscShapes } from "./uml-misc-shapes";
import type { ShapeDefinition, ShapeCategory } from "./shape-types";

export { SHAPE_CATEGORIES } from "./shape-types";
export type { ShapeDefinition, ShapeCategory } from "./shape-types";

export const ALL_SHAPES: ShapeDefinition[] = [
  ...generalShapes,
  ...flowchartShapes,
  ...bpmnEventShapes,
  ...bpmnActivityShapes,
  ...bpmnGatewayShapes,
  ...bpmnSwimlaneShapes,
  ...umlShapes,
  ...miscShapes,
];

const SHAPES_BY_ID = new Map(ALL_SHAPES.map((s) => [s.id, s]));

export function getShape(id: string): ShapeDefinition | undefined {
  return SHAPES_BY_ID.get(id);
}

export function getShapesByCategory(category: ShapeCategory): ShapeDefinition[] {
  return ALL_SHAPES.filter((s) => s.category === category);
}
