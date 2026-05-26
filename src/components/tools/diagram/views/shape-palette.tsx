import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Search } from "lucide-react";
import {
  ALL_SHAPES,
  SHAPE_CATEGORIES,
  type ShapeCategory,
  type ShapeDefinition,
} from "../shapes/shape-registry";
import { Input } from "@/components/ui/input";
import { DIAGRAM_DEFAULTS } from "../lib/factories";

const DEFAULT_OPEN: ShapeCategory[] = ["general", "bpmn-events", "bpmn-activities", "bpmn-gateways"];

export function ShapePalette() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<ShapeCategory>>(new Set(DEFAULT_OPEN));

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    return ALL_SHAPES.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q),
    );
  }, [query]);

  const toggle = (id: ShapeCategory) => {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-border p-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search shapes…"
            className="h-8 pl-7 text-xs"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-2 text-xs">
        {filtered ? (
          <ShapeGrid shapes={filtered} />
        ) : (
          SHAPE_CATEGORIES.map((cat) => {
            const shapes = ALL_SHAPES.filter((s) => s.category === cat.id);
            if (shapes.length === 0) return null;
            const isOpen = open.has(cat.id);
            return (
              <div key={cat.id} className="mb-2">
                <button
                  type="button"
                  onClick={() => toggle(cat.id)}
                  className="flex w-full items-center gap-1.5 rounded-sm px-1 py-1.5 text-left text-[11px] font-medium uppercase tracking-wide text-muted-foreground transition-colors hover:bg-accent/40"
                >
                  {isOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  {cat.label}
                  <span className="ml-auto text-muted-foreground/60">{shapes.length}</span>
                </button>
                {isOpen && <ShapeGrid shapes={shapes} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ShapeGrid({ shapes }: { shapes: ShapeDefinition[] }) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {shapes.map((shape) => (
        <PaletteThumb key={shape.id} shape={shape} />
      ))}
    </div>
  );
}

function PaletteThumb({ shape }: { shape: ShapeDefinition }) {
  const W = 64;
  const H = 44;
  const sw = shape.defaultWidth;
  const sh = shape.defaultHeight;
  const scale = Math.min(W / sw, H / sh) * 0.85;
  const tx = (W - sw * scale) / 2;
  const ty = (H - sh * scale) / 2;
  return (
    <button
      type="button"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/x-toolnest-shape", shape.id);
        e.dataTransfer.effectAllowed = "copy";
      }}
      className="group relative flex h-[68px] cursor-grab flex-col items-center justify-end overflow-hidden rounded-md border border-border bg-card p-1 text-center transition-colors hover:border-brand active:cursor-grabbing"
      title={shape.name}
    >
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="pointer-events-none"
      >
        <g transform={`translate(${tx},${ty}) scale(${scale})`}>
          {shape.render({
            w: sw,
            h: sh,
            fill: shape.defaultFill ?? DIAGRAM_DEFAULTS.fill,
            stroke: shape.defaultStroke ?? DIAGRAM_DEFAULTS.stroke,
            strokeWidth: 1.4,
          })}
        </g>
      </svg>
      <span className="line-clamp-1 w-full text-[9.5px] leading-tight text-muted-foreground group-hover:text-foreground">
        {shape.name}
      </span>
    </button>
  );
}
