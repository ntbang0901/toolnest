import type { ShapeDefinition } from "./shape-types";

const taskMarker = (
  type: "user" | "service" | "send" | "receive" | "manual" | "script" | "business-rule" | "loop" | "parallel" | "sequential" | "subprocess" | undefined,
  w: number,
  h: number,
  stroke: string,
) => {
  const x = 6;
  const y = h - 18;
  const size = 12;
  if (!type) return null;
  if (type === "user") {
    return (
      <g transform={`translate(${x},${y})`} fill="none" stroke={stroke} strokeWidth={1.2}>
        <circle cx={size / 2} cy={size * 0.32} r={size * 0.2} />
        <path d={`M${size * 0.1},${size} C${size * 0.1},${size * 0.65} ${size * 0.9},${size * 0.65} ${size * 0.9},${size}`} />
      </g>
    );
  }
  if (type === "service") {
    return (
      <g transform={`translate(${x},${y})`} fill="none" stroke={stroke} strokeWidth={1.1}>
        <path
          d={`M${size * 0.5},${size * 0.05}
              L${size * 0.62},${size * 0.18}
              L${size * 0.85},${size * 0.18}
              L${size * 0.78},${size * 0.4}
              L${size * 0.95},${size * 0.55}
              L${size * 0.78},${size * 0.7}
              L${size * 0.85},${size * 0.92}
              L${size * 0.62},${size * 0.92}
              L${size * 0.5},${size * 1.05}
              L${size * 0.38},${size * 0.92}
              L${size * 0.15},${size * 0.92}
              L${size * 0.22},${size * 0.7}
              L${size * 0.05},${size * 0.55}
              L${size * 0.22},${size * 0.4}
              L${size * 0.15},${size * 0.18}
              L${size * 0.38},${size * 0.18} Z`}
        />
      </g>
    );
  }
  if (type === "send") {
    return (
      <g transform={`translate(${x},${y})`} fill={stroke} stroke={stroke} strokeWidth={1}>
        <rect x={0} y={1} width={size} height={size - 2} fill={stroke} />
        <path d={`M0,1 L${size / 2},${size * 0.55} L${size},1`} fill="white" stroke="white" strokeWidth={1} />
      </g>
    );
  }
  if (type === "receive") {
    return (
      <g transform={`translate(${x},${y})`} fill="none" stroke={stroke} strokeWidth={1.2}>
        <rect x={0} y={1} width={size} height={size - 2} />
        <path d={`M0,1 L${size / 2},${size * 0.55} L${size},1`} />
      </g>
    );
  }
  if (type === "manual") {
    return (
      <g transform={`translate(${x},${y})`} fill="none" stroke={stroke} strokeWidth={1.2}>
        <path d={`M0,${size * 0.7} L${size * 0.5},${size * 0.25} L${size},${size * 0.5} L${size * 0.45},${size * 0.95} Z`} />
      </g>
    );
  }
  if (type === "script") {
    return (
      <g transform={`translate(${x},${y})`} fill="none" stroke={stroke} strokeWidth={1.2}>
        <path d={`M${size * 0.1},0 L${size * 0.85},0 L${size * 0.65},${size * 0.5} L${size * 0.85},${size}
                  L${size * 0.1},${size} L${size * 0.3},${size * 0.5} Z`} />
        <line x1={size * 0.25} y1={size * 0.25} x2={size * 0.55} y2={size * 0.25} />
        <line x1={size * 0.3} y1={size * 0.5} x2={size * 0.6} y2={size * 0.5} />
        <line x1={size * 0.25} y1={size * 0.75} x2={size * 0.55} y2={size * 0.75} />
      </g>
    );
  }
  if (type === "business-rule") {
    return (
      <g transform={`translate(${x},${y})`} fill="none" stroke={stroke} strokeWidth={1.2}>
        <rect x={0} y={0} width={size} height={size} />
        <line x1={0} y1={size * 0.35} x2={size} y2={size * 0.35} />
        <line x1={size * 0.35} y1={0} x2={size * 0.35} y2={size} />
      </g>
    );
  }
  // bottom-center markers (loop / parallel / sequential / subprocess plus)
  if (type === "loop" || type === "parallel" || type === "sequential" || type === "subprocess") {
    const cx = w / 2;
    const cy = h - 9;
    const m = 7;
    if (type === "loop") {
      return (
        <g fill="none" stroke={stroke} strokeWidth={1.2}>
          <path d={`M${cx - m},${cy} A${m},${m} 0 1,1 ${cx + m},${cy - 1}`} />
          <polygon points={`${cx + m - 2},${cy - 4} ${cx + m + 2},${cy - 1} ${cx + m - 2},${cy + 1}`} fill={stroke} />
        </g>
      );
    }
    if (type === "parallel") {
      return (
        <g stroke={stroke} strokeWidth={1.4}>
          <line x1={cx - m + 1} y1={cy - m + 1} x2={cx - m + 1} y2={cy + m - 1} />
          <line x1={cx} y1={cy - m + 1} x2={cx} y2={cy + m - 1} />
          <line x1={cx + m - 1} y1={cy - m + 1} x2={cx + m - 1} y2={cy + m - 1} />
        </g>
      );
    }
    if (type === "sequential") {
      return (
        <g stroke={stroke} strokeWidth={1.4}>
          <line x1={cx - m} y1={cy - m + 1} x2={cx + m} y2={cy - m + 1} />
          <line x1={cx - m} y1={cy} x2={cx + m} y2={cy} />
          <line x1={cx - m} y1={cy + m - 1} x2={cx + m} y2={cy + m - 1} />
        </g>
      );
    }
    return (
      <g fill="none" stroke={stroke} strokeWidth={1.4}>
        <rect x={cx - m} y={cy - m} width={m * 2} height={m * 2} />
        <line x1={cx - m + 3} y1={cy} x2={cx + m - 3} y2={cy} />
        <line x1={cx} y1={cy - m + 3} x2={cx} y2={cy + m - 3} />
      </g>
    );
  }
  return null;
};

interface ActivityOpts {
  id: string;
  name: string;
  marker?: "user" | "service" | "send" | "receive" | "manual" | "script" | "business-rule";
  loop?: "loop" | "parallel" | "sequential" | "subprocess";
  dashed?: boolean;
}

function buildTask({ id, name, marker, loop, dashed }: ActivityOpts): ShapeDefinition {
  return {
    id,
    name,
    category: "bpmn-activities",
    defaultWidth: 130,
    defaultHeight: 80,
    defaultLabel: name,
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <g>
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={10}
          ry={10}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={dashed ? "6 4" : strokeDash}
        />
        {marker && taskMarker(marker, w, h, stroke)}
        {loop && taskMarker(loop, w, h, stroke)}
      </g>
    ),
  };
}

export const bpmnActivityShapes: ShapeDefinition[] = [
  buildTask({ id: "bpmn-task", name: "Task" }),
  buildTask({ id: "bpmn-task-user", name: "User Task", marker: "user" }),
  buildTask({ id: "bpmn-task-service", name: "Service Task", marker: "service" }),
  buildTask({ id: "bpmn-task-send", name: "Send Task", marker: "send" }),
  buildTask({ id: "bpmn-task-receive", name: "Receive Task", marker: "receive" }),
  buildTask({ id: "bpmn-task-manual", name: "Manual Task", marker: "manual" }),
  buildTask({ id: "bpmn-task-script", name: "Script Task", marker: "script" }),
  buildTask({ id: "bpmn-task-rule", name: "Business Rule Task", marker: "business-rule" }),
  buildTask({ id: "bpmn-task-loop", name: "Loop Task", loop: "loop" }),
  buildTask({ id: "bpmn-task-parallel", name: "Parallel MI Task", loop: "parallel" }),
  buildTask({ id: "bpmn-task-sequential", name: "Sequential MI Task", loop: "sequential" }),
  {
    id: "bpmn-subprocess",
    name: "Subprocess",
    category: "bpmn-activities",
    defaultWidth: 160,
    defaultHeight: 90,
    defaultLabel: "Subprocess",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <g>
        <rect
          x={0}
          y={0}
          width={w}
          height={h}
          rx={10}
          ry={10}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
        {taskMarker("subprocess", w, h, stroke)}
      </g>
    ),
  },
  {
    id: "bpmn-call-activity",
    name: "Call Activity",
    category: "bpmn-activities",
    defaultWidth: 150,
    defaultHeight: 80,
    defaultLabel: "Call Activity",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={10}
        ry={10}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth + 1.5}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "bpmn-event-subprocess",
    name: "Event Subprocess",
    category: "bpmn-activities",
    defaultWidth: 180,
    defaultHeight: 100,
    defaultLabel: "Event Subprocess",
    render: ({ w, h, fill, stroke, strokeWidth }) => (
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={10}
        ry={10}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray="6 4"
      />
    ),
  },
  {
    id: "bpmn-data-object",
    name: "Data Object",
    category: "bpmn-activities",
    defaultWidth: 70,
    defaultHeight: 90,
    defaultLabel: "Data",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const fold = 14;
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
          <path d={`M0,0 L${w - fold},0 L${w},${fold} L${w},${h} L0,${h} Z`} />
          <path d={`M${w - fold},0 L${w - fold},${fold} L${w},${fold}`} fill="none" />
        </g>
      );
    },
  },
  {
    id: "bpmn-data-store",
    name: "Data Store",
    category: "bpmn-activities",
    defaultWidth: 90,
    defaultHeight: 70,
    defaultLabel: "Store",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const ry = 10;
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
          <path d={`M0,${ry} A${w / 2},${ry} 0 0,0 ${w},${ry} L${w},${h - ry} A${w / 2},${ry} 0 0,1 0,${h - ry} Z`} />
          <path d={`M0,${ry} A${w / 2},${ry} 0 0,0 ${w},${ry}`} fill="none" />
          <path d={`M0,${ry + 4} A${w / 2},${ry} 0 0,0 ${w},${ry + 4}`} fill="none" />
        </g>
      );
    },
  },
];
