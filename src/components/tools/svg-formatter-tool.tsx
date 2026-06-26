import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import DOMPurify from "dompurify";

type Mode = "pretty" | "minify";

const SAMPLE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#14b8a6"/><path d="M8 12l3 3 5-6" stroke="white" stroke-width="2" fill="none"/></svg>`;

function prettyPrint(input: string, indentSize: number): string {
  // Use DOMParser for correct XML parsing — handles > in attribute values, CDATA, etc.
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "image/svg+xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error(parseError.textContent ?? "Invalid SVG");

  const pad = (n: number) => " ".repeat(n * indentSize);

  function serializeNode(node: Node, depth: number): string {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node.textContent ?? "").trim();
      return text ? pad(depth) + text : "";
    }
    if (node.nodeType === Node.COMMENT_NODE) {
      return pad(depth) + `<!--${node.textContent}-->`;
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as Element;
    const tag = el.tagName;
    const attrs = Array.from(el.attributes)
      .map((a) => `${a.name}="${a.value}"`)
      .join(" ");
    const openTag = attrs ? `<${tag} ${attrs}>` : `<${tag}>`;
    const selfClose = attrs ? `<${tag} ${attrs}/>` : `<${tag}/>`;

    const children = Array.from(el.childNodes)
      .map((c) => serializeNode(c, depth + 1))
      .filter(Boolean);

    if (children.length === 0) {
      // Self-close only if no children and no text content
      return pad(depth) + selfClose.replace(/>$/, "/>");
    }
    if (children.length === 1 && !children[0].includes("\n")) {
      // Inline single text child
      const inner = (el.childNodes[0].textContent ?? "").trim();
      return `${pad(depth)}<${tag}${attrs ? " " + attrs : ""}>${inner}</${tag}>`;
    }
    return [pad(depth) + openTag, ...children, pad(depth) + `</${tag}>`].join("\n");
  }

  const svgEl = doc.documentElement;
  return serializeNode(svgEl, 0);
}

function minifySvg(input: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(input, "image/svg+xml");
  const parseError = doc.querySelector("parsererror");
  if (parseError) throw new Error(parseError.textContent ?? "Invalid SVG");

  // Serialize via XMLSerializer for correct round-trip
  const serializer = new XMLSerializer();
  return serializer
    .serializeToString(doc)
    .replace(/\s{2,}/g, " ")
    .replace(/>\s+</g, "><")
    .replace(/\s+\/>/g, "/>")
    .trim();
}

export default function SvgFormatterTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("pretty");

  const result = useMemo(() => {
    if (!input.trim()) return { output: "", error: "" };
    try {
      const output = mode === "pretty" ? prettyPrint(input, 2) : minifySvg(input);
      return { output, error: "" };
    } catch (err) {
      return { output: "", error: err instanceof Error ? err.message : "Failed" };
    }
  }, [input, mode]);

  // Sanitize with DOMPurify — allow SVG elements/attributes but strip scripts/handlers
  const safePreview = useMemo(() => {
    if (!result.output) return "";
    return DOMPurify.sanitize(result.output, {
      USE_PROFILES: { svg: true, svgFilters: true },
      FORBID_TAGS: ["script", "foreignObject"],
      FORBID_ATTR: ["onload", "onerror", "onclick", "onmouseover"],
    });
  }, [result.output]);

  const original = new Blob([input]).size;
  const final = new Blob([result.output]).size;
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
        {input && !result.error && (
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
            <CopyButton value={result.output} />
          </div>
          <CodeEditor
            value={result.error ? result.error : result.output}
            language="html"
            readOnly
            minHeight="240px"
            className="lg:min-h-[360px]"
          />
        </div>
      </div>

      {result.error && (
        <p className="text-xs text-destructive">{result.error}</p>
      )}

      {safePreview && !result.error && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Preview</span>
          <div
            className="grid h-40 place-items-center rounded-md border border-border bg-muted/30 p-3"
            dangerouslySetInnerHTML={{ __html: safePreview }}
          />
        </div>
      )}
    </div>
  );
}
