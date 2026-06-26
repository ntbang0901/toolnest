import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/tools/code-editor";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

type Mode = "encode" | "decode";

function encode(input: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const bytes = new TextEncoder().encode(input);
    return { ok: true, value: Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(" ") };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to encode" };
  }
}

function decode(input: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const hex = input.trim().replace(/\s+/g, "");
    if (hex.length % 2 !== 0) return { ok: false, error: "Hex string must have even length" };
    if (!/^[0-9a-fA-F]*$/.test(hex)) return { ok: false, error: "Invalid hex characters" };
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
    }
    return { ok: true, value: new TextDecoder().decode(bytes) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to decode" };
  }
}

export default function HexEncodeTool() {
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
            { value: "encode", label: "Encode" },
            { value: "decode", label: "Decode" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            Input ({mode === "encode" ? "plain text" : "hex string"})
          </span>
          <CodeEditor
            value={input}
            onChange={setInput}
            language="plain"
            placeholder={mode === "encode" ? "Type or paste text…" : "Paste hex here (e.g. 48 65 6c 6c 6f)…"}
            minHeight="200px"
            className="lg:min-h-[340px]"
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
            className="lg:min-h-[340px]"
          />
          <div className="min-h-[1.25rem] text-xs">
            {!result.ok && <span className="text-destructive">{result.error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
