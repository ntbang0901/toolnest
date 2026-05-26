import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/tools/copy-button";

function uuidv4(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex.slice(0, 4).join("")}-${hex.slice(4, 6).join("")}-${hex
    .slice(6, 8)
    .join("")}-${hex.slice(8, 10).join("")}-${hex.slice(10, 16).join("")}`;
}

type Casing = "lower" | "upper";
type Wrap = "none" | "single" | "double";

export default function UuidGeneratorTool() {
  const [count, setCount] = useState(10);
  const [casing, setCasing] = useState<Casing>("lower");
  const [wrap, setWrap] = useState<Wrap>("none");
  const [hyphens, setHyphens] = useState(true);
  const [ids, setIds] = useState<string[]>([]);

  const generate = useCallback(() => {
    const safeCount = Math.max(1, Math.min(1000, Math.floor(count) || 1));
    setIds(Array.from({ length: safeCount }, uuidv4));
  }, [count]);

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const formatted = ids
    .map((raw) => {
      let v = hyphens ? raw : raw.replace(/-/g, "");
      v = casing === "upper" ? v.toUpperCase() : v.toLowerCase();
      if (wrap === "single") v = `'${v}'`;
      if (wrap === "double") v = `"${v}"`;
      return v;
    })
    .join("\n");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="uuid-count">Count</label>
          <Input
            id="uuid-count"
            type="number"
            min={1}
            max={1000}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-28 font-mono"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Case</span>
          <SegmentedControl
            ariaLabel="Casing"
            value={casing}
            onChange={(v) => setCasing(v as Casing)}
            options={[
              { value: "lower", label: "lower" },
              { value: "upper", label: "UPPER" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Wrap</span>
          <SegmentedControl
            ariaLabel="Wrap"
            value={wrap}
            onChange={(v) => setWrap(v as Wrap)}
            options={[
              { value: "none", label: "None" },
              { value: "single", label: "'…'" },
              { value: "double", label: '"…"' },
            ]}
          />
        </div>

        <Checkbox label="Hyphens" checked={hyphens} onChange={(e) => setHyphens(e.target.checked)} />

        <Button onClick={generate} className="ml-auto">
          <RefreshCw className="h-4 w-4" />
          Generate
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {ids.length} UUID{ids.length === 1 ? "" : "s"}
          </span>
          <CopyButton value={formatted} label="Copy all" />
        </div>
        <Textarea value={formatted} readOnly className="min-h-[280px] font-mono text-sm lg:min-h-[400px]" spellCheck={false} />
      </div>
    </div>
  );
}
