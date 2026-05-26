import { useMemo, useState } from "react";
import { JSONPath } from "jsonpath-plus";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

const SAMPLE = `{
  "store": {
    "books": [
      { "title": "Toolnest", "price": 0, "tags": ["dev", "tools"] },
      { "title": "Astro", "price": 12, "tags": ["web", "ssg"] },
      { "title": "Tailwind", "price": 8, "tags": ["css", "design"] }
    ],
    "currency": "USD"
  }
}`;

const PRESETS = [
  { label: "All titles", path: "$.store.books[*].title" },
  { label: "Free items", path: "$.store.books[?(@.price==0)]" },
  { label: "Tags (flat)", path: "$..tags[*]" },
  { label: "Last book", path: "$.store.books[-1:]" },
];

export default function JsonpathTool() {
  const [json, setJson] = useState(SAMPLE);
  const [path, setPath] = useState("$.store.books[*].title");

  const result = useMemo(() => {
    if (!json.trim()) return { ok: true as const, value: "", error: null };
    let parsed: unknown;
    try {
      parsed = JSON.parse(json);
    } catch (err) {
      return { ok: false as const, value: "", error: `JSON parse: ${(err as Error).message}` };
    }
    if (!path.trim()) return { ok: true as const, value: JSON.stringify(parsed, null, 2), error: null };
    try {
      const matches = JSONPath({ path, json: parsed as object });
      return { ok: true as const, value: JSON.stringify(matches, null, 2), error: null };
    } catch (err) {
      return { ok: false as const, value: "", error: `Path: ${(err as Error).message}` };
    }
  }, [json, path]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="jp-path">JSONPath</label>
        <Input
          id="jp-path"
          value={path}
          onChange={(e) => setPath(e.target.value)}
          placeholder="$..price"
          className="font-mono"
          spellCheck={false}
        />
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.path} variant="outline" size="sm" onClick={() => setPath(p.path)}>
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">JSON</span>
          <CodeEditor
            value={json}
            onChange={setJson}
            language="json"
            minHeight="280px"
            className="lg:min-h-[400px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Matches</span>
            <CopyButton value={result.value} />
          </div>
          <CodeEditor
            value={result.value}
            language="json"
            readOnly
            minHeight="280px"
            className="lg:min-h-[400px]"
          />
          {result.error && <p className="text-xs text-destructive">{result.error}</p>}
        </div>
      </div>
    </div>
  );
}
