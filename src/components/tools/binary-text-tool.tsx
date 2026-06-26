import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/tools/code-editor";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

type Mode = "encode" | "decode";

function encode(input: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const bytes = new TextEncoder().encode(input);
    return {
      ok: true,
      value: Array.from(bytes)
        .map((b) => b.toString(2).padStart(8, "0"))
        .join(" "),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to encode" };
  }
}

function decode(input: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const groups = input.trim().split(/\s+/);
    if (groups.some((g) => !/^[01]{8}$/.test(g))) {
      return { ok: false, error: "Each group must be exactly 8 binary digits (0s and 1s)" };
    }
    const bytes = new Uint8Array(groups.map((g) => parseInt(g, 2)));
    return { ok: true, value: new TextDecoder().decode(bytes) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to decode" };
  }
}

export default function BinaryTextTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    if (!input) return { ok: true as const, value: "" };
    return mode === "encode" ? encode(input) : decode(input);
  }, [input, mode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SegmentedControl
          ariaLabel="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: "encode", label: "Text → Binary" },
            { value: "decode", label: "Binary → Text" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            Input ({mode === "encode" ? "plain text" : "binary (space-separated 8-bit groups)"})
          </span>
          <CodeEditor
            value={input}
            onChange={(v) => setInput(v)}
            language="plain"
            placeholder={
              mode === "encode"
                ? "Type or paste text…"
                : "Paste binary here (e.g. 01001000 01100101 01101100 01101100 01101111)…"
            }
            minHeight="200px"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <CopyButton value={result.ok ? result.value : ""} />
          </div>
          <CodeEditor
            value={result.ok ? result.value : ""}
            readOnly
            language="plain"
            minHeight="200px"
          />
          <div className="min-h-[1.25rem] text-xs">
            {!result.ok && <span className="text-destructive">{result.error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
