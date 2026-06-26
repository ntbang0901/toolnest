import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { getNodeColor, THEME } from "../renderer/theme";
import type { DslNodeData } from "./graph-to-flow";

const HANDLE_STYLE: React.CSSProperties = {
  width: 6,
  height: 6,
  background: "transparent",
  border: "none",
  minWidth: 0,
  minHeight: 0,
};

/**
 * Render the node's shape as an inline SVG that fills the node box.
 * Geometry ported from renderer/shapes.ts, emitting JSX instead of SVG strings.
 */
function ShapeSvg({ data }: { data: DslNodeData }) {
  const { width, height, shape, colorIndex } = data;
  const color = getNodeColor(colorIndex ?? 0, data.dark);
  const halfW = width / 2;
  const halfH = height / 2;
  const cx = halfW;
  const cy = halfH;
  const sw = THEME.nodeStrokeWidth;

  let shapeEl: React.ReactNode;
  switch (shape) {
    case "diamond": {
      const points = `${cx},${cy - halfH} ${cx + halfW},${cy} ${cx},${cy + halfH} ${cx - halfW},${cy}`;
      shapeEl = (
        <polygon points={points} fill={color.fill} stroke={color.stroke} strokeWidth={sw} />
      );
      break;
    }
    case "circle": {
      const r = Math.max(halfW, halfH) - sw;
      shapeEl = (
        <circle cx={cx} cy={cy} r={r} fill={color.fill} stroke={color.stroke} strokeWidth={sw} />
      );
      break;
    }
    case "stadium":
      shapeEl = (
        <rect
          x={sw}
          y={sw}
          width={width - sw * 2}
          height={height - sw * 2}
          rx={halfH}
          ry={halfH}
          fill={color.fill}
          stroke={color.stroke}
          strokeWidth={sw}
        />
      );
      break;
    case "cylinder": {
      const ry = Math.min(8, height * 0.15);
      const top = sw;
      const bottom = height - sw;
      const left = sw;
      const right = width - sw;
      shapeEl = (
        <>
          <path
            d={`M${left},${top + ry} Q${left},${top} ${cx},${top} Q${right},${top} ${right},${top + ry} L${right},${bottom - ry} Q${right},${bottom} ${cx},${bottom} Q${left},${bottom} ${left},${bottom - ry} Z`}
            fill={color.fill}
            stroke={color.stroke}
            strokeWidth={sw}
          />
          <path
            d={`M${left},${top + ry} Q${left},${top + ry * 2} ${cx},${top + ry * 2} Q${right},${top + ry * 2} ${right},${top + ry}`}
            fill="none"
            stroke={color.stroke}
            strokeWidth={sw * 0.7}
            opacity={0.5}
          />
        </>
      );
      break;
    }
    case "rounded":
      shapeEl = (
        <rect
          x={sw}
          y={sw}
          width={width - sw * 2}
          height={height - sw * 2}
          rx={THEME.nodeRadius * 2}
          ry={THEME.nodeRadius * 2}
          fill={color.fill}
          stroke={color.stroke}
          strokeWidth={sw}
        />
      );
      break;
    case "rect":
    default:
      shapeEl = (
        <rect
          x={sw}
          y={sw}
          width={width - sw * 2}
          height={height - sw * 2}
          rx={THEME.nodeRadius}
          ry={THEME.nodeRadius}
          fill={color.fill}
          stroke={color.stroke}
          strokeWidth={sw}
        />
      );
      break;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ display: "block", overflow: "visible" }}
    >
      {shapeEl}
    </svg>
  );
}

function DslNodeImpl({ data }: NodeProps) {
  const d = data as DslNodeData;
  const color = getNodeColor(d.colorIndex ?? 0, d.dark);
  const lines = d.label.split("\n");

  return (
    <div style={{ position: "relative", width: d.width, height: d.height }}>
      <Handle type="target" position={Position.Top} id="t" style={{ ...HANDLE_STYLE, top: 0 }} />
      <Handle type="target" position={Position.Left} id="l" style={{ ...HANDLE_STYLE, left: 0 }} />
      <Handle type="source" position={Position.Right} id="r" style={{ ...HANDLE_STYLE, right: 0 }} />
      <Handle type="source" position={Position.Bottom} id="b" style={{ ...HANDLE_STYLE, bottom: 0 }} />
      <div style={{ position: "absolute", inset: 0 }}>
        <ShapeSvg data={d} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: color.text,
          fontFamily: THEME.font,
          fontSize: THEME.fontSize,
          fontWeight: THEME.fontWeight,
          textAlign: "center",
          lineHeight: 1.25,
          padding: "0 6px",
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {lines.map((line, i) => (
          <span
            key={i}
            style={
              lines.length > 1 && i === 0
                ? { fontWeight: 600, fontSize: THEME.fontSize + 1 }
                : lines.length > 1
                  ? { fontWeight: 400, fontSize: THEME.fontSize - 1 }
                  : undefined
            }
          >
            {line}
          </span>
        ))}
      </div>
    </div>
  );
}

export const DslNode = memo(DslNodeImpl);
