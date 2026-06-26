import { memo } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";
import { THEME } from "../renderer/theme";
import type { DslEdgeData } from "./graph-to-flow";

const arrowMarkers = (id: string, color: string) => (
  <defs>
    <marker
      id={`dsl-arrow-${id}`}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth={THEME.arrowSize}
      markerHeight={THEME.arrowSize}
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10 Z" fill={color} />
    </marker>
  </defs>
);

function DslEdgeImpl(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    selected,
    data,
  } = props;

  const d = (data as DslEdgeData | undefined) ?? { dashed: false, dark: false };
  const stroke = d.dark ? THEME.edgeColorDark : THEME.edgeColor;
  const labelText = d.label ?? "";

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      {arrowMarkers(id, stroke)}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#dsl-arrow-${id})`}
        style={{
          stroke,
          strokeWidth: selected ? THEME.edgeWidth + 0.8 : THEME.edgeWidth,
          strokeDasharray: d.dashed ? THEME.edgeDash : undefined,
          fill: "none",
        }}
      />
      {labelText && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: "absolute",
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
              fontFamily: THEME.font,
              fontSize: THEME.fontSize - 1,
              color: stroke,
              background: d.dark ? "#0F172A" : "#F8FAFC",
              padding: "1px 4px",
              borderRadius: 4,
              whiteSpace: "nowrap",
              userSelect: "none",
            }}
          >
            {labelText}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export const DslEdge = memo(DslEdgeImpl);
