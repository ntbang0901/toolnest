import { useMemo, useState } from "react";
import { search } from "jmespath";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import { formatInput } from "@/lib/format-input";
import { createJmespathCompletionSource } from "@/lib/jmespath-completions";

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
  { label: "All titles", query: "store.books[*].title" },
  { label: "Free items", query: "store.books[?price == `0`]" },
  { label: "Sorted by price", query: "sort_by(store.books, &price)[*].title" },
  { label: "Tags (flat)", query: "store.books[*].tags[]" },
];

export default function JsonQueryTool() {
  const [json, setJson] = useState(() => {
    const r = formatInput(SAMPLE, "json");
    return r.ok ? r.value : SAMPLE;
  });
  const [query, setQuery] = useState("store.books[*].title");

  const parsed = useMemo<{ data: unknown; error: string | null }>(() => {
    if (!json.trim()) return { data: undefined, error: null };
    try {
      return { data: JSON.parse(json), error: null };
    } catch (err) {
      return { data: undefined, error: `JSON parse: ${(err as Error).message}` };
    }
  }, [json]);

  const completionSource = useMemo(
    () =>
      parsed.data === undefined
        ? undefined
        : createJmespathCompletionSource(parsed.data),
    [parsed.data],
  );

  const result = useMemo(() => {
    if (parsed.error) return { value: "", error: parsed.error };
    if (parsed.data === undefined) return { value: "", error: null };
    if (!query.trim()) {
      return { value: JSON.stringify(parsed.data, null, 2), error: null };
    }
    try {
      const matches = search(parsed.data, query);
      return { value: JSON.stringify(matches, null, 2), error: null };
    } catch (err) {
      return { value: "", error: `Query: ${(err as Error).message}` };
    }
  }, [parsed, query]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">JMESPath query</span>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <Button
                key={p.query}
                variant="outline"
                size="sm"
                onClick={() => setQuery(p.query)}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
        <CodeEditor
          value={query}
          onChange={setQuery}
          language="plain"
          height="80px"
          placeholder="store.books[*].title"
          completionSource={completionSource}
        />
        <p className="text-xs text-muted-foreground">
          Autocomplete suggests fields and paths from your JSON, plus JMESPath
          functions and operators. Press Ctrl+Space to trigger it.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">JSON</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const r = formatInput(json, "json");
                if (r.ok) setJson(r.value);
              }}
              disabled={!json.trim()}
            >
              Format
            </Button>
          </div>
          <CodeEditor
            value={json}
            onChange={setJson}
            language="json"
            height="400px"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Result</span>
            <CopyButton value={result.value} />
          </div>
          <CodeEditor value={result.value} language="json" readOnly height="400px" />
          {result.error && <p className="text-xs text-destructive">{result.error}</p>}
        </div>
      </div>
    </div>
  );
}
