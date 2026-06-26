import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import jsBeautify from "js-beautify";
const { css: cssBeautify } = jsBeautify;

type Mode = "pretty" | "minify";

const SAMPLE = `.btn{padding:8px 12px;border-radius:6px;background:#14b8a6;color:#fff;content:"a{b}";}
.btn:hover{background:#0f9080;}@media(min-width:640px){.btn{padding:10px 16px;}}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}`;

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
      if (mode === "minify") return minify(input);
      return cssBeautify(input, {
        indent_size: Number(indent),
        indent_char: " ",
        newline_between_rules: true,
        selector_separator_newline: true,
        end_with_newline: false,
      });
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
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Input</span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
                Sample
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
                Clear
              </Button>
            </div>
          </div>
          <CodeEditor
            value={input}
            onChange={setInput}
            language="css"
            placeholder="Paste CSS / SCSS / LESS here…"
            minHeight="280px"
            className="lg:min-h-[440px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-muted-foreground">Output</span>
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
