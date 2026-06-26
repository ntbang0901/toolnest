import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/tools/code-editor";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

type Mode = "encode" | "decode";

function encodeDomain(input: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const trimmed = input.trim();
    // Use URL API to let the browser do the IDN encoding
    const url = new URL("https://" + trimmed);
    return { ok: true, value: url.hostname };
  } catch {
    return { ok: false, error: "Invalid domain name" };
  }
}

function decodeDomain(input: string): { ok: true; value: string } | { ok: false; error: string } {
  try {
    const trimmed = input.trim();
    // Use URL API — modern browsers expose the decoded unicode hostname via
    // the unicode property trick, but we can also rely on the fact that
    // URL normalizes punycode labels. For decoding we use a different approach:
    // convert each punycode label back via the Intl or a manual decode.
    const url = new URL("https://" + trimmed);
    const ascii = url.hostname;
    // Decode each label manually using the browser's built-in encoding
    const decoded = ascii
      .split(".")
      .map((label) => {
        if (!label.startsWith("xn--")) return label;
        // We can rely on the browser's own display form through a round-trip:
        // build an anchor and let the browser decode it
        try {
          const a = document.createElement("a");
          a.href = "https://" + label + ".example";
          return a.hostname.split(".")[0];
        } catch {
          return label;
        }
      })
      .join(".");
    return { ok: true, value: decoded };
  } catch {
    return { ok: false, error: "Invalid Punycode domain" };
  }
}

export default function PunycodeTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    if (!input) return { ok: true as const, value: "" };
    return mode === "encode" ? encodeDomain(input) : decodeDomain(input);
  }, [input, mode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SegmentedControl
          ariaLabel="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: "encode", label: "Unicode → Punycode" },
            { value: "decode", label: "Punycode → Unicode" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            Input ({mode === "encode" ? "unicode domain (e.g. münchen.de)" : "punycode domain (e.g. xn--mnchen-3ya.de)"})
          </span>
          <CodeEditor
            value={input}
            onChange={setInput}
            language="plain"
            placeholder={
              mode === "encode" ? "Enter a unicode domain name…" : "Enter a punycode domain name…"
            }
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
