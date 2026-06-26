import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/tools/code-editor";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

type Mode = "encode" | "decode";

interface EncodeResult {
  component: string;
  full: string;
}

function encodeInput(input: string): { ok: true; value: EncodeResult } | { ok: false; error: string } {
  try {
    return {
      ok: true,
      value: {
        component: encodeURIComponent(input),
        full: encodeURI(input),
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to encode" };
  }
}

function decodeInput(input: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    return { ok: true, value: decodeURIComponent(input) };
  } catch {
    return { ok: false, error: "Invalid percent-encoded string" };
  }
}

export default function UriComponentTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");

  const encodeResult = useMemo(() => {
    if (!input || mode !== "encode") return null;
    return encodeInput(input);
  }, [input, mode]);

  const decodeResult = useMemo(() => {
    if (!input || mode !== "decode") return null;
    return decodeInput(input);
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

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Input</span>
        <CodeEditor
          value={input}
          onChange={setInput}
          language="plain"
          placeholder={mode === "encode" ? "Type or paste text to encode…" : "Paste percent-encoded string…"}
          minHeight="120px"
        />
      </div>

      {mode === "encode" && encodeResult && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">encodeURIComponent</span>
                <p className="text-xs text-muted-foreground">Encodes all special chars — for query params, path segments</p>
              </div>
              <CopyButton value={encodeResult.ok ? encodeResult.value.component : ""} />
            </div>
            <CodeEditor
              value={encodeResult.ok ? encodeResult.value.component : ""}
              readOnly
              language="plain"
              minHeight="160px"
            />
            {!encodeResult.ok && (
              <span className="text-xs text-destructive">{encodeResult.error}</span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">encodeURI</span>
                <p className="text-xs text-muted-foreground">Preserves URI structure chars (:, /, ?, #, @) — for full URLs</p>
              </div>
              <CopyButton value={encodeResult.ok ? encodeResult.value.full : ""} />
            </div>
            <CodeEditor
              value={encodeResult.ok ? encodeResult.value.full : ""}
              readOnly
              language="plain"
              minHeight="160px"
            />
          </div>
        </div>
      )}

      {mode === "decode" && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Decoded (decodeURIComponent)</span>
            <CopyButton value={decodeResult?.ok ? decodeResult.value : ""} />
          </div>
          <CodeEditor
            value={decodeResult?.ok ? decodeResult.value : ""}
            readOnly
            language="plain"
            minHeight="160px"
          />
          <div className="min-h-[1.25rem] text-xs">
            {decodeResult && !decodeResult.ok && (
              <span className="text-destructive">{decodeResult.error}</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
