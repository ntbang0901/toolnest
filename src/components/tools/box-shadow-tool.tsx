import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/tools/copy-button";

interface Layer {
  id: string;
  x: number;
  y: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

function makeId() {
  return Math.random().toString(36).slice(2, 9);
}

const DEFAULTS: Layer[] = [
  { id: makeId(), x: 0, y: 4, blur: 12, spread: 0, color: "#0a0a0a26", inset: false },
];

export default function BoxShadowTool() {
  const [layers, setLayers] = useState<Layer[]>(DEFAULTS);
  const [bg, setBg] = useState("#fafafa");

  const css = useMemo(
    () =>
      layers
        .map((l) => `${l.inset ? "inset " : ""}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${l.color}`)
        .join(", "),
    [layers],
  );

  const update = (id: string, patch: Partial<Layer>) =>
    setLayers((s) => s.map((l) => (l.id === id ? { ...l, ...patch } : l)));

  const remove = (id: string) =>
    setLayers((s) => (s.length > 1 ? s.filter((l) => l.id !== id) : s));

  const add = () =>
    setLayers((s) => [
      ...s,
      { id: makeId(), x: 0, y: 8, blur: 24, spread: -4, color: "#0a0a0a1a", inset: false },
    ]);

  return (
    <div className="flex flex-col gap-4">
      <div
        className="grid h-56 place-items-center rounded-lg border border-border"
        style={{ background: bg }}
      >
        <div
          className="h-32 w-48 rounded-lg bg-card"
          style={{ boxShadow: css }}
          aria-label="Shadow preview"
        />
      </div>

      <div className="flex items-center gap-2">
        <label className="text-sm" htmlFor="bg-color">
          Preview background
        </label>
        <input
          id="bg-color"
          type="color"
          value={bg}
          onChange={(e) => setBg(e.target.value)}
          className="h-8 w-10 cursor-pointer rounded border border-input bg-background"
        />
        <Input value={bg} onChange={(e) => setBg(e.target.value)} className="w-32 font-mono" />
        <Button variant="outline" size="sm" onClick={add} className="ml-auto">
          <Plus className="h-4 w-4" /> Layer
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        {layers.map((l, i) => (
          <div key={l.id} className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">Layer {i + 1}</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(l.id)}
                disabled={layers.length <= 1}
                aria-label="Remove layer"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-4">
              <NumField label="X" value={l.x} onChange={(v) => update(l.id, { x: v })} />
              <NumField label="Y" value={l.y} onChange={(v) => update(l.id, { y: v })} />
              <NumField label="Blur" value={l.blur} min={0} onChange={(v) => update(l.id, { blur: v })} />
              <NumField label="Spread" value={l.spread} onChange={(v) => update(l.id, { spread: v })} />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={l.color.length === 9 ? l.color.slice(0, 7) : l.color}
                onChange={(e) =>
                  update(l.id, {
                    color: l.color.length === 9 ? e.target.value + l.color.slice(7) : e.target.value,
                  })
                }
                className="h-9 w-12 cursor-pointer rounded border border-input bg-background"
                aria-label="Shadow color"
              />
              <Input
                value={l.color}
                onChange={(e) => update(l.id, { color: e.target.value })}
                className="font-mono"
              />
              <Checkbox
                label="Inset"
                checked={l.inset}
                onChange={(e) => update(l.id, { inset: e.target.checked })}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">CSS</span>
          <CopyButton value={`box-shadow: ${css};`} label="" />
        </div>
        <code className="break-all font-mono text-sm">box-shadow: {css};</code>
      </div>
    </div>
  );
}

function NumField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <Input
        type="number"
        value={value}
        min={min}
        onChange={(e) => onChange(Number(e.target.value))}
        className="font-mono"
      />
    </label>
  );
}
