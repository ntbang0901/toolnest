import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";

type Mode = "encode" | "decode";

function encode(input: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const bytes = new TextEncoder().encode(input);
    let binary = "";
    bytes.forEach((b) => (binary += String.fromCharCode(b)));
    return { ok: true, value: btoa(binary) };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to encode" };
  }
}

function decode(input: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const cleaned = input.replace(/\s+/g, "");
    const binary = atob(cleaned);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return { ok: true, value: new TextDecoder().decode(bytes) };
  } catch {
    return { ok: false, error: "Input is not valid Base64" };
  }
}

export default function Base64Tool() {
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
            Input ({mode === "encode" ? "plain text" : "base64"})
          </span>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "encode" ? "Type or paste text…" : "Paste base64 here…"}
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
