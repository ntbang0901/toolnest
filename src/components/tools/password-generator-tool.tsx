import { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/tools/copy-button";

const LOWER = "abcdefghijklmnopqrstuvwxyz";
const UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";
const SYMBOLS = "!@#$%^&*()-_=+[]{};:,.<>/?";
const AMBIGUOUS = "Il1O0o";

interface Options {
  length: number;
  lower: boolean;
  upper: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}

function buildAlphabet(opts: Options): string {
  let pool = "";
  if (opts.lower) pool += LOWER;
  if (opts.upper) pool += UPPER;
  if (opts.digits) pool += DIGITS;
  if (opts.symbols) pool += SYMBOLS;
  if (opts.excludeAmbiguous) {
    pool = pool
      .split("")
      .filter((c) => !AMBIGUOUS.includes(c))
      .join("");
  }
  return pool;
}

function generate(opts: Options): string {
  const pool = buildAlphabet(opts);
  if (!pool) return "";
  const arr = new Uint32Array(opts.length);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < opts.length; i++) {
    out += pool[arr[i] % pool.length];
  }
  return out;
}

function entropyBits(opts: Options): number {
  const pool = buildAlphabet(opts);
  if (!pool || opts.length <= 0) return 0;
  return Math.log2(pool.length) * opts.length;
}

function strengthLabel(bits: number): { label: string; tone: string; pct: number } {
  const pct = Math.min(100, (bits / 128) * 100);
  if (bits < 28) return { label: "Very weak", tone: "bg-rose-500", pct };
  if (bits < 60) return { label: "Weak", tone: "bg-orange-500", pct };
  if (bits < 90) return { label: "Strong", tone: "bg-yellow-500", pct };
  if (bits < 128) return { label: "Very strong", tone: "bg-emerald-500", pct };
  return { label: "Extreme", tone: "bg-brand", pct: 100 };
}

export default function PasswordGeneratorTool() {
  const [length, setLength] = useState(20);
  const [lower, setLower] = useState(true);
  const [upper, setUpper] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(false);
  const [count, setCount] = useState(5);
  const [list, setList] = useState<string[]>([]);

  const opts: Options = { length, lower, upper, digits, symbols, excludeAmbiguous };

  const regen = useCallback(() => {
    const safeCount = Math.max(1, Math.min(50, Math.floor(count) || 1));
    setList(Array.from({ length: safeCount }, () => generate(opts)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count, length, lower, upper, digits, symbols, excludeAmbiguous]);

  useEffect(() => {
    regen();
  }, [regen]);

  const bits = useMemo(() => entropyBits(opts), [opts]);
  const meter = strengthLabel(bits);

  const noneSelected = !lower && !upper && !digits && !symbols;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="pw-length">
            Length: <span className="font-mono text-muted-foreground">{length}</span>
          </label>
          <input
            id="pw-length"
            type="range"
            min={4}
            max={128}
            value={length}
            onChange={(e) => setLength(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="pw-count">Quantity</label>
          <Input
            id="pw-count"
            type="number"
            min={1}
            max={50}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-28 font-mono"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <Checkbox label="Lowercase a-z" checked={lower} onChange={(e) => setLower(e.target.checked)} />
        <Checkbox label="Uppercase A-Z" checked={upper} onChange={(e) => setUpper(e.target.checked)} />
        <Checkbox label="Digits 0-9" checked={digits} onChange={(e) => setDigits(e.target.checked)} />
        <Checkbox label="Symbols" checked={symbols} onChange={(e) => setSymbols(e.target.checked)} />
        <Checkbox
          label="Exclude ambiguous"
          checked={excludeAmbiguous}
          onChange={(e) => setExcludeAmbiguous(e.target.checked)}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">{meter.label}</span>
          <span className="font-mono text-muted-foreground">{bits.toFixed(1)} bits</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${meter.tone} transition-all`} style={{ width: `${meter.pct}%` }} />
        </div>
      </div>

      {noneSelected && <p className="text-xs text-destructive">Select at least one character set.</p>}

      <div className="flex items-center justify-between">
        <Button onClick={regen} disabled={noneSelected}>
          <RefreshCw className="h-4 w-4" />
          Generate
        </Button>
        <CopyButton value={list.join("\n")} label="Copy all" />
      </div>

      <div className="flex flex-col gap-2">
        {list.map((p, i) => (
          <div
            key={i}
            className="flex items-center justify-between gap-3 rounded-md border border-border bg-card p-2"
          >
            <span className="break-all font-mono text-sm">{p}</span>
            <CopyButton value={p} label="" />
          </div>
        ))}
        {list.length === 0 && (
          <p className="text-xs text-muted-foreground">Press Generate to create passwords.</p>
        )}
      </div>
    </div>
  );
}
