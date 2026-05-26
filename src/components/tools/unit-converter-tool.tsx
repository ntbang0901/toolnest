import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/copy-button";
import { Button } from "@/components/ui/button";

type Category = "length" | "weight" | "temperature" | "speed" | "area" | "volume" | "data";

interface UnitDef {
  label: string;
  abbr: string;
  toBase: (v: number) => number;
  fromBase: (v: number) => number;
}

const CATEGORIES: Record<Category, { label: string; units: UnitDef[] }> = {
  length: {
    label: "Length",
    units: [
      { label: "Millimeter", abbr: "mm", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { label: "Centimeter", abbr: "cm", toBase: (v) => v / 100, fromBase: (v) => v * 100 },
      { label: "Meter", abbr: "m", toBase: (v) => v, fromBase: (v) => v },
      { label: "Kilometer", abbr: "km", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { label: "Inch", abbr: "in", toBase: (v) => v * 0.0254, fromBase: (v) => v / 0.0254 },
      { label: "Foot", abbr: "ft", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
      { label: "Yard", abbr: "yd", toBase: (v) => v * 0.9144, fromBase: (v) => v / 0.9144 },
      { label: "Mile", abbr: "mi", toBase: (v) => v * 1609.344, fromBase: (v) => v / 1609.344 },
      { label: "Nautical mile", abbr: "nmi", toBase: (v) => v * 1852, fromBase: (v) => v / 1852 },
    ],
  },
  weight: {
    label: "Weight / Mass",
    units: [
      { label: "Milligram", abbr: "mg", toBase: (v) => v / 1e6, fromBase: (v) => v * 1e6 },
      { label: "Gram", abbr: "g", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { label: "Kilogram", abbr: "kg", toBase: (v) => v, fromBase: (v) => v },
      { label: "Tonne", abbr: "t", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { label: "Ounce", abbr: "oz", toBase: (v) => v * 0.0283495, fromBase: (v) => v / 0.0283495 },
      { label: "Pound", abbr: "lb", toBase: (v) => v * 0.453592, fromBase: (v) => v / 0.453592 },
      { label: "Stone", abbr: "st", toBase: (v) => v * 6.35029, fromBase: (v) => v / 6.35029 },
    ],
  },
  temperature: {
    label: "Temperature",
    units: [
      { label: "Celsius", abbr: "°C", toBase: (v) => v, fromBase: (v) => v },
      { label: "Fahrenheit", abbr: "°F", toBase: (v) => (v - 32) * 5 / 9, fromBase: (v) => v * 9 / 5 + 32 },
      { label: "Kelvin", abbr: "K", toBase: (v) => v - 273.15, fromBase: (v) => v + 273.15 },
    ],
  },
  speed: {
    label: "Speed",
    units: [
      { label: "m/s", abbr: "m/s", toBase: (v) => v, fromBase: (v) => v },
      { label: "km/h", abbr: "km/h", toBase: (v) => v / 3.6, fromBase: (v) => v * 3.6 },
      { label: "mph", abbr: "mph", toBase: (v) => v * 0.44704, fromBase: (v) => v / 0.44704 },
      { label: "knot", abbr: "kn", toBase: (v) => v * 0.514444, fromBase: (v) => v / 0.514444 },
      { label: "ft/s", abbr: "ft/s", toBase: (v) => v * 0.3048, fromBase: (v) => v / 0.3048 },
    ],
  },
  area: {
    label: "Area",
    units: [
      { label: "mm²", abbr: "mm²", toBase: (v) => v / 1e6, fromBase: (v) => v * 1e6 },
      { label: "cm²", abbr: "cm²", toBase: (v) => v / 1e4, fromBase: (v) => v * 1e4 },
      { label: "m²", abbr: "m²", toBase: (v) => v, fromBase: (v) => v },
      { label: "km²", abbr: "km²", toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
      { label: "Hectare", abbr: "ha", toBase: (v) => v * 1e4, fromBase: (v) => v / 1e4 },
      { label: "Acre", abbr: "ac", toBase: (v) => v * 4046.86, fromBase: (v) => v / 4046.86 },
      { label: "ft²", abbr: "ft²", toBase: (v) => v * 0.092903, fromBase: (v) => v / 0.092903 },
      { label: "mi²", abbr: "mi²", toBase: (v) => v * 2.59e6, fromBase: (v) => v / 2.59e6 },
    ],
  },
  volume: {
    label: "Volume",
    units: [
      { label: "Milliliter", abbr: "mL", toBase: (v) => v / 1000, fromBase: (v) => v * 1000 },
      { label: "Liter", abbr: "L", toBase: (v) => v, fromBase: (v) => v },
      { label: "m³", abbr: "m³", toBase: (v) => v * 1000, fromBase: (v) => v / 1000 },
      { label: "US fl oz", abbr: "fl oz", toBase: (v) => v * 0.0295735, fromBase: (v) => v / 0.0295735 },
      { label: "US cup", abbr: "cup", toBase: (v) => v * 0.236588, fromBase: (v) => v / 0.236588 },
      { label: "US pint", abbr: "pt", toBase: (v) => v * 0.473176, fromBase: (v) => v / 0.473176 },
      { label: "US gallon", abbr: "gal", toBase: (v) => v * 3.78541, fromBase: (v) => v / 3.78541 },
      { label: "UK gallon", abbr: "UK gal", toBase: (v) => v * 4.54609, fromBase: (v) => v / 4.54609 },
    ],
  },
  data: {
    label: "Data",
    units: [
      { label: "Bit", abbr: "bit", toBase: (v) => v / 8, fromBase: (v) => v * 8 },
      { label: "Byte", abbr: "B", toBase: (v) => v, fromBase: (v) => v },
      { label: "Kilobyte", abbr: "KB", toBase: (v) => v * 1e3, fromBase: (v) => v / 1e3 },
      { label: "Megabyte", abbr: "MB", toBase: (v) => v * 1e6, fromBase: (v) => v / 1e6 },
      { label: "Gigabyte", abbr: "GB", toBase: (v) => v * 1e9, fromBase: (v) => v / 1e9 },
      { label: "Terabyte", abbr: "TB", toBase: (v) => v * 1e12, fromBase: (v) => v / 1e12 },
      { label: "Kibibyte", abbr: "KiB", toBase: (v) => v * 1024, fromBase: (v) => v / 1024 },
      { label: "Mebibyte", abbr: "MiB", toBase: (v) => v * 1024 ** 2, fromBase: (v) => v / 1024 ** 2 },
      { label: "Gibibyte", abbr: "GiB", toBase: (v) => v * 1024 ** 3, fromBase: (v) => v / 1024 ** 3 },
    ],
  },
};

function fmt(n: number): string {
  if (!isFinite(n)) return "—";
  if (n === 0) return "0";
  if (Math.abs(n) >= 1e12 || (Math.abs(n) < 1e-6 && n !== 0)) return n.toExponential(6);
  return parseFloat(n.toPrecision(10)).toString();
}

export default function UnitConverterTool() {
  const [category, setCategory] = useState<Category>("length");
  const [inputValue, setInputValue] = useState("1");
  const [fromUnit, setFromUnit] = useState("m");

  const cat = CATEGORIES[category];
  const units = cat.units;

  const baseValue = useMemo(() => {
    const n = parseFloat(inputValue);
    if (isNaN(n)) return null;
    const unit = units.find((u) => u.abbr === fromUnit);
    if (!unit) return null;
    return unit.toBase(n);
  }, [inputValue, fromUnit, units]);

  // Reset fromUnit when category changes
  function changeCategory(c: Category) {
    setCategory(c);
    setFromUnit(CATEGORIES[c].units[0].abbr);
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Category tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(CATEGORIES) as Category[]).map((c) => (
          <button
            key={c}
            onClick={() => changeCategory(c)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              category === c
                ? "bg-primary/10 text-primary border border-primary/20"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
          >
            {CATEGORIES[c].label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Value</label>
          <input
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">From</label>
          <select
            value={fromUnit}
            onChange={(e) => setFromUnit(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            {units.map((u) => (
              <option key={u.abbr} value={u.abbr}>
                {u.abbr} — {u.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results */}
      {baseValue !== null && (
        <div className="flex flex-col gap-1 rounded-lg border border-border bg-card">
          {units.map((unit) => {
            const val = fmt(unit.fromBase(baseValue));
            const isSource = unit.abbr === fromUnit;
            return (
              <div
                key={unit.abbr}
                className={`flex items-center justify-between gap-3 border-b border-border px-3 py-2 last:border-0 text-sm ${isSource ? "bg-primary/5" : ""}`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-mono font-semibold w-12 shrink-0 ${isSource ? "text-primary" : "text-muted-foreground"}`}>
                    {unit.abbr}
                  </span>
                  <span className="text-muted-foreground truncate text-xs">{unit.label}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-mono text-sm">{val}</span>
                  <CopyButton value={val} label="" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
