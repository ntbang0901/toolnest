import type { DiagramSnapshot } from "./lib/persist";

export interface DiagramSample {
  id: string;
  name: string;
  description: string;
  snapshot: DiagramSnapshot;
}

const baseNode = (
  id: string,
  shapeId: string,
  x: number,
  y: number,
  label: string,
  w: number,
  h: number,
  extras: Partial<{
    fill: string;
    stroke: string;
    fontSize: number;
    fontColor: string;
    fontWeight: "bold" | "normal";
    strokeDash: string;
    rotation: number;
    zIndex: number;
  }> = {},
) => ({
  id,
  type: "shape",
  position: { x, y },
  width: w,
  height: h,
  zIndex: extras.zIndex ?? 0,
  data: {
    shapeId,
    label,
    fill: extras.fill ?? "#ffffff",
    stroke: extras.stroke ?? "#1f2937",
    strokeWidth: 1.5,
    fontSize: extras.fontSize ?? 13,
    fontColor: extras.fontColor ?? "#1f2937",
    fontWeight: extras.fontWeight ?? "normal",
    strokeDash: extras.strokeDash,
    rotation: extras.rotation,
    width: w,
    height: h,
  },
});

const baseEdge = (
  id: string,
  source: string,
  target: string,
  label = "",
  kind: "sequence-flow" | "default-flow" | "conditional-flow" | "message-flow" | "association" = "sequence-flow",
  sourceHandle = "r",
  targetHandle = "tgt-l",
) => ({
  id,
  type: "connection",
  source,
  target,
  sourceHandle,
  targetHandle,
  data: {
    kind,
    pathStyle: "smoothstep" as const,
    label,
    stroke: "#475569",
    strokeWidth: 1.6,
    fontSize: 11,
    fontColor: "#475569",
  },
});

const orderProcess: DiagramSnapshot = {
  nodes: [
    baseNode("pool-1", "bpmn-pool", 60, 60, "Order Process", 880, 280, {
      fill: "#f8fafc",
      stroke: "#0f172a",
      fontWeight: "bold",
      zIndex: -2,
    }),
    baseNode("start", "bpmn-start", 130, 150, "", 56, 56),
    baseNode("task-validate", "bpmn-task-user", 220, 140, "Validate Order", 130, 80, {
      fill: "#dbeafe",
    }),
    baseNode("gw-stock", "bpmn-gw-exclusive", 380, 152, "in stock?", 60, 60),
    baseNode("task-charge", "bpmn-task-service", 480, 100, "Charge Card", 130, 80, {
      fill: "#dcfce7",
    }),
    baseNode("task-backorder", "bpmn-task-send", 480, 200, "Send Backorder", 130, 80, {
      fill: "#fef3c7",
    }),
    baseNode("task-fulfill", "bpmn-task", 650, 100, "Fulfill", 120, 80),
    baseNode("end-success", "bpmn-end", 800, 110, "", 56, 56),
    baseNode("end-cancel", "bpmn-end-terminate", 660, 215, "", 56, 56),
  ],
  edges: [
    baseEdge("e-1", "start", "task-validate"),
    baseEdge("e-2", "task-validate", "gw-stock"),
    baseEdge("e-3", "gw-stock", "task-charge", "yes", "conditional-flow", "t", "tgt-l"),
    baseEdge("e-4", "gw-stock", "task-backorder", "no", "conditional-flow", "b", "tgt-l"),
    baseEdge("e-5", "task-charge", "task-fulfill"),
    baseEdge("e-6", "task-fulfill", "end-success"),
    baseEdge("e-7", "task-backorder", "end-cancel"),
  ],
};

const loginFlow: DiagramSnapshot = {
  nodes: [
    baseNode("s1", "fc-terminator", 100, 60, "Start", 120, 56),
    baseNode("s2", "fc-data", 100, 160, "Username & Password", 160, 70),
    baseNode("s3", "fc-process", 100, 270, "Hash Password", 140, 70),
    baseNode("s4", "fc-decision", 100, 380, "Match in DB?", 140, 90),
    baseNode("s5", "fc-process", 320, 270, "Issue Session Token", 160, 70, { fill: "#dcfce7" }),
    baseNode("s6", "fc-document", 540, 270, "Audit Log", 140, 80, { fill: "#dbeafe" }),
    baseNode("s7", "fc-terminator", 760, 280, "Done", 120, 56, { fill: "#dcfce7" }),
    baseNode("s8", "fc-process", 320, 410, "Increment Failed Count", 180, 70, { fill: "#fee2e2" }),
    baseNode("s9", "fc-decision", 540, 400, "Locked?", 140, 90),
    baseNode("s10", "fc-terminator", 760, 410, "Reject", 120, 56, { fill: "#fee2e2" }),
  ],
  edges: [
    baseEdge("le-1", "s1", "s2", "", "sequence-flow", "b", "tgt-t"),
    baseEdge("le-2", "s2", "s3", "", "sequence-flow", "b", "tgt-t"),
    baseEdge("le-3", "s3", "s4", "", "sequence-flow", "b", "tgt-t"),
    baseEdge("le-4", "s4", "s5", "yes", "conditional-flow", "t", "tgt-l"),
    baseEdge("le-5", "s5", "s6", ""),
    baseEdge("le-6", "s6", "s7", ""),
    baseEdge("le-7", "s4", "s8", "no", "conditional-flow", "r", "tgt-l"),
    baseEdge("le-8", "s8", "s9", ""),
    baseEdge("le-9", "s9", "s10", ""),
  ],
};

const microservicesArch: DiagramSnapshot = {
  nodes: [
    baseNode("a1", "uml-actor", 80, 160, "User", 60, 110),
    baseNode("a2", "rounded-rect", 200, 180, "Web App", 130, 70, { fill: "#dbeafe" }),
    baseNode("a3", "rounded-rect", 380, 180, "API Gateway", 140, 70, { fill: "#ede9fe" }),
    baseNode("a4", "rounded-rect", 580, 80, "Auth Service", 140, 70, { fill: "#dcfce7" }),
    baseNode("a5", "rounded-rect", 580, 180, "Order Service", 140, 70, { fill: "#dcfce7" }),
    baseNode("a6", "rounded-rect", 580, 280, "Catalog Service", 140, 70, { fill: "#dcfce7" }),
    baseNode("a7", "cylinder", 790, 80, "User DB", 110, 80, { fill: "#fef3c7" }),
    baseNode("a8", "cylinder", 790, 180, "Order DB", 110, 80, { fill: "#fef3c7" }),
    baseNode("a9", "cylinder", 790, 280, "Catalog DB", 110, 80, { fill: "#fef3c7" }),
    baseNode("a10", "cloud", 380, 320, "CDN / Static", 150, 80, { fill: "#f1f5f9" }),
  ],
  edges: [
    baseEdge("ae-1", "a1", "a2", "HTTPS"),
    baseEdge("ae-2", "a2", "a3", "REST"),
    baseEdge("ae-3", "a3", "a4", ""),
    baseEdge("ae-4", "a3", "a5", ""),
    baseEdge("ae-5", "a3", "a6", ""),
    baseEdge("ae-6", "a4", "a7", ""),
    baseEdge("ae-7", "a5", "a8", ""),
    baseEdge("ae-8", "a6", "a9", ""),
    baseEdge("ae-9", "a2", "a10", "", "association"),
  ],
};

export const SAMPLES: DiagramSample[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Empty canvas",
    snapshot: { nodes: [], edges: [] },
  },
  {
    id: "bpmn-order",
    name: "BPMN · Order Process",
    description: "Pool, gateway, user/service tasks, terminate end",
    snapshot: orderProcess as DiagramSnapshot,
  },
  {
    id: "fc-login",
    name: "Flowchart · Login",
    description: "Decision branches with happy/error paths",
    snapshot: loginFlow as DiagramSnapshot,
  },
  {
    id: "arch-microservices",
    name: "Architecture · Microservices",
    description: "Actor, services, databases, CDN",
    snapshot: microservicesArch as DiagramSnapshot,
  },
];
