import { useMemo, useState } from "react";
import yaml from "js-yaml";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

type Direction = "yaml2json" | "json2yaml";

const SAMPLE = `name: toolnest
features:
  - json
  - base64
  - qr
version: 1
`;

function convert(input: string, dir: Direction, indent: number): string {
  if (!input.trim()) return "";
  if (dir === "yaml2json") {
    const parsed = yaml.load(input);
    return JSON.stringify(parsed, null, indent);
  }
  const parsed = JSON.parse(input);
  return yaml.dump(parsed, { indent, lineWidth: 120, noRefs: true });
}

export default function YamlJsonTool() {
  const [direction, setDirection] = useState<Direction>("yaml2json");
  const [input, setInput] = useState(SAMPLE);
  const [indent, setIndent] = useState<"2" | "4">("2");

  const result = useMemo(() => {
    try {
      return { ok: true as const, value: convert(input, direction, Number(indent)) };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Conversion failed" };
    }
  }, [input, direction, indent]);

  const fromLang = direction === "yaml2json" ? "yaml" : "json";
  const toLang = direction === "yaml2json" ? "json" : "yaml";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Direction"
          value={direction}
          onChange={(v) => setDirection(v as Direction)}
          options={[
            { value: "yaml2json", label: "YAML → JSON" },
            { value: "json2yaml", label: "JSON → YAML" },
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
        <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
          Sample
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{direction === "yaml2json" ? "YAML" : "JSON"}</span>
          <CodeEditor
            value={input}
            onChange={setInput}
            language={fromLang as "yaml" | "json"}
            minHeight="260px"
            className="lg:min-h-[380px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{direction === "yaml2json" ? "JSON" : "YAML"}</span>
            <CopyButton value={result.ok ? result.value : ""} />
          </div>
          <CodeEditor
            value={result.ok ? result.value : ""}
            language={toLang as "yaml" | "json"}
            readOnly
            minHeight="260px"
            className="lg:min-h-[380px]"
          />
          {!result.ok && <p className="text-xs text-destructive">{result.error}</p>}
        </div>
      </div>
    </div>
  );
}
