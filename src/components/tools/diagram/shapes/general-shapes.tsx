import type { ShapeDefinition } from "./shape-types";

const r = (k: string, p: Record<string, string | number>): string =>
  Object.entries(p)
    .map(([key, val]) => `${key}="${val}"`)
    .join(" ") + ` data-shape="${k}"`;
void r; // keep for future debug

export const generalShapes: ShapeDefinition[] = [
  {
    id: "rectangle",
    name: "Rectangle",
    category: "general",
    defaultWidth: 140,
    defaultHeight: 70,
    defaultLabel: "Rectangle",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "rounded-rect",
    name: "Rounded Rectangle",
    category: "general",
    defaultWidth: 140,
    defaultHeight: 70,
    defaultLabel: "Rounded",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <rect
        x={0}
        y={0}
        width={w}
        height={h}
        rx={14}
        ry={14}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "ellipse",
    name: "Ellipse",
    category: "general",
    defaultWidth: 140,
    defaultHeight: 70,
    defaultLabel: "Ellipse",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <ellipse
        cx={w / 2}
        cy={h / 2}
        rx={w / 2}
        ry={h / 2}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "circle",
    name: "Circle",
    category: "general",
    defaultWidth: 90,
    defaultHeight: 90,
    defaultLabel: "Circle",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const radius = Math.min(w, h) / 2;
      return (
        <circle
          cx={w / 2}
          cy={h / 2}
          r={radius}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
      );
    },
  },
  {
    id: "diamond",
    name: "Diamond",
    category: "general",
    defaultWidth: 130,
    defaultHeight: 90,
    defaultLabel: "Diamond",
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
    id: "triangle",
    name: "Triangle",
    category: "general",
    defaultWidth: 110,
    defaultHeight: 90,
    defaultLabel: "",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <polygon
        points={`${w / 2},0 ${w},${h} 0,${h}`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "parallelogram",
    name: "Parallelogram",
    category: "general",
    defaultWidth: 140,
    defaultHeight: 70,
    defaultLabel: "Parallelogram",
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
    id: "hexagon",
    name: "Hexagon",
    category: "general",
    defaultWidth: 140,
    defaultHeight: 80,
    defaultLabel: "Hexagon",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const ix = Math.min(20, w * 0.18);
      return (
        <polygon
          points={`${ix},0 ${w - ix},0 ${w},${h / 2} ${w - ix},${h} ${ix},${h} 0,${h / 2}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
      );
    },
  },
  {
    id: "cylinder",
    name: "Cylinder",
    category: "general",
    defaultWidth: 110,
    defaultHeight: 90,
    defaultLabel: "Database",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const ry = Math.min(14, h * 0.18);
      return (
        <g
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        >
          <path
            d={`M0,${ry} A${w / 2},${ry} 0 0,0 ${w},${ry} L${w},${h - ry} A${w / 2},${ry} 0 0,1 0,${h - ry} Z`}
          />
          <path
            d={`M0,${ry} A${w / 2},${ry} 0 0,0 ${w},${ry}`}
            fill="none"
          />
        </g>
      );
    },
  },
  {
    id: "cloud",
    name: "Cloud",
    category: "general",
    defaultWidth: 150,
    defaultHeight: 90,
    defaultLabel: "Cloud",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const path = `M ${w * 0.25},${h * 0.85}
        C ${w * 0.05},${h * 0.85} ${w * 0.05},${h * 0.55} ${w * 0.2},${h * 0.5}
        C ${w * 0.18},${h * 0.25} ${w * 0.45},${h * 0.1} ${w * 0.55},${h * 0.3}
        C ${w * 0.65},${h * 0.05} ${w * 0.95},${h * 0.18} ${w * 0.85},${h * 0.45}
        C ${w * 1.0},${h * 0.55} ${w * 0.92},${h * 0.9} ${w * 0.75},${h * 0.85}
        Z`;
      return (
        <path
          d={path}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
      );
    },
  },
  {
    id: "note",
    name: "Note",
    category: "general",
    defaultWidth: 130,
    defaultHeight: 80,
    defaultLabel: "Note",
    defaultFill: "#fef9c3",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const fold = Math.min(16, w * 0.16);
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
          <path d={`M0,0 L${w - fold},0 L${w},${fold} L${w},${h} L0,${h} Z`} />
          <path d={`M${w - fold},0 L${w - fold},${fold} L${w},${fold}`} fill="none" />
        </g>
      );
    },
  },
  {
    id: "arrow-right",
    name: "Arrow",
    category: "general",
    defaultWidth: 140,
    defaultHeight: 60,
    defaultLabel: "",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const tip = Math.min(28, w * 0.25);
      const yMid = h / 2;
      const yIn = h * 0.25;
      const yOut = h * 0.75;
      return (
        <polygon
          points={`0,${yIn} ${w - tip},${yIn} ${w - tip},0 ${w},${yMid} ${w - tip},${h} ${w - tip},${yOut} 0,${yOut}`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
      );
    },
  },
  {
    id: "star",
    name: "Star",
    category: "general",
    defaultWidth: 110,
    defaultHeight: 110,
    defaultLabel: "",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const cx = w / 2;
      const cy = h / 2;
      const outer = Math.min(w, h) / 2;
      const inner = outer * 0.45;
      const pts: string[] = [];
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? outer : inner;
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        pts.push(`${cx + radius * Math.cos(angle)},${cy + radius * Math.sin(angle)}`);
      }
      return (
        <polygon
          points={pts.join(" ")}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
      );
    },
  },
];
