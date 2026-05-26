import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

type Mode = "pretty" | "minify";

const SAMPLE = `.btn{padding:8px 12px;border-radius:6px;background:#14b8a6;color:#fff;}
.btn:hover{background:#0f9080;}@media(min-width:640px){.btn{padding:10px 16px;}}`;

function format(input: string, indent: number): string {
  const pad = (n: number) => " ".repeat(n * indent);
  let depth = 0;
  let out = "";
  let buf = "";
  let inSel = true;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (ch === "{") {
      out += pad(depth) + buf.replace(/\s+/g, " ").trim() + " {\n";
      buf = ""; depth++; inSel = false; continue;
    }
    if (ch === "}") {
      if (buf.trim()) out += pad(depth) + buf.replace(/\s+/g, " ").trim() + (buf.trim().endsWith(";") ? "" : ";") + "\n";
      buf = ""; depth = Math.max(0, depth - 1);
      out += pad(depth) + "}\n"; inSel = true; continue;
    }
    if (ch === ";" && !inSel) {
      out += pad(depth) + buf.replace(/\s+/g, " ").trim() + ";\n";
      buf = ""; continue;
    }
    if (ch === "\n" || ch === "\r") { buf += " "; continue; }
    buf += ch;
  }
  if (buf.trim()) out += pad(depth) + buf.trim() + "\n";
  return out.replace(/\n{2,}/g, "\n").trim();
}

function minify(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>+~])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

export default function CssFormatterTool() {
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
          language="css"
          placeholder="Paste CSS / SCSS / LESS here…"
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
            language="css"
            readOnly
            minHeight="280px"
            className="lg:min-h-[440px]"
          />
        </div>
      </div>
    </div>
  );
}
