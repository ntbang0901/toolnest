import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";

const BASES: Array<{ id: "bin" | "oct" | "dec" | "hex"; label: string; radix: number; prefix: string }> = [
  { id: "bin", label: "Binary", radix: 2, prefix: "0b" },
  { id: "oct", label: "Octal", radix: 8, prefix: "0o" },
  { id: "dec", label: "Decimal", radix: 10, prefix: "" },
  { id: "hex", label: "Hex", radix: 16, prefix: "0x" },
];

function parseBigInt(input: string, radix: number): bigint | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const sign = trimmed.startsWith("-") ? -1n : 1n;
  let body = sign === -1n ? trimmed.slice(1) : trimmed;
  if (radix === 16 && body.toLowerCase().startsWith("0x")) body = body.slice(2);
  if (radix === 2 && body.toLowerCase().startsWith("0b")) body = body.slice(2);
  if (radix === 8 && body.toLowerCase().startsWith("0o")) body = body.slice(2);
  if (!body) return null;
  const valid: Record<number, RegExp> = {
    2: /^[01]+$/,
    8: /^[0-7]+$/,
    10: /^[0-9]+$/,
    16: /^[0-9a-fA-F]+$/,
  };
  if (!valid[radix].test(body)) return null;
  let result = 0n;
  const r = BigInt(radix);
  for (const ch of body) {
    const d = parseInt(ch, radix);
    result = result * r + BigInt(d);
  }
  return sign * result;
}

function toBase(value: bigint, radix: number): string {
  return value.toString(radix);
}

export default function NumberBaseTool() {
  const [activeBase, setActiveBase] = useState<typeof BASES[number]["id"]>("dec");
  const [values, setValues] = useState<Record<string, string>>({ bin: "", oct: "", dec: "42", hex: "" });
  const [error, setError] = useState<string | null>(null);

  const computed = useMemo(() => {
    const src = BASES.find((b) => b.id === activeBase)!;
    const raw = values[activeBase];
    if (!raw.trim()) return null;
    const parsed = parseBigInt(raw, src.radix);
    return parsed;
  }, [values, activeBase]);

  const display = useMemo(() => {
    if (computed === null) {
      const empty: Record<string, string> = { bin: "", oct: "", dec: "", hex: "" };
      empty[activeBase] = values[activeBase];
      return empty;
    }
    const sign = computed < 0n ? "-" : "";
    const abs = computed < 0n ? -computed : computed;
    const out: Record<string, string> = {};
    for (const b of BASES) {
      out[b.id] = b.id === activeBase ? values[activeBase] : sign + toBase(abs, b.radix);
    }
    return out;
  }, [computed, activeBase, values]);

  const onChange = (id: typeof BASES[number]["id"], v: string) => {
    setActiveBase(id);
    const next = { ...values, [id]: v };
    setValues(next);
    if (!v.trim()) {
      setError(null);
      return;
    }
    const radix = BASES.find((b) => b.id === id)!.radix;
    const parsed = parseBigInt(v, radix);
    setError(parsed === null ? `Invalid ${id} number` : null);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {BASES.map((b) => (
          <div
            key={b.id}
            className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm">
                {b.label} <span className="text-muted-foreground">· base {b.radix}</span>
              </span>
              <CopyButton value={display[b.id]} label="" />
            </div>
            <Input
              value={display[b.id]}
              onChange={(e) => onChange(b.id, e.target.value)}
              className="font-mono"
              placeholder={b.prefix ? `${b.prefix}…` : "0-9"}
              spellCheck={false}
            />
          </div>
        ))}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">
        Supports BigInt — convert numbers of any size. Prefixes 0b / 0o / 0x are accepted.
      </p>
    </div>
  );
}
