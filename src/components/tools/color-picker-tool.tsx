import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";

type RGB = { r: number; g: number; b: number };

function hexToRgb(hex: string): RGB | null {
  const m = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(m)) return null;
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: RGB): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl({ r, g, b }: RGB): { h: number; s: number; l: number } {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): RGB {
  const sn = s / 100, ln = l / 100;
  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r1 = 0, g1 = 0, b1 = 0;
  if (hp < 1) [r1, g1, b1] = [c, x, 0];
  else if (hp < 2) [r1, g1, b1] = [x, c, 0];
  else if (hp < 3) [r1, g1, b1] = [0, c, x];
  else if (hp < 4) [r1, g1, b1] = [0, x, c];
  else if (hp < 5) [r1, g1, b1] = [x, 0, c];
  else [r1, g1, b1] = [c, 0, x];
  const m = ln - c / 2;
  return { r: (r1 + m) * 255, g: (g1 + m) * 255, b: (b1 + m) * 255 };
}

function srgbToLinear(c: number): number {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
}

function rgbToOklch({ r, g, b }: RGB): { l: number; c: number; h: number } {
  const lr = srgbToLinear(r), lg = srgbToLinear(g), lb = srgbToLinear(b);
  const lp = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const mp = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const sp = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * lp + 0.793617785 * mp - 0.0040720468 * sp;
  const a = 1.9779984951 * lp - 2.428592205 * mp + 0.4505937099 * sp;
  const bb = 0.0259040371 * lp + 0.7827717662 * mp - 0.808675766 * sp;
  const C = Math.sqrt(a * a + bb * bb);
  let h = (Math.atan2(bb, a) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L * 100, c: C, h };
}

const fmt = (n: number, d = 0) => (Number.isFinite(n) ? n.toFixed(d) : "0");

export default function ColorPickerTool() {
  const [hex, setHex] = useState("#14b8a6");
  const [hexInput, setHexInput] = useState("#14b8a6");
  const [error, setError] = useState<string | null>(null);

  const rgb = useMemo(() => hexToRgb(hex) ?? { r: 0, g: 0, b: 0 }, [hex]);
  const hsl = useMemo(() => rgbToHsl(rgb), [rgb]);
  const oklch = useMemo(() => rgbToOklch(rgb), [rgb]);

  useEffect(() => {
    setHexInput(hex);
  }, [hex]);

  const onHexChange = (v: string) => {
    setHexInput(v);
    const parsed = hexToRgb(v);
    if (parsed) {
      setHex(rgbToHex(parsed));
      setError(null);
    } else {
      setError("Invalid hex (use #rgb or #rrggbb)");
    }
  };

  const onPickerChange = (v: string) => {
    setHex(v);
    setError(null);
  };

  const onRgbChange = (k: keyof RGB, v: number) => {
    const next = { ...rgb, [k]: Math.max(0, Math.min(255, v)) };
    setHex(rgbToHex(next));
  };

  const onHslChange = (k: "h" | "s" | "l", v: number) => {
    const next = { ...hsl, [k]: v };
    setHex(rgbToHex(hslToRgb(next.h, next.s, next.l)));
  };

  const css = {
    hex: hex.toUpperCase(),
    rgb: `rgb(${fmt(rgb.r)} ${fmt(rgb.g)} ${fmt(rgb.b)})`,
    hsl: `hsl(${fmt(hsl.h)} ${fmt(hsl.s, 1)}% ${fmt(hsl.l, 1)}%)`,
    oklch: `oklch(${fmt(oklch.l, 2)}% ${fmt(oklch.c, 4)} ${fmt(oklch.h, 2)})`,
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
        <div className="flex flex-col gap-3">
          <div
            className="aspect-square w-full rounded-lg border border-border shadow-inner"
            style={{ background: hex }}
          />
          <input
            type="color"
            value={hex}
            onChange={(e) => onPickerChange(e.target.value)}
            className="h-10 w-full cursor-pointer rounded-md border border-input bg-background"
            aria-label="Color picker"
          />
          <Input
            value={hexInput}
            onChange={(e) => onHexChange(e.target.value)}
            className="font-mono"
            placeholder="#rrggbb"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>

        <div className="grid gap-3">
          <Field label="HEX" value={css.hex} />
          <Field label="RGB" value={css.rgb} />
          <Field label="HSL" value={css.hsl} />
          <Field label="OKLCH" value={css.oklch} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Sliders
          title="RGB"
          rows={[
            { label: "R", value: rgb.r, max: 255, onChange: (v) => onRgbChange("r", v) },
            { label: "G", value: rgb.g, max: 255, onChange: (v) => onRgbChange("g", v) },
            { label: "B", value: rgb.b, max: 255, onChange: (v) => onRgbChange("b", v) },
          ]}
        />
        <Sliders
          title="HSL"
          rows={[
            { label: "H", value: hsl.h, max: 360, onChange: (v) => onHslChange("h", v) },
            { label: "S", value: hsl.s, max: 100, onChange: (v) => onHslChange("s", v), suffix: "%" },
            { label: "L", value: hsl.l, max: 100, onChange: (v) => onHslChange("l", v), suffix: "%" },
          ]}
        />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <CopyButton value={value} label="" />
      </div>
      <div className="break-all font-mono text-sm">{value}</div>
    </div>
  );
}

function Sliders({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number; max: number; suffix?: string; onChange: (v: number) => void }>;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card p-3">
      <span className="text-xs font-semibold text-muted-foreground">{title}</span>
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-3">
          <span className="w-4 text-xs text-muted-foreground">{row.label}</span>
          <input
            type="range"
            min={0}
            max={row.max}
            step={row.max > 100 ? 1 : 0.1}
            value={row.value}
            onChange={(e) => row.onChange(Number(e.target.value))}
            className="flex-1"
          />
          <span className="w-16 text-right font-mono text-xs">
            {row.value.toFixed(row.max > 100 ? 0 : 1)}
            {row.suffix ?? ""}
          </span>
        </div>
      ))}
    </div>
  );
}
