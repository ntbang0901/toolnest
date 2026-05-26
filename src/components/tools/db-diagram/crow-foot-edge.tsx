import { memo } from "react";
import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";

export type Cardinality = "one" | "many";

export interface CrowFootEdgeData extends Record<string, unknown> {
  sourceCard: Cardinality;
  targetCard: Cardinality;
  fromField: string;
  toField: string;
  active?: boolean;
  dimmed?: boolean;
}

function CrowFootEdgeImpl(props: EdgeProps) {
  const {
    id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
    data, selected, style,
  } = props;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX, sourceY, targetX, targetY,
    sourcePosition, targetPosition,
    borderRadius: 12,
  });

  const d = (data as CrowFootEdgeData | undefined) ?? { sourceCard: "many", targetCard: "one", fromField: "", toField: "" };
  const isActive = selected || d.active === true;
  const stroke = isActive ? "hsl(var(--brand))" : "hsl(var(--brand) / 0.65)";
  const opacity = d.dimmed ? 0.18 : 1;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerStart={`url(#cf-${d.sourceCard}-start)`}
        markerEnd={`url(#cf-${d.targetCard}-end)`}
        style={{
          ...style,
          stroke,
          strokeWidth: isActive ? 2.5 : 1.6,
          opacity,
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            opacity,
          }}
          className={`pointer-events-auto rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition-colors ${
            isActive ? "border-brand text-foreground" : ""
          }`}
        >
          {d.fromField}
          <span className="mx-1 text-muted-foreground/60">→</span>
          {d.toField}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export const CrowFootEdge = memo(CrowFootEdgeImpl);

export function CrowFootDefs() {
  // Markers drawn as SVG defs and registered by id; used via markerStart/End
  return (
    <svg style={{ position: "absolute", width: 0, height: 0 }}>
      <defs>
        {/* "one" — vertical bar */}
        <marker id="cf-one-end" viewBox="-4 -8 16 16" refX="11" refY="0" markerWidth="14" markerHeight="14" orient="auto">
          <line x1="6" y1="-7" x2="6" y2="7" stroke="hsl(var(--brand))" strokeWidth="1.5" />
          <line x1="11" y1="-7" x2="11" y2="7" stroke="hsl(var(--brand))" strokeWidth="1.5" />
        </marker>
        <marker id="cf-one-start" viewBox="-4 -8 16 16" refX="0" refY="0" markerWidth="14" markerHeight="14" orient="auto">
          <line x1="0" y1="-7" x2="0" y2="7" stroke="hsl(var(--brand))" strokeWidth="1.5" />
          <line x1="5" y1="-7" x2="5" y2="7" stroke="hsl(var(--brand))" strokeWidth="1.5" />
        </marker>
        {/* "many" — crow foot */}
        <marker id="cf-many-end" viewBox="-4 -8 18 16" refX="13" refY="0" markerWidth="16" markerHeight="14" orient="auto">
          <line x1="0" y1="0" x2="13" y2="-7" stroke="hsl(var(--brand))" strokeWidth="1.5" />
          <line x1="0" y1="0" x2="13" y2="0" stroke="hsl(var(--brand))" strokeWidth="1.5" />
          <line x1="0" y1="0" x2="13" y2="7" stroke="hsl(var(--brand))" strokeWidth="1.5" />
        </marker>
        <marker id="cf-many-start" viewBox="-4 -8 18 16" refX="0" refY="0" markerWidth="16" markerHeight="14" orient="auto">
          <line x1="13" y1="0" x2="0" y2="-7" stroke="hsl(var(--brand))" strokeWidth="1.5" />
          <line x1="13" y1="0" x2="0" y2="0" stroke="hsl(var(--brand))" strokeWidth="1.5" />
          <line x1="13" y1="0" x2="0" y2="7" stroke="hsl(var(--brand))" strokeWidth="1.5" />
        </marker>
      </defs>
    </svg>
  );
}
