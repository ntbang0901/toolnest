import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

type Mode = "pretty" | "minify";

const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta",
  "param", "source", "track", "wbr",
]);

const SAMPLE = `<!doctype html><html><head><meta charset="utf-8"><title>Hi</title></head><body><main><h1>Hello</h1><p class="lead">A short paragraph.</p><ul><li>One</li><li>Two</li></ul></main></body></html>`;

function tokenize(input: string): Array<{ type: "tag" | "text" | "comment" | "doctype"; value: string }> {
  const tokens: Array<{ type: "tag" | "text" | "comment" | "doctype"; value: string }> = [];
  let i = 0;
  while (i < input.length) {
    if (input.startsWith("<!--", i)) {
      const end = input.indexOf("-->", i);
      const stop = end === -1 ? input.length : end + 3;
      tokens.push({ type: "comment", value: input.slice(i, stop) });
      i = stop;
      continue;
    }
    if (/^<!doctype/i.test(input.slice(i, i + 9))) {
      const end = input.indexOf(">", i);
      const stop = end === -1 ? input.length : end + 1;
      tokens.push({ type: "doctype", value: input.slice(i, stop) });
      i = stop;
      continue;
    }
    if (input[i] === "<") {
      const end = input.indexOf(">", i);
      const stop = end === -1 ? input.length : end + 1;
      tokens.push({ type: "tag", value: input.slice(i, stop) });
      i = stop;
      continue;
    }
    const next = input.indexOf("<", i);
    const stop = next === -1 ? input.length : next;
    const value = input.slice(i, stop);
    if (value.trim()) tokens.push({ type: "text", value: value.trim() });
    i = stop;
  }
  return tokens;
}

function format(input: string, indent: number): string {
  const tokens = tokenize(input);
  const out: string[] = [];
  let depth = 0;
  const pad = () => " ".repeat(depth * indent);
  for (const t of tokens) {
    if (t.type === "doctype" || t.type === "comment") { out.push(pad() + t.value); continue; }
    if (t.type === "text") { out.push(pad() + t.value); continue; }
    const v = t.value;
    if (v.startsWith("</")) {
      depth = Math.max(0, depth - 1);
      out.push(pad() + v);
    } else if (v.endsWith("/>") || VOID.has(v.match(/^<\s*([a-zA-Z0-9-]+)/)?.[1]?.toLowerCase() ?? "")) {
      out.push(pad() + v);
    } else {
      out.push(pad() + v);
      depth++;
    }
  }
  return out.join("\n");
}

function minify(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/>\s+</g, "><")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export default function HtmlFormatterTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("pretty");
  const [indent, setIndent] = useState<"2" | "4">("2");

  const output = useMemo(() => {
    if (!input.trim()) return "";
    try {
      return mode === "pretty" ? format(input, Number(indent)) : minify(input);
    } catch (err) {
      return err instanceof Error ? err.message : "Failed";
    }
  }, [input, mode, indent]);

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
        {mode === "pretty" && (
          <SegmentedControl
            size="sm"
            ariaLabel="Indent"
            value={indent}
            onChange={(v) => setIndent(v as "2" | "4")}
            options={[
              { value: "2", label: "2 sp" },
              { value: "4", label: "4 sp" },
            ]}
          />
        )}
        <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
          Sample
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CodeEditor
          value={input}
          onChange={setInput}
          language="html"
          placeholder="Paste HTML here…"
          minHeight="280px"
          className="lg:min-h-[440px]"
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
            minHeight="280px"
            className="lg:min-h-[440px]"
          />
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Lightweight formatter — handles common tag structure, void elements, comments, doctype.
      </p>
    </div>
  );
}
