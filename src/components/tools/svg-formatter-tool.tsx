import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

type Mode = "pretty" | "minify";

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#14b8a6"/><path d="M8 12l3 3 5-6" stroke="white" stroke-width="2" fill="none"/></svg>`;

function pretty(input: string, indent: number): string {
  const pad = (n: number) => " ".repeat(n * indent);
  const tokens: string[] = [];
  let i = 0;
  while (i < input.length) {
    if (input[i] === "<") {
      const end = input.indexOf(">", i);
      const stop = end === -1 ? input.length : end + 1;
      tokens.push(input.slice(i, stop));
      i = stop;
    } else {
      const next = input.indexOf("<", i);
      const stop = next === -1 ? input.length : next;
      const t = input.slice(i, stop).trim();
      if (t) tokens.push(t);
      i = stop;
    }
  }
  let depth = 0;
  const lines: string[] = [];
  for (const t of tokens) {
    if (t.startsWith("</")) {
      depth = Math.max(0, depth - 1);
      lines.push(pad(depth) + t);
    } else if (t.startsWith("<") && t.endsWith("/>")) {
      lines.push(pad(depth) + t);
    } else if (t.startsWith("<")) {
      lines.push(pad(depth) + t);
      depth++;
    } else {
      lines.push(pad(depth) + t);
    }
  }
  return lines.join("\n");
}

function minify(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+\/>/g, "/>")
    .trim();
}

export default function SvgFormatterTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("pretty");

  const output = useMemo(() => {
    if (!input.trim()) return "";
    try {
      return mode === "pretty" ? pretty(input, 2) : minify(input);
    } catch (err) {
      return err instanceof Error ? err.message : "Failed";
    }
  }, [input, mode]);

  const original = new Blob([input]).size;
  const final = new Blob([output]).size;
  const saved = original > 0 && mode === "minify" ? Math.max(0, Math.round((1 - final / original) * 100)) : 0;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: "pretty", label: "Pretty" },
            { value: "minify", label: "Minify" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
          Sample
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
        {input && (
          <span className="ml-auto text-xs text-muted-foreground">
            {original} → {final} bytes
            {saved > 0 && <span className="ml-1">({saved}% smaller)</span>}
          </span>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CodeEditor
          value={input}
          onChange={setInput}
          language="html"
          placeholder="Paste SVG markup here…"
          minHeight="240px"
          className="lg:min-h-[360px]"
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <CopyButton value={output} />
          </div>
          <CodeEditor
            value={output}
            language="html"
            readOnly
            minHeight="240px"
            className="lg:min-h-[360px]"
          />
        </div>
      </div>

      {output && !output.startsWith("Failed") && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Preview</span>
          <div
            className="grid h-40 place-items-center rounded-md border border-border bg-muted/30 p-3"
            dangerouslySetInnerHTML={{ __html: output }}
          />
        </div>
      )}
    </div>
  );
}
