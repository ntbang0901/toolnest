import type { ShapeDefinition } from "./shape-types";

export const flowchartShapes: ShapeDefinition[] = [
  {
    id: "fc-process",
    name: "Process",
    category: "flowchart",
    defaultWidth: 140,
    defaultHeight: 70,
    defaultLabel: "Process",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "fc-terminator",
    name: "Terminator",
    category: "flowchart",
    defaultWidth: 130,
    defaultHeight: 60,
    defaultLabel: "Start / End",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={h / 2}
        ry={h / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "fc-decision",
    name: "Decision",
    category: "flowchart",
    defaultWidth: 130,
    defaultHeight: 90,
    defaultLabel: "Decision",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <polygon
        points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "fc-document",
    name: "Document",
    category: "flowchart",
    defaultWidth: 140,
    defaultHeight: 80,
    defaultLabel: "Document",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const wave = h * 0.15;
      return (
        <path
          d={`M0,0 L${w},0 L${w},${h - wave}
              C ${w * 0.75},${h} ${w * 0.25},${h - 2 * wave} 0,${h - wave} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
      );
    },
  },
  {
    id: "fc-data",
    name: "Data / IO",
    category: "flowchart",
    defaultWidth: 140,
    defaultHeight: 70,
    defaultLabel: "Data",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const skew = Math.min(20, w * 0.18);
      return (
        <polygon
          points={`${skew},0 ${w},0 ${w - skew},${h} 0,${h}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
      );
    },
  },
  {
    id: "fc-manual-input",
    name: "Manual Input",
    category: "flowchart",
    defaultWidth: 140,
    defaultHeight: 70,
    defaultLabel: "Manual Input",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <polygon
        points={`0,${h * 0.25} ${w},0 ${w},${h} 0,${h}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "fc-preparation",
    name: "Preparation",
    category: "flowchart",
    defaultWidth: 140,
    defaultHeight: 70,
    defaultLabel: "Preparation",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const cut = Math.min(22, w * 0.16);
      return (
        <polygon
          points={`${cut},0 ${w - cut},0 ${w},${h / 2} ${w - cut},${h} ${cut},${h} 0,${h / 2}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
      );
    },
  },
  {
    id: "fc-internal-storage",
    name: "Internal Storage",
    category: "flowchart",
    defaultWidth: 140,
    defaultHeight: 80,
    defaultLabel: "Internal\nStorage",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
        <rect x={0} y={0} width={w} height={h} />
        <line x1={14} y1={0} x2={14} y2={h} />
        <line x1={0} y1={14} x2={w} y2={14} />
      </g>
    ),
  },
  {
    id: "fc-stored-data",
    name: "Stored Data",
    category: "flowchart",
    defaultWidth: 140,
    defaultHeight: 70,
    defaultLabel: "Stored Data",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <path
        d={`M${w * 0.12},0
            L${w},0
            C ${w - w * 0.15},${h / 2} ${w - w * 0.15},${h / 2} ${w},${h}
            L${w * 0.12},${h}
            C ${-w * 0.04},${h / 2} ${-w * 0.04},${h / 2} ${w * 0.12},0 Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "fc-display",
    name: "Display",
    category: "flowchart",
    defaultWidth: 150,
    defaultHeight: 70,
    defaultLabel: "Display",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <path
        d={`M${w * 0.15},0
            L${w * 0.85},0
            C ${w},0 ${w},${h} ${w * 0.85},${h}
            L${w * 0.15},${h}
            L0,${h / 2} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "fc-or",
    name: "Or",
    category: "flowchart",
    defaultWidth: 70,
    defaultHeight: 70,
    defaultLabel: "",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
        <circle cx={w / 2} cy={h / 2} r={Math.min(w, h) / 2} />
        <line x1={0} y1={h / 2} x2={w} y2={h / 2} />
        <line x1={w / 2} y1={0} x2={w / 2} y2={h} />
      </g>
    ),
  },
  {
    id: "fc-summing",
    name: "Summing Junction",
    category: "flowchart",
    defaultWidth: 70,
    defaultHeight: 70,
    defaultLabel: "",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const cx = w / 2;
      const cy = h / 2;
      const r = Math.min(w, h) / 2;
      const off = r * Math.SQRT1_2;
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
          <circle cx={cx} cy={cy} r={r} />
          <line x1={cx - off} y1={cy - off} x2={cx + off} y2={cy + off} />
          <line x1={cx - off} y1={cy + off} x2={cx + off} y2={cy - off} />
        </g>
      );
    },
  },
];
