import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/copy-button";

type Harmony = "complementary" | "triadic" | "analogous" | "split-complementary" | "tetradic" | "monochromatic";

interface HSL { h: number; s: number; l: number }
interface Color { hex: string; hsl: HSL; label: string }

function hexToHsl(hex: string): HSL | null {
  const m = hex.replace("#", "").match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return null;
  let r = parseInt(m[1], 16) / 255;
  let g = parseInt(m[2], 16) / 255;
  let b = parseInt(m[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function hslToRgb(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    return Math.round(255 * (l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)));
  };
  return `rgb(${f(0)}, ${f(8)}, ${f(4)})`;
}

function generatePalette(base: HSL, harmony: Harmony): Color[] {
  const { h, s, l } = base;
  const make = (hue: number, sat: number, lig: number, label: string): Color => {
    const hex = hslToHex(hue, sat, lig);
    return { hex, hsl: { h: ((hue % 360) + 360) % 360, s: sat, l: lig }, label };
  };

  switch (harmony) {
    case "complementary":
      return [
        make(h, s, l, "Base"),
        make(h, s, Math.min(l + 15, 90), "Light"),
        make(h, s, Math.max(l - 15, 10), "Dark"),
        make(h + 180, s, l, "Complement"),
        make(h + 180, s, Math.min(l + 15, 90), "Complement Light"),
      ];
    case "triadic":
      return [
        make(h, s, l, "Base"),
        make(h + 120, s, l, "Triad 2"),
        make(h + 240, s, l, "Triad 3"),
        make(h, s, Math.min(l + 20, 90), "Base Light"),
        make(h, s, Math.max(l - 20, 10), "Base Dark"),
      ];
    case "analogous":
      return [
        make(h - 30, s, l, "-30°"),
        make(h - 15, s, l, "-15°"),
        make(h, s, l, "Base"),
        make(h + 15, s, l, "+15°"),
        make(h + 30, s, l, "+30°"),
      ];
    case "split-complementary":
      return [
        make(h, s, l, "Base"),
        make(h + 150, s, l, "Split 1"),
        make(h + 210, s, l, "Split 2"),
        make(h, s, Math.min(l + 20, 90), "Base Light"),
        make(h, s, Math.max(l - 20, 10), "Base Dark"),
      ];
    case "tetradic":
      return [
        make(h, s, l, "Base"),
        make(h + 90, s, l, "+90°"),
        make(h + 180, s, l, "+180°"),
        make(h + 270, s, l, "+270°"),
        make(h, Math.max(s - 20, 10), Math.min(l + 20, 90), "Tint"),
      ];
    case "monochromatic":
      return [
        make(h, s, Math.max(l - 30, 5), "Darkest"),
        make(h, s, Math.max(l - 15, 10), "Dark"),
        make(h, s, l, "Base"),
        make(h, s, Math.min(l + 15, 90), "Light"),
        make(h, s, Math.min(l + 30, 95), "Lightest"),
      ];
  }
}

function contrastColor(hex: string): string {
  const m = hex.replace("#", "").match(/^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return "#000";
  const r = parseInt(m[1], 16) / 255;
  const g = parseInt(m[2], 16) / 255;
  const b = parseInt(m[3], 16) / 255;
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return lum > 0.45 ? "#000000" : "#ffffff";
}

const HARMONIES: { value: Harmony; label: string; description: string }[] = [
  { value: "complementary", label: "Complementary", description: "Opposite on the color wheel" },
  { value: "triadic", label: "Triadic", description: "3 evenly spaced hues" },
  { value: "analogous", label: "Analogous", description: "Adjacent hues" },
  { value: "split-complementary", label: "Split-Complementary", description: "Base + two near-complements" },
  { value: "tetradic", label: "Tetradic", description: "4 hues at 90° intervals" },
  { value: "monochromatic", label: "Monochromatic", description: "Same hue, varying lightness" },
];

export default function ColorPaletteTool() {
  const [baseHex, setBaseHex] = useState("#3b82f6");
  const [harmony, setHarmony] = useState<Harmony>("complementary");
  const [copied, setCopied] = useState<string | null>(null);

  const baseHsl = useMemo(() => hexToHsl(baseHex), [baseHex]);
  const palette = useMemo(() => {
    if (!baseHsl) return [];
    return generatePalette(baseHsl, harmony);
  }, [baseHsl, harmony]);

  function copyHex(hex: string) {
    navigator.clipboard.writeText(hex).then(() => {
      setCopied(hex);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Base Color</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={baseHex}
              onChange={(e) => setBaseHex(e.target.value)}
              className="h-9 w-14 cursor-pointer rounded-md border border-input bg-transparent p-0.5"
            />
            <input
              type="text"
              value={baseHex}
              onChange={(e) => {
                const v = e.target.value;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) setBaseHex(v);
              }}
              className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
            {baseHsl && (
              <span className="text-xs text-muted-foreground font-mono">
                hsl({baseHsl.h}, {baseHsl.s}%, {baseHsl.l}%)
              </span>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Harmony</label>
          <select
            value={harmony}
            onChange={(e) => setHarmony(e.target.value as Harmony)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {HARMONIES.map((h) => (
              <option key={h.value} value={h.value}>
                {h.label} — {h.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Palette swatches */}
      <div className="flex gap-2 flex-wrap sm:flex-nowrap">
        {palette.map((color) => (
          <button
            key={color.hex}
            onClick={() => copyHex(color.hex)}
            title={`Copy ${color.hex}`}
            className="group flex-1 min-w-[80px] flex flex-col rounded-lg overflow-hidden border border-border transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <div
              className="h-24 w-full flex items-center justify-center text-xs font-mono font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ backgroundColor: color.hex, color: contrastColor(color.hex) }}
            >
              {copied === color.hex ? "Copied!" : color.hex}
            </div>
            <div className="bg-card px-2 py-1.5 text-center">
              <div className="text-xs font-mono font-medium">{color.hex}</div>
              <div className="text-xs text-muted-foreground">{color.label}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Detail table */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Color values</span>
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card">
          {palette.map((color) => (
            <div
              key={color.hex}
              className="flex items-center gap-3 border-b border-border px-3 py-2 last:border-0 text-sm"
            >
              <div
                className="h-6 w-6 rounded shrink-0 border border-border"
                style={{ backgroundColor: color.hex }}
              />
              <span className="text-muted-foreground w-28 shrink-0 text-xs">{color.label}</span>
              <div className="flex flex-wrap gap-x-4 gap-y-1 flex-1 min-w-0">
                <span className="font-mono text-xs flex items-center gap-1">
                  {color.hex}
                  <CopyButton value={color.hex} label="" />
                </span>
                <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                  hsl({color.hsl.h}, {color.hsl.s}%, {color.hsl.l}%)
                  <CopyButton value={`hsl(${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%)`} label="" />
                </span>
                <span className="font-mono text-xs text-muted-foreground flex items-center gap-1">
                  {hslToRgb(color.hsl.h, color.hsl.s, color.hsl.l)}
                  <CopyButton value={hslToRgb(color.hsl.h, color.hsl.s, color.hsl.l)} label="" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CSS variables export */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">CSS variables</span>
        <div className="relative rounded-md border border-border bg-card">
          <pre className="overflow-x-auto p-3 text-xs font-mono">
            {`:root {\n${palette.map((c, i) => `  --color-${i + 1}: ${c.hex}; /* ${c.label} */`).join("\n")}\n}`}
          </pre>
          <div className="absolute top-2 right-2">
            <CopyButton
              value={`:root {\n${palette.map((c, i) => `  --color-${i + 1}: ${c.hex}; /* ${c.label} */`).join("\n")}\n}`}
              label=""
            />
          </div>
        </div>
      </div>
    </div>
  );
}
