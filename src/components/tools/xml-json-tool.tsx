import { useMemo, useState } from "react";
import { XMLParser, XMLBuilder } from "fast-xml-parser";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

type Direction = "xml2json" | "json2xml";

const SAMPLE_XML = `<book id="1"><title>Toolnest</title><tags><tag>dev</tag><tag>tools</tag></tags></book>`;

function convert(input: string, dir: Direction, indent: number): string {
  if (!input.trim()) return "";
  if (dir === "xml2json") {
    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
    const obj = parser.parse(input);
    return JSON.stringify(obj, null, indent);
  }
  const obj = JSON.parse(input);
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    format: true,
    indentBy: " ".repeat(indent),
  });
  return builder.build(obj);
}

export default function XmlJsonTool() {
  const [direction, setDirection] = useState<Direction>("xml2json");
  const [input, setInput] = useState(SAMPLE_XML);
  const [indent, setIndent] = useState<"2" | "4">("2");

  const result = useMemo(() => {
    try {
      return { ok: true as const, value: convert(input, direction, Number(indent)) };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Failed" };
    }
  }, [input, direction, indent]);

  const fromLang = direction === "xml2json" ? "html" : "json"; // html lang handles XML well enough
  const toLang = direction === "xml2json" ? "json" : "html";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Direction"
          value={direction}
          onChange={(v) => setDirection(v as Direction)}
          options={[
            { value: "xml2json", label: "XML → JSON" },
            { value: "json2xml", label: "JSON → XML" },
          ]}
        />
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() =>
            setInput(direction === "xml2json" ? SAMPLE_XML : '{"book":{"@_id":"1","title":"Toolnest"}}')
          }
        >
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
          language={fromLang as "html" | "json"}
          minHeight="260px"
          className="lg:min-h-[400px]"
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <CopyButton value={result.ok ? result.value : ""} />
          </div>
          <CodeEditor
            value={result.ok ? result.value : ""}
            language={toLang as "html" | "json"}
            readOnly
            minHeight="260px"
            className="lg:min-h-[400px]"
          />
          {!result.ok && <p className="text-xs text-destructive">{result.error}</p>}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Attributes use the <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">@_</code> prefix
        (e.g. <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">@_id</code>).
      </p>
    </div>
  );
}
