import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";

type Type = "linear" | "radial";

interface Stop {
  id: string;
  color: string;
  position: number;
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULTS: Stop[] = [
  { id: makeId(), color: "#14b8a6", position: 0 },
  { id: makeId(), color: "#0f172a", position: 100 },
];

export default function GradientBuilderTool() {
  const [type, setType] = useState<Type>("linear");
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState<Stop[]>(DEFAULTS);

  const css = useMemo(() => {
    const sorted = stops.slice().sort((a, b) => a.position - b.position);
    const stopList = sorted.map((s) => `${s.color} ${s.position}%`).join(", ");
    return type === "linear"
      ? `linear-gradient(${angle}deg, ${stopList})`
      : `radial-gradient(circle, ${stopList})`;
  }, [type, angle, stops]);

  const update = (id: string, patch: Partial<Stop>) =>
    setStops((s) => s.map((stop) => (stop.id === id ? { ...stop, ...patch } : stop)));

  const remove = (id: string) =>
    setStops((s) => (s.length > 2 ? s.filter((stop) => stop.id !== id) : s));

  const add = () =>
    setStops((s) => [...s, { id: makeId(), color: "#ffffff", position: 50 }]);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="h-44 rounded-lg border border-border"
        style={{ backgroundImage: css }}
        aria-label="Gradient preview"
      />

      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Type"
          value={type}
          onChange={(v) => setType(v as Type)}
          options={[
            { value: "linear", label: "Linear" },
            { value: "radial", label: "Radial" },
          ]}
        />
        {type === "linear" && (
          <div className="flex items-center gap-2">
            <label className="text-sm" htmlFor="grad-angle">Angle</label>
            <input
              id="grad-angle"
              type="range"
              min={0}
              max={360}
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              className="w-32"
            />
            <span className="w-12 font-mono text-xs">{angle}°</span>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4" /> Stop
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        {stops.map((stop) => (
          <div key={stop.id} className="flex items-center gap-2 rounded-md border border-border bg-card p-2">
            <input
              type="color"
              value={stop.color}
              onChange={(e) => update(stop.id, { color: e.target.value })}
              className="h-9 w-12 cursor-pointer rounded border border-input bg-background"
              aria-label="Stop color"
            />
            <Input
              value={stop.color}
              onChange={(e) => update(stop.id, { color: e.target.value })}
              className="w-28 font-mono"
            />
            <input
              type="range"
              min={0}
              max={100}
              value={stop.position}
              onChange={(e) => update(stop.id, { position: Number(e.target.value) })}
              className="flex-1"
              aria-label="Stop position"
            />
            <span className="w-12 text-right font-mono text-xs">{stop.position}%</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => remove(stop.id)}
              disabled={stops.length <= 2}
              aria-label="Remove stop"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">CSS</span>
          <CopyButton value={`background-image: ${css};`} label="" />
        </div>
        <code className="break-all font-mono text-sm">background-image: {css};</code>
      </div>
    </div>
  );
}
