import type { ShapeDefinition } from "./shape-types";

const GATEWAY_SIZE = 60;

const diamondPath = (w: number, h: number) =>
  `${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`;

interface GatewayOpts {
  id: string;
  name: string;
  inner: "exclusive" | "parallel" | "inclusive" | "complex" | "event" | "event-parallel" | "none";
}

function buildGateway({ id, name, inner }: GatewayOpts): ShapeDefinition {
  return {
    id,
    name,
    category: "bpmn-gateways",
    defaultWidth: GATEWAY_SIZE,
    defaultHeight: GATEWAY_SIZE,
    defaultLabel: "",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const cx = w / 2;
      const cy = h / 2;
      const m = Math.min(w, h) * 0.18;
      let glyph: React.ReactNode = null;
      if (inner === "exclusive") {
        glyph = (
          <g stroke={stroke} strokeWidth={2.4} strokeLinecap="round">
            <line x1={cx - m} y1={cy - m} x2={cx + m} y2={cy + m} />
            <line x1={cx - m} y1={cy + m} x2={cx + m} y2={cy - m} />
          </g>
        );
      } else if (inner === "parallel") {
        glyph = (
          <g stroke={stroke} strokeWidth={2.4} strokeLinecap="round">
            <line x1={cx - m} y1={cy} x2={cx + m} y2={cy} />
            <line x1={cx} y1={cy - m} x2={cx} y2={cy + m} />
          </g>
        );
      } else if (inner === "inclusive") {
        glyph = (
          <circle cx={cx} cy={cy} r={m} fill="none" stroke={stroke} strokeWidth={2.2} />
        );
      } else if (inner === "complex") {
        const k = m * 0.7;
        glyph = (
          <g stroke={stroke} strokeWidth={2.2} strokeLinecap="round">
            <line x1={cx - m} y1={cy} x2={cx + m} y2={cy} />
            <line x1={cx} y1={cy - m} x2={cx} y2={cy + m} />
            <line x1={cx - k} y1={cy - k} x2={cx + k} y2={cy + k} />
            <line x1={cx - k} y1={cy + k} x2={cx + k} y2={cy - k} />
          </g>
        );
      } else if (inner === "event") {
        glyph = (
          <g fill="none" stroke={stroke} strokeWidth={1.4}>
            <circle cx={cx} cy={cy} r={m + 4} />
            <circle cx={cx} cy={cy} r={m} />
            <polygon
              points={`${cx},${cy - m * 0.55} ${cx + m * 0.55},${cy} ${cx},${cy + m * 0.55} ${cx - m * 0.55},${cy}`}
              transform={`rotate(45 ${cx} ${cy})`}
            />
          </g>
        );
      } else if (inner === "event-parallel") {
        glyph = (
          <g fill="none" stroke={stroke} strokeWidth={1.6}>
            <circle cx={cx} cy={cy} r={m + 4} />
            <line x1={cx - m} y1={cy} x2={cx + m} y2={cy} />
            <line x1={cx} y1={cy - m} x2={cx} y2={cy + m} />
          </g>
        );
      }
      return (
        <g>
          <polygon
            points={diamondPath(w, h)}
            fill={fill}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDash}
          />
          {glyph}
        </g>
      );
    },
  };
}

export const bpmnGatewayShapes: ShapeDefinition[] = [
  buildGateway({ id: "bpmn-gw", name: "Gateway", inner: "none" }),
  buildGateway({ id: "bpmn-gw-exclusive", name: "Exclusive (XOR)", inner: "exclusive" }),
  buildGateway({ id: "bpmn-gw-parallel", name: "Parallel (AND)", inner: "parallel" }),
  buildGateway({ id: "bpmn-gw-inclusive", name: "Inclusive (OR)", inner: "inclusive" }),
  buildGateway({ id: "bpmn-gw-complex", name: "Complex", inner: "complex" }),
  buildGateway({ id: "bpmn-gw-event", name: "Event-based", inner: "event" }),
  buildGateway({ id: "bpmn-gw-event-parallel", name: "Event-based Parallel", inner: "event-parallel" }),
];

export const bpmnSwimlaneShapes: ShapeDefinition[] = [
  {
    id: "bpmn-pool",
    name: "Pool",
    category: "bpmn-swimlane",
    defaultWidth: 600,
    defaultHeight: 180,
    defaultLabel: "Pool",
    labelPosition: "left-rotated",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const headerW = 28;
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
          <rect x={0} y={0} width={w} height={h} />
          <line x1={headerW} y1={0} x2={headerW} y2={h} />
        </g>
      );
    },
  },
  {
    id: "bpmn-lane",
    name: "Lane",
    category: "bpmn-swimlane",
    defaultWidth: 560,
    defaultHeight: 100,
    defaultLabel: "Lane",
    labelPosition: "left-rotated",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const headerW = 24;
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
          <rect x={0} y={0} width={w} height={h} />
          <line x1={headerW} y1={0} x2={headerW} y2={h} />
        </g>
      );
    },
  },
  {
    id: "bpmn-group",
    name: "Group",
    category: "bpmn-swimlane",
    defaultWidth: 200,
    defaultHeight: 140,
    defaultLabel: "Group",
    labelPosition: "top",
    render: ({ w, h, stroke, strokeWidth }) => (
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={10}
        ry={10}
        fill="transparent"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray="2 4"
      />
    ),
  },
  {
    id: "bpmn-text-annotation",
    name: "Text Annotation",
    category: "bpmn-swimlane",
    defaultWidth: 150,
    defaultHeight: 60,
    defaultLabel: "Annotation",
    render: ({ h, stroke, strokeWidth }) => {
      const t = 10;
      return (
        <g fill="transparent" stroke={stroke} strokeWidth={strokeWidth}>
          <path d={`M${t},0 L0,0 L0,${h} L${t},${h}`} fill="none" />
        </g>
      );
    },
  },
];
