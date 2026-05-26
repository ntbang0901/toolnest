import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/tools/copy-button";

type Order = "asc" | "desc" | "natural" | "shuffle" | "reverse" | "none";

function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function shuffle<T>(arr: T[]): T[] {
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export default function TextSortTool() {
  const [input, setInput] = useState("");
  const [order, setOrder] = useState<Order>("asc");
  const [dedupe, setDedupe] = useState(false);
  const [trim, setTrim] = useState(false);
  const [dropEmpty, setDropEmpty] = useState(true);
  const [caseInsensitive, setCaseInsensitive] = useState(false);
  const [seed, setSeed] = useState(0);

  const output = useMemo(() => {
    let lines = input.split("\n");
    if (trim) lines = lines.map((l) => l.trim());
    if (dropEmpty) lines = lines.filter((l) => l !== "");
    if (dedupe) {
      const seen = new Set<string>();
      lines = lines.filter((l) => {
        const k = caseInsensitive ? l.toLowerCase() : l;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    }
    if (order === "asc") {
      lines = lines
        .slice()
        .sort((a, b) =>
          caseInsensitive ? a.toLowerCase().localeCompare(b.toLowerCase()) : a.localeCompare(b),
        );
    } else if (order === "desc") {
      lines = lines
        .slice()
        .sort((a, b) =>
          caseInsensitive ? a.toLowerCase().localeCompare(b.toLowerCase()) : a.localeCompare(b),
        )
        .reverse();
    } else if (order === "natural") {
      lines = lines.slice().sort(naturalCompare);
    } else if (order === "reverse") {
      lines = lines.slice().reverse();
    } else if (order === "shuffle") {
      void seed;
      lines = shuffle(lines);
    }
    return lines.join("\n");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input, order, dedupe, trim, dropEmpty, caseInsensitive, seed]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Order"
          value={order}
          onChange={(v) => setOrder(v as Order)}
          options={[
            { value: "asc", label: "A → Z" },
            { value: "desc", label: "Z → A" },
            { value: "natural", label: "Natural" },
            { value: "reverse", label: "Reverse" },
            { value: "shuffle", label: "Shuffle" },
            { value: "none", label: "Keep" },
          ]}
        />
        {order === "shuffle" && (
          <Button variant="outline" size="sm" onClick={() => setSeed((s) => s + 1)}>
            Reshuffle
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2">
        <Checkbox label="Deduplicate" checked={dedupe} onChange={(e) => setDedupe(e.target.checked)} />
        <Checkbox label="Trim each line" checked={trim} onChange={(e) => setTrim(e.target.checked)} />
        <Checkbox label="Drop empty" checked={dropEmpty} onChange={(e) => setDropEmpty(e.target.checked)} />
        <Checkbox
          label="Case-insensitive"
          checked={caseInsensitive}
          onChange={(e) => setCaseInsensitive(e.target.checked)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Input</span>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="One item per line…"
            className="min-h-[220px] font-mono text-sm lg:min-h-[320px]"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Output ({output ? output.split("\n").length : 0} lines)
            </span>
            <CopyButton value={output} />
          </div>
          <Textarea
            value={output}
            readOnly
            className="min-h-[220px] font-mono text-sm lg:min-h-[320px]"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
