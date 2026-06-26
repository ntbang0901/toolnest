import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";

const ROMAN_MAP: [number, string][] = [
  [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
  [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
  [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
];

function toRoman(n: number): { roman: string; steps: string[] } {
  if (n < 1 || n > 3999) throw new Error("Number must be between 1 and 3999");
  let remaining = n;
  const parts: string[] = [];
  const steps: string[] = [];
  for (const [value, numeral] of ROMAN_MAP) {
    while (remaining >= value) {
      parts.push(numeral);
      steps.push(`${value} = ${numeral}`);
      remaining -= value;
    }
  }
  return { roman: parts.join(""), steps };
}

function fromRoman(input: string): { arabic: number; steps: string[] } {
  const str = input.toUpperCase().trim();
  const VALS: Record<string, number> = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };
  let result = 0;
  const steps: string[] = [];
  for (let i = 0; i < str.length; i++) {
    const cur = VALS[str[i]];
    const next = VALS[str[i + 1]];
    if (cur === undefined) throw new Error(`Unknown Roman numeral character: ${str[i]}`);
    if (next && cur < next) {
      steps.push(`${str[i]}${str[i + 1]} = ${next - cur}`);
      result += next - cur;
      i++;
    } else {
      steps.push(`${str[i]} = ${cur}`);
      result += cur;
    }
  }
  if (result < 1 || result > 3999) throw new Error("Result must be between 1 and 3999");
  return { arabic: result, steps };
}

function isRoman(input: string): boolean {
  return /^[IVXLCDMivxlcdm]+$/.test(input.trim());
}

function convert(input: string): { output: string; steps: string[]; direction: string } {
  const trimmed = input.trim();
  if (!trimmed) return { output: "", steps: [], direction: "" };

  if (/^\d+$/.test(trimmed)) {
    const n = parseInt(trimmed, 10);
    const { roman, steps } = toRoman(n);
    return { output: roman, steps, direction: "Arabic → Roman" };
  }

  if (isRoman(trimmed)) {
    const { arabic, steps } = fromRoman(trimmed);
    return { output: String(arabic), steps, direction: "Roman → Arabic" };
  }

  throw new Error("Input must be a number (1–3999) or Roman numerals (I, V, X, L, C, D, M)");
}

export default function RomanNumeralTool() {
  const [input, setInput] = useState("2024");

  const result = useMemo(() => {
    try {
      return { ok: true as const, ...convert(input) };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Conversion failed", output: "", steps: [], direction: "" };
    }
  }, [input]);

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="roman-input">
          Enter a number or Roman numeral
        </label>
        <div className="flex gap-2">
          <input
            id="roman-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 2024 or MMXXIV"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            autoComplete="off"
            spellCheck={false}
          />
          <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
            Clear
          </Button>
        </div>
      </div>

      {result.ok && result.output && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{result.direction}</span>
            <span className="text-4xl font-mono font-semibold tracking-wide">{result.output}</span>
          </div>

          {result.steps.length > 0 && (
            <div className="rounded-md border bg-muted/40 p-4">
              <p className="text-xs font-medium text-muted-foreground mb-2">Breakdown</p>
              <div className="flex flex-wrap gap-2">
                {result.steps.map((step, i) => (
                  <span key={i} className="rounded bg-background border px-2 py-0.5 text-sm font-mono">
                    {step}
                  </span>
                ))}
              </div>
              <p className="text-sm font-mono mt-3 text-muted-foreground">
                = {result.steps.map(s => s.split(" = ")[0]).join(" + ")} = {result.output}
              </p>
            </div>
          )}
        </div>
      )}

      {!result.ok && input.trim() && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}

      <div className="flex flex-wrap gap-2 mt-2">
        {["1", "4", "9", "14", "40", "90", "399", "1999", "2024", "3999"].map((n) => (
          <Button key={n} variant="outline" size="sm" onClick={() => setInput(n)}>
            {n}
          </Button>
        ))}
        {["IV", "XIV", "XLII", "MCMXCIX", "MMXXIV"].map((r) => (
          <Button key={r} variant="outline" size="sm" onClick={() => setInput(r)}>
            {r}
          </Button>
        ))}
      </div>
    </div>
  );
}
