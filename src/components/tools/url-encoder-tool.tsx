import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";

type Mode = "encode" | "decode";
type Scope = "component" | "uri";

function run(input: string, mode: Mode, scope: Scope): { ok: true; value: string } | { ok: false; error: string } {
  try {
    if (mode === "encode") {
      return { ok: true, value: scope === "component" ? encodeURIComponent(input) : encodeURI(input) };
    }
    return { ok: true, value: scope === "component" ? decodeURIComponent(input) : decodeURI(input) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed" };
  }
}

export default function UrlEncoderTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [scope, setScope] = useState<Scope>("component");
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    if (!input) return { ok: true as const, value: "" };
    return run(input, mode, scope);
  }, [input, mode, scope]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: "encode", label: "Encode" },
            { value: "decode", label: "Decode" },
          ]}
        />
        <SegmentedControl
          ariaLabel="Scope"
          value={scope}
          onChange={(v) => setScope(v as Scope)}
          options={[
            { value: "component", label: "Component" },
            { value: "uri", label: "Full URI" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
        <span className="text-xs text-muted-foreground">
          {scope === "component" ? "Encodes reserved chars (& = ? / etc.)" : "Preserves reserved URI chars"}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Input</span>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? "Type or paste text or URL…" : "Paste percent-encoded string…"}
            className="min-h-[200px] font-mono text-sm lg:min-h-[340px]"
            spellCheck={false}
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <CopyButton value={result.ok ? result.value : ""} />
          </div>
          <Textarea
            value={result.ok ? result.value : ""}
            readOnly
            className="min-h-[200px] font-mono text-sm lg:min-h-[340px]"
            spellCheck={false}
          />
          <div className="min-h-[1.25rem] text-xs">
            {!result.ok && <span className="text-destructive">{result.error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
