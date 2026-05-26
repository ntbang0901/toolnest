import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

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

function relLuminance({ r, g, b }: RGB): number {
  const fn = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * fn(r) + 0.7152 * fn(g) + 0.0722 * fn(b);
}

function ratio(fg: RGB, bg: RGB): number {
  const l1 = relLuminance(fg);
  const l2 = relLuminance(bg);
  const [hi, lo] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

function pass(r: number, threshold: number): { ok: boolean; label: string } {
  return { ok: r >= threshold, label: r >= threshold ? "Pass" : "Fail" };
}

export default function ContrastCheckerTool() {
  const [fgHex, setFgHex] = useState("#0a0a0a");
  const [bgHex, setBgHex] = useState("#fafafa");

  const fg = useMemo(() => hexToRgb(fgHex), [fgHex]);
  const bg = useMemo(() => hexToRgb(bgHex), [bgHex]);

  const r = fg && bg ? ratio(fg, bg) : 0;

  const checks = [
    { name: "AA · normal text", threshold: 4.5, ...pass(r, 4.5) },
    { name: "AA · large text", threshold: 3, ...pass(r, 3) },
    { name: "AAA · normal text", threshold: 7, ...pass(r, 7) },
    { name: "AAA · large text", threshold: 4.5, ...pass(r, 4.5) },
    { name: "AA · UI components", threshold: 3, ...pass(r, 3) },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <ColorField label="Foreground" hex={fgHex} setHex={setFgHex} />
        <ColorField label="Background" hex={bgHex} setHex={setBgHex} />
      </div>

      {fg && bg && (
        <div
          className="rounded-lg border border-border p-6"
          style={{ background: bgHex, color: fgHex }}
        >
          <p className="text-sm">The quick brown fox jumps over the lazy dog.</p>
          <p className="text-2xl font-semibold">The quick brown fox jumps over the lazy dog.</p>
          <p className="mt-2 text-xs opacity-80">Contrast ratio</p>
          <p className="font-mono text-3xl">{r.toFixed(2)} : 1</p>
        </div>
      )}

      <div className="grid gap-2 sm:grid-cols-2">
        {checks.map((c) => (
          <div
            key={c.name}
            className={`flex items-center justify-between rounded-md border bg-card p-3 text-sm ${
              c.ok
                ? "border-emerald-500/40 bg-emerald-500/5"
                : "border-rose-500/40 bg-rose-500/5"
            }`}
          >
            <div>
              <div className="font-medium">{c.name}</div>
              <div className="text-xs text-muted-foreground">≥ {c.threshold}:1</div>
            </div>
            <span
              className={`font-mono text-sm ${
                c.ok
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              }`}
            >
              {c.label}
            </span>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        WCAG 2.2 thresholds. Large text = 18pt regular or 14pt bold (≈ 24px / 18.66px).
      </p>
    </div>
  );
}

function ColorField({ label, hex, setHex }: { label: string; hex: string; setHex: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        <div
          className="h-10 w-10 shrink-0 rounded-md border border-border"
          style={{ background: hex }}
          aria-hidden
        />
        <input
          type="color"
          value={hex}
          onChange={(e) => setHex(e.target.value)}
          className="h-10 w-12 cursor-pointer rounded-md border border-input bg-background"
          aria-label={`${label} color picker`}
        />
        <Input value={hex} onChange={(e) => setHex(e.target.value)} className="font-mono" />
      </div>
    </div>
  );
}
