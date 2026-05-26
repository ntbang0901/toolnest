import { memo, useEffect, useRef, useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  getStraightPath,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

export type EdgeKind =
  | "sequence-flow"
  | "default-flow"
  | "conditional-flow"
  | "message-flow"
  | "association"
  | "data-association";

export type EdgePathStyle = "smoothstep" | "straight" | "bezier";

export interface DiagramEdgeData extends Record<string, unknown> {
  kind: EdgeKind;
  pathStyle: EdgePathStyle;
  label?: string;
  stroke: string;
  strokeWidth: number;
  fontSize: number;
  fontColor: string;
}

const arrowMarkers = (id: string, color: string) => (
  <defs>
    <marker
      id={`arrow-filled-${id}`}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="10"
      markerHeight="10"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10 Z" fill={color} />
    </marker>
    <marker
      id={`arrow-open-${id}`}
      viewBox="0 0 10 10"
      refX="8"
      refY="5"
      markerWidth="11"
      markerHeight="11"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10" fill="none" stroke={color} strokeWidth={1.4} />
    </marker>
    <marker
      id={`circle-start-${id}`}
      viewBox="0 0 10 10"
      refX="5"
      refY="5"
      markerWidth="9"
      markerHeight="9"
      orient="auto"
    >
      <circle cx="5" cy="5" r="3.5" fill="white" stroke={color} strokeWidth={1.2} />
    </marker>
    <marker
      id={`diamond-${id}`}
      viewBox="0 0 12 8"
      refX="11"
      refY="4"
      markerWidth="12"
      markerHeight="8"
      orient="auto-start-reverse"
    >
      <path d="M0,4 L6,0 L12,4 L6,8 Z" fill={color} />
    </marker>
  </defs>
);

interface ConnectionEdgeProps extends EdgeProps {
  data?: DiagramEdgeData;
}

function ConnectionEdgeImpl(props: ConnectionEdgeProps) {
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
    label,
  } = props;

  const kind: EdgeKind = data?.kind ?? "sequence-flow";
  const pathStyle: EdgePathStyle = data?.pathStyle ?? "smoothstep";
  const stroke = data?.stroke ?? "#475569";
  const strokeWidth = data?.strokeWidth ?? 1.5;
  const fontSize = data?.fontSize ?? 11;
  const fontColor = data?.fontColor ?? "#475569";
  const labelText = (data?.label ?? (typeof label === "string" ? label : "")) as string;

  let edgePath = "";
  let labelX = 0;
  let labelY = 0;
  if (pathStyle === "straight") {
    [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });
  } else if (pathStyle === "bezier") {
    [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
    });
  } else {
    [edgePath, labelX, labelY] = getSmoothStepPath({
      sourceX,
      sourceY,
      targetX,
      targetY,
      sourcePosition,
      targetPosition,
      borderRadius: 8,
    });
  }

  let dash: string | undefined;
  let endMarker: string | undefined;
  let startMarker: string | undefined;
  if (kind === "message-flow") {
    dash = "6 4";
    endMarker = `url(#arrow-open-${id})`;
    startMarker = `url(#circle-start-${id})`;
  } else if (kind === "association") {
    dash = "2 4";
    endMarker = undefined;
  } else if (kind === "data-association") {
    dash = "2 4";
    endMarker = `url(#arrow-open-${id})`;
  } else if (kind === "default-flow") {
    endMarker = `url(#arrow-filled-${id})`;
  } else if (kind === "conditional-flow") {
    endMarker = `url(#arrow-filled-${id})`;
    startMarker = `url(#diamond-${id})`;
  } else {
    endMarker = `url(#arrow-filled-${id})`;
  }

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(labelText);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraft(labelText);
  }, [labelText]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== labelText) {
      window.dispatchEvent(
        new CustomEvent("diagram-edge-label-change", {
          detail: { id, label: draft },
        }),
      );
    }
  };

  const showSlash = kind === "default-flow";

  return (
    <>
      {arrowMarkers(id, stroke)}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={endMarker}
        markerStart={startMarker}
        style={{
          stroke,
          strokeWidth: selected ? strokeWidth + 0.8 : strokeWidth,
          strokeDasharray: dash,
          fill: "none",
        }}
      />
      {showSlash && (
        <path
          d={`M${sourceX - 6},${sourceY + 6} L${sourceX + 6},${sourceY - 6}`}
          stroke={stroke}
          strokeWidth={strokeWidth + 0.5}
        />
      )}
      <EdgeLabelRenderer>
        <div
          className={`nodrag nopan absolute ${
            labelText || editing ? "px-1.5 py-0.5" : "h-3 w-3"
          } ${
            editing
              ? "rounded border border-brand bg-background"
              : labelText
                ? "rounded border border-border/40 bg-background/85 backdrop-blur-sm"
                : "rounded-full"
          }`}
          style={{
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          onDoubleClick={() => setEditing(true)}
        >
          {editing ? (
            <input
              ref={inputRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setEditing(false);
                  setDraft(labelText);
                }
                e.stopPropagation();
              }}
              className="w-32 bg-transparent text-center outline-none"
              style={{ fontSize, color: fontColor }}
            />
          ) : labelText ? (
            <span
              className="select-none whitespace-nowrap"
              style={{ fontSize, color: fontColor }}
            >
              {labelText}
            </span>
          ) : null}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const ConnectionEdge = memo(ConnectionEdgeImpl);
