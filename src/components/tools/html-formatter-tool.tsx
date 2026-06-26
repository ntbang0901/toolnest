import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import jsBeautify from "js-beautify";
const { html: htmlBeautify } = jsBeautify;

type Mode = "pretty" | "minify";

const SAMPLE = `<!doctype html><html><head><meta charset="utf-8"><title>Hi</title></head><body><main><h1>Hello</h1><p class="lead">A short paragraph with <strong>bold</strong> and <a href="#">link</a>.</p><ul><li>One</li><li>Two</li></ul><script>console.log("hello world");</script></main></body></html>`;

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
      if (mode === "minify") return minify(input);
      return htmlBeautify(input, {
        indent_size: Number(indent),
        indent_char: " ",
        max_preserve_newlines: 1,
        preserve_newlines: true,
        indent_scripts: "normal",
        end_with_newline: false,
        wrap_line_length: 0,
        indent_inner_html: false,
        unformatted: ["code", "pre", "em", "strong", "span"],
        content_unformatted: ["pre", "textarea"],
        extra_liners: [],
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
    </div>
  );
}
