import type { ShapeDefinition } from "./shape-types";

const EVENT_SIZE = 56;

const eventCircle = (
  w: number,
  h: number,
  fill: string,
  stroke: string,
  strokeWidth: number,
  strokeDash: string | undefined,
  rings: 1 | 2 | "thick" = 1,
) => {
  const cx = w / 2;
  const cy = h / 2;
  const radius = Math.min(w, h) / 2 - 1;
  if (rings === 2) {
    return (
      <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
        <circle cx={cx} cy={cy} r={radius} />
        <circle cx={cx} cy={cy} r={radius - 4} fill="none" />
      </g>
    );
  }
  if (rings === "thick") {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth + 1.5}
        strokeDasharray={strokeDash}
      />
    );
  }
  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      strokeDasharray={strokeDash}
    />
  );
};

// Inner BPMN event marker glyphs (no fill, just stroke).
const messageGlyph = (cx: number, cy: number, glyphStroke: string) => (
  <g fill="none" stroke={glyphStroke} strokeWidth={1.4}>
    <rect x={cx - 9} y={cy - 6} width={18} height={12} rx={1} fill="white" />
    <path d={`M${cx - 9},${cy - 6} L${cx},${cy + 1} L${cx + 9},${cy - 6}`} />
  </g>
);

const timerGlyph = (cx: number, cy: number, glyphStroke: string) => (
  <g fill="none" stroke={glyphStroke} strokeWidth={1.4}>
    <circle cx={cx} cy={cy} r={9} />
    <line x1={cx} y1={cy - 9} x2={cx} y2={cy - 6} />
    <line x1={cx} y1={cy + 9} x2={cx} y2={cy + 6} />
    <line x1={cx - 9} y1={cy} x2={cx - 6} y2={cy} />
    <line x1={cx + 9} y1={cy} x2={cx + 6} y2={cy} />
    <line x1={cx} y1={cy} x2={cx} y2={cy - 5} />
    <line x1={cx} y1={cy} x2={cx + 4} y2={cy + 4} />
  </g>
);

const errorGlyph = (cx: number, cy: number, glyphStroke: string, glyphFill: string) => (
  <path
    d={`M${cx - 8},${cy + 7} L${cx - 2},${cy - 2} L${cx + 1},${cy + 3} L${cx + 8},${cy - 7} L${cx + 2},${cy + 2} L${cx - 1},${cy - 3} Z`}
    fill={glyphFill}
    stroke={glyphStroke}
    strokeWidth={1}
  />
);

const signalGlyph = (cx: number, cy: number, glyphStroke: string) => (
  <polygon
    points={`${cx},${cy - 8} ${cx + 8},${cy + 6} ${cx - 8},${cy + 6}`}
    fill="none"
    stroke={glyphStroke}
    strokeWidth={1.4}
  />
);

const escalationGlyph = (cx: number, cy: number, glyphStroke: string, glyphFill: string) => (
  <path
    d={`M${cx},${cy - 8} L${cx + 6},${cy + 6} L${cx},${cy + 1} L${cx - 6},${cy + 6} Z`}
    fill={glyphFill}
    stroke={glyphStroke}
    strokeWidth={1}
  />
);

const compensationGlyph = (cx: number, cy: number, glyphStroke: string) => (
  <g fill="none" stroke={glyphStroke} strokeWidth={1.3}>
    <polygon points={`${cx - 8},${cy} ${cx},${cy - 6} ${cx},${cy + 6}`} />
    <polygon points={`${cx},${cy} ${cx + 8},${cy - 6} ${cx + 8},${cy + 6}`} />
  </g>
);

const conditionalGlyph = (cx: number, cy: number, glyphStroke: string) => (
  <g fill="none" stroke={glyphStroke} strokeWidth={1.2}>
    <rect x={cx - 7} y={cy - 7} width={14} height={14} />
    <line x1={cx - 5} y1={cy - 3} x2={cx + 5} y2={cy - 3} />
    <line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} />
    <line x1={cx - 5} y1={cy + 3} x2={cx + 5} y2={cy + 3} />
  </g>
);

const linkGlyph = (cx: number, cy: number, glyphStroke: string) => (
  <polygon
    points={`${cx - 8},${cy - 4} ${cx + 1},${cy - 4} ${cx + 1},${cy - 8} ${cx + 8},${cy} ${cx + 1},${cy + 8} ${cx + 1},${cy + 4} ${cx - 8},${cy + 4}`}
    fill="none"
    stroke={glyphStroke}
    strokeWidth={1.3}
  />
);

const terminateGlyph = (cx: number, cy: number, glyphStroke: string, glyphFill: string) => (
  <circle cx={cx} cy={cy} r={6} fill={glyphFill} stroke={glyphStroke} strokeWidth={1} />
);

type EventVariant =
  | "start"
  | "intermediate"
  | "end"
  | "boundary";

interface EventOpts {
  id: string;
  name: string;
  marker?: "message" | "timer" | "error" | "signal" | "escalation" | "compensation" | "conditional" | "link" | "terminate";
  variant: EventVariant;
}

function buildEventShape({ id, name, marker, variant }: EventOpts): ShapeDefinition {
  return {
    id,
    name,
    category: "bpmn-events",
    defaultWidth: EVENT_SIZE,
    defaultHeight: EVENT_SIZE,
    defaultLabel: "",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      let circle: React.ReactNode;
      if (variant === "intermediate" || variant === "boundary") {
        circle = eventCircle(w, h, fill, stroke, strokeWidth, strokeDash, 2);
      } else if (variant === "end") {
        circle = eventCircle(w, h, fill, stroke, strokeWidth, strokeDash, "thick");
      } else {
        circle = eventCircle(w, h, fill, stroke, strokeWidth, strokeDash, 1);
      }
      const cx = w / 2;
      const cy = h / 2;
      const useFilledMarker = variant === "end";
      const glyphStroke = stroke;
      const glyphFill = useFilledMarker ? stroke : "none";
      let glyph: React.ReactNode = null;
      if (marker === "message") glyph = messageGlyph(cx, cy, glyphStroke);
      else if (marker === "timer") glyph = timerGlyph(cx, cy, glyphStroke);
      else if (marker === "error") glyph = errorGlyph(cx, cy, glyphStroke, glyphFill);
      else if (marker === "signal") glyph = signalGlyph(cx, cy, glyphStroke);
      else if (marker === "escalation") glyph = escalationGlyph(cx, cy, glyphStroke, glyphFill);
      else if (marker === "compensation") glyph = compensationGlyph(cx, cy, glyphStroke);
      else if (marker === "conditional") glyph = conditionalGlyph(cx, cy, glyphStroke);
      else if (marker === "link") glyph = linkGlyph(cx, cy, glyphStroke);
      else if (marker === "terminate") glyph = terminateGlyph(cx, cy, glyphStroke, glyphFill);
      return (
        <g>
          {circle}
          {glyph}
        </g>
      );
    },
  };
}

export const bpmnEventShapes: ShapeDefinition[] = [
  buildEventShape({ id: "bpmn-start", name: "Start", variant: "start" }),
  buildEventShape({ id: "bpmn-start-message", name: "Start · Message", variant: "start", marker: "message" }),
  buildEventShape({ id: "bpmn-start-timer", name: "Start · Timer", variant: "start", marker: "timer" }),
  buildEventShape({ id: "bpmn-start-signal", name: "Start · Signal", variant: "start", marker: "signal" }),
  buildEventShape({ id: "bpmn-start-conditional", name: "Start · Conditional", variant: "start", marker: "conditional" }),
  buildEventShape({ id: "bpmn-intermediate", name: "Intermediate", variant: "intermediate" }),
  buildEventShape({ id: "bpmn-intermediate-message", name: "Intermediate · Message", variant: "intermediate", marker: "message" }),
  buildEventShape({ id: "bpmn-intermediate-timer", name: "Intermediate · Timer", variant: "intermediate", marker: "timer" }),
  buildEventShape({ id: "bpmn-intermediate-signal", name: "Intermediate · Signal", variant: "intermediate", marker: "signal" }),
  buildEventShape({ id: "bpmn-intermediate-link", name: "Intermediate · Link", variant: "intermediate", marker: "link" }),
  buildEventShape({ id: "bpmn-intermediate-error", name: "Intermediate · Error", variant: "intermediate", marker: "error" }),
  buildEventShape({ id: "bpmn-intermediate-escalation", name: "Intermediate · Escalation", variant: "intermediate", marker: "escalation" }),
  buildEventShape({ id: "bpmn-intermediate-compensation", name: "Intermediate · Compensation", variant: "intermediate", marker: "compensation" }),
  buildEventShape({ id: "bpmn-end", name: "End", variant: "end" }),
  buildEventShape({ id: "bpmn-end-message", name: "End · Message", variant: "end", marker: "message" }),
  buildEventShape({ id: "bpmn-end-error", name: "End · Error", variant: "end", marker: "error" }),
  buildEventShape({ id: "bpmn-end-signal", name: "End · Signal", variant: "end", marker: "signal" }),
  buildEventShape({ id: "bpmn-end-escalation", name: "End · Escalation", variant: "end", marker: "escalation" }),
  buildEventShape({ id: "bpmn-end-terminate", name: "End · Terminate", variant: "end", marker: "terminate" }),
];
