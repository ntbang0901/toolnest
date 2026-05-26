import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/copy-button";

type System = "decimal" | "binary";

interface Unit {
  label: string;
  abbr: string;
  bytes: bigint;
  system: System;
}

const UNITS: Unit[] = [
  { label: "Bit", abbr: "bit", bytes: BigInt(0), system: "decimal" }, // special case
  { label: "Byte", abbr: "B", bytes: BigInt(1), system: "decimal" },
  { label: "Kilobyte", abbr: "KB", bytes: BigInt(1000), system: "decimal" },
  { label: "Megabyte", abbr: "MB", bytes: BigInt(1_000_000), system: "decimal" },
  { label: "Gigabyte", abbr: "GB", bytes: BigInt(1_000_000_000), system: "decimal" },
  { label: "Terabyte", abbr: "TB", bytes: BigInt(1_000_000_000_000), system: "decimal" },
  { label: "Petabyte", abbr: "PB", bytes: BigInt(1_000_000_000_000_000), system: "decimal" },
  { label: "Kibibyte", abbr: "KiB", bytes: BigInt(1024), system: "binary" },
  { label: "Mebibyte", abbr: "MiB", bytes: BigInt(1024 ** 2), system: "binary" },
  { label: "Gibibyte", abbr: "GiB", bytes: BigInt(1024 ** 3), system: "binary" },
  { label: "Tebibyte", abbr: "TiB", bytes: BigInt(1024 ** 4), system: "binary" },
  { label: "Pebibyte", abbr: "PiB", bytes: BigInt(1024 ** 5), system: "binary" },
];

// Convert to bytes (as a float for precision)
function toBytes(value: number, unit: Unit): number {
  if (unit.abbr === "bit") return value / 8;
  return value * Number(unit.bytes);
}

function fromBytes(bytes: number, unit: Unit): string {
  if (!isFinite(bytes) || bytes < 0) return "—";
  let result: number;
  if (unit.abbr === "bit") {
    result = bytes * 8;
  } else {
    result = bytes / Number(unit.bytes);
  }
  if (result === 0) return "0";
  if (result >= 1e15 || (result < 1e-6 && result > 0)) return result.toExponential(6);
  // Show up to 10 significant digits
  const str = result.toPrecision(10).replace(/\.?0+$/, "");
  return str;
}

export default function ByteConverterTool() {
  const [inputValue, setInputValue] = useState("1");
  const [selectedUnit, setSelectedUnit] = useState<string>("GB");

  const bytes = useMemo(() => {
    const unit = UNITS.find((u) => u.abbr === selectedUnit);
    if (!unit) return null;
    const n = parseFloat(inputValue);
    if (isNaN(n) || n < 0) return null;
    return toBytes(n, unit);
  }, [inputValue, selectedUnit]);

  const decimalUnits = UNITS.filter((u) => u.system === "decimal" || u.abbr === "bit");
  const binaryUnits = UNITS.filter((u) => u.system === "binary");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Input</label>
        <div className="flex gap-2">
          <input
            type="number"
            min="0"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex h-9 w-full max-w-xs rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <select
            value={selectedUnit}
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <optgroup label="Decimal (SI)">
              {decimalUnits.map((u) => (
                <option key={u.abbr} value={u.abbr}>
                  {u.abbr} — {u.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Binary (IEC)">
              {binaryUnits.map((u) => (
                <option key={u.abbr} value={u.abbr}>
                  {u.abbr} — {u.label}
                </option>
              ))}
            </optgroup>
          </select>
        </div>
        {bytes === null && inputValue !== "" && (
          <p className="text-xs text-destructive">Enter a valid non-negative number.</p>
        )}
      </div>

      {bytes !== null && (
        <>
          <Section title="Decimal (SI — powers of 1000)" units={decimalUnits} bytes={bytes} />
          <Section title="Binary (IEC — powers of 1024)" units={binaryUnits} bytes={bytes} />
        </>
      )}
    </div>
  );
}

function Section({ title, units, bytes }: { title: string; units: Unit[]; bytes: number }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{title}</span>
      <div className="flex flex-col gap-1 rounded-lg border border-border bg-card">
        {units.map((unit) => {
          const value = fromBytes(bytes, unit);
          return (
            <div
              key={unit.abbr}
              className="flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-0 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono font-semibold w-10 shrink-0 text-muted-foreground">
                  {unit.abbr}
                </span>
                <span className="text-muted-foreground truncate">{unit.label}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="font-mono text-sm">{value}</span>
                <CopyButton value={value} label="" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
