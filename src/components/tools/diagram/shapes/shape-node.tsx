import { memo, useEffect, useRef, useState } from "react";
import { Handle, NodeResizer, Position, type NodeProps } from "@xyflow/react";
import { getShape } from "./shape-registry";

export interface DiagramNodeData extends Record<string, unknown> {
  shapeId: string;
  label: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  strokeDash?: string;
  fontSize: number;
  fontColor: string;
  fontWeight?: "normal" | "bold";
  rotation?: number;
  width: number;
  height: number;
}

const HANDLES: Array<{ id: string; pos: Position; style: React.CSSProperties }> = [
  { id: "t", pos: Position.Top, style: { left: "50%", transform: "translateX(-50%)" } },
  { id: "r", pos: Position.Right, style: { top: "50%", transform: "translateY(-50%)" } },
  { id: "b", pos: Position.Bottom, style: { left: "50%", transform: "translateX(-50%)" } },
  { id: "l", pos: Position.Left, style: { top: "50%", transform: "translateY(-50%)" } },
];

interface ShapeNodeProps extends NodeProps {
  data: DiagramNodeData;
}

function ShapeNodeImpl({ id, data, selected }: ShapeNodeProps) {
  const shape = getShape(data.shapeId);
  const [editing, setEditing] = useState(false);
  const [draftLabel, setDraftLabel] = useState(data.label);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setDraftLabel(data.label);
  }, [data.label]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (!shape) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 px-2 py-1 text-xs">
        unknown shape: {data.shapeId}
      </div>
    );
  }

  const w = data.width || shape.defaultWidth;
  const h = data.height || shape.defaultHeight;
  const labelPos = shape.labelPosition ?? "center";

  const commitLabel = () => {
    setEditing(false);
    if (draftLabel !== data.label) {
      const evt = new CustomEvent("diagram-node-label-change", {
        detail: { id, label: draftLabel },
        bubbles: true,
      });
      window.dispatchEvent(evt);
    }
  };

  const labelStyle: React.CSSProperties = {
    fontSize: `${data.fontSize}px`,
    color: data.fontColor,
    fontWeight: data.fontWeight ?? "normal",
    pointerEvents: editing ? "auto" : "none",
  };

  const renderLabel = () => {
    if (editing) {
      return (
        <textarea
          ref={inputRef}
          value={draftLabel}
          onChange={(e) => setDraftLabel(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              commitLabel();
            }
            if (e.key === "Escape") {
              setEditing(false);
              setDraftLabel(data.label);
            }
            e.stopPropagation();
          }}
          className="absolute inset-0 m-1 resize-none rounded-sm border border-brand bg-background/95 px-1 text-center outline-none"
          style={labelStyle}
        />
      );
    }
    if (!data.label) return null;
    if (labelPos === "left-rotated") {
      return (
        <div
          className="absolute left-0 top-0 flex h-full w-7 items-center justify-center text-center"
          style={labelStyle}
        >
          <span style={{ writingMode: "vertical-rl", transform: "rotate(180deg)", whiteSpace: "nowrap" }}>
            {data.label}
          </span>
        </div>
      );
    }
    if (labelPos === "top") {
      return (
        <div
          className="absolute left-0 right-0 top-1 px-2 text-center"
          style={labelStyle}
        >
          {data.label}
        </div>
      );
    }
    return (
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center px-2 text-center"
        style={labelStyle}
      >
        <span className="whitespace-pre-wrap break-words leading-tight">{data.label}</span>
      </div>
    );
  };

  return (
    <>
      <NodeResizer
        isVisible={selected}
        minWidth={28}
        minHeight={28}
        lineClassName="!border-brand"
        handleClassName="!bg-brand !border-background"
      />
      <div
        className="relative"
        style={{
          width: w,
          height: h,
          transform: data.rotation ? `rotate(${data.rotation}deg)` : undefined,
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          setEditing(true);
        }}
      >
        <svg
          width={w}
          height={h}
          viewBox={`0 0 ${w} ${h}`}
          className="absolute inset-0 overflow-visible"
        >
          {shape.render({
            w,
            h,
            fill: data.fill,
            stroke: data.stroke,
            strokeWidth: data.strokeWidth,
            strokeDash: data.strokeDash,
          })}
        </svg>
        {renderLabel()}
        {HANDLES.map((handle) => (
          <Handle
            key={handle.id}
            id={handle.id}
            position={handle.pos}
            type="source"
            className={`!h-2.5 !w-2.5 !rounded-full !border-2 !border-background !bg-brand transition-opacity ${
              selected ? "opacity-100" : "opacity-0 hover:opacity-100"
            }`}
            style={handle.style}
          />
        ))}
        {HANDLES.map((handle) => (
          <Handle
            key={`tgt-${handle.id}`}
            id={`tgt-${handle.id}`}
            position={handle.pos}
            type="target"
            className="!pointer-events-none !h-0 !w-0 !border-0 !bg-transparent"
            style={handle.style}
          />
        ))}
      </div>
    </>
  );
}

export const ShapeNode = memo(ShapeNodeImpl);
