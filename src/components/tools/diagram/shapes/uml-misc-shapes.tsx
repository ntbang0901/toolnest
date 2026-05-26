import type { ShapeDefinition } from "./shape-types";

export const umlShapes: ShapeDefinition[] = [
  {
    id: "uml-class",
    name: "Class",
    category: "uml",
    defaultWidth: 170,
    defaultHeight: 110,
    defaultLabel: "ClassName\n— attribute: type\n+ method(): type",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const head = 28;
      const mid = head + Math.max(20, (h - head) * 0.45);
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
          <rect x={0} y={0} width={w} height={h} />
          <line x1={0} y1={head} x2={w} y2={head} />
          <line x1={0} y1={mid} x2={w} y2={mid} />
        </g>
      );
    },
  },
  {
    id: "uml-actor",
    name: "Actor",
    category: "uml",
    defaultWidth: 70,
    defaultHeight: 110,
    defaultLabel: "Actor",
    render: ({ w, h, stroke, strokeWidth }) => {
      const cx = w / 2;
      const headR = 10;
      const headY = 14;
      const bodyTop = headY + headR;
      const bodyBot = h - 22;
      return (
        <g fill="none" stroke={stroke} strokeWidth={strokeWidth}>
          <circle cx={cx} cy={headY} r={headR} />
          <line x1={cx} y1={bodyTop} x2={cx} y2={bodyBot} />
          <line x1={cx - 16} y1={bodyTop + 10} x2={cx + 16} y2={bodyTop + 10} />
          <line x1={cx} y1={bodyBot} x2={cx - 14} y2={h} />
          <line x1={cx} y1={bodyBot} x2={cx + 14} y2={h} />
        </g>
      );
    },
  },
  {
    id: "uml-usecase",
    name: "Use Case",
    category: "uml",
    defaultWidth: 130,
    defaultHeight: 70,
    defaultLabel: "Use Case",
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
    id: "uml-package",
    name: "Package",
    category: "uml",
    defaultWidth: 180,
    defaultHeight: 120,
    defaultLabel: "package",
    labelPosition: "top",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const tabW = Math.min(60, w * 0.35);
      const tabH = 14;
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
          <rect x={0} y={0} width={tabW} height={tabH} />
          <rect x={0} y={tabH} width={w} height={h - tabH} />
        </g>
      );
    },
  },
  {
    id: "uml-component",
    name: "Component",
    category: "uml",
    defaultWidth: 150,
    defaultHeight: 80,
    defaultLabel: "Component",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
        <rect x={0} y={0} width={w} height={h} />
        <rect x={-6} y={14} width={16} height={12} />
        <rect x={-6} y={h - 26} width={16} height={12} />
      </g>
    ),
  },
  {
    id: "uml-node",
    name: "Node",
    category: "uml",
    defaultWidth: 150,
    defaultHeight: 100,
    defaultLabel: "Node",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const o = 14;
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
          <polygon points={`0,${o} ${o},0 ${w},0 ${w},${h - o} ${w - o},${h} 0,${h}`} />
          <line x1={0} y1={o} x2={w - o} y2={o} />
          <line x1={w - o} y1={o} x2={w} y2={0} />
          <line x1={w - o} y1={o} x2={w - o} y2={h} />
        </g>
      );
    },
  },
];

export const miscShapes: ShapeDefinition[] = [
  {
    id: "misc-callout",
    name: "Callout",
    category: "misc",
    defaultWidth: 140,
    defaultHeight: 80,
    defaultLabel: "Callout",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const tail = 14;
      return (
        <path
          d={`M0,0 L${w},0 L${w},${h - tail} L${w * 0.4},${h - tail} L${w * 0.25},${h} L${w * 0.3},${h - tail} L0,${h - tail} Z`}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={strokeDash}
        />
      );
    },
  },
  {
    id: "misc-cross",
    name: "Cross",
    category: "misc",
    defaultWidth: 90,
    defaultHeight: 90,
    defaultLabel: "",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const a = w * 0.32;
      const b = h * 0.32;
      const path = `M${a},0 L${w - a},0 L${w - a},${b} L${w},${b} L${w},${h - b}
                    L${w - a},${h - b} L${w - a},${h} L${a},${h} L${a},${h - b}
                    L0,${h - b} L0,${b} L${a},${b} Z`;
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
    id: "misc-heart",
    name: "Heart",
    category: "misc",
    defaultWidth: 100,
    defaultHeight: 90,
    defaultLabel: "",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => (
      <path
        d={`M${w / 2},${h * 0.95}
            C ${w * -0.05},${h * 0.5} ${w * 0.1},${h * -0.05} ${w / 2},${h * 0.3}
            C ${w * 0.9},${h * -0.05} ${w * 1.05},${h * 0.5} ${w / 2},${h * 0.95} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDash}
      />
    ),
  },
  {
    id: "misc-page",
    name: "Page",
    category: "misc",
    defaultWidth: 100,
    defaultHeight: 130,
    defaultLabel: "",
    render: ({ w, h, fill, stroke, strokeWidth, strokeDash }) => {
      const fold = 18;
      return (
        <g fill={fill} stroke={stroke} strokeWidth={strokeWidth} strokeDasharray={strokeDash}>
          <path d={`M0,0 L${w - fold},0 L${w},${fold} L${w},${h} L0,${h} Z`} />
          <path d={`M${w - fold},0 L${w - fold},${fold} L${w},${fold}`} fill="none" />
        </g>
      );
    },
  },
];
