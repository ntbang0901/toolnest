import { useMemo, useState } from "react";
import { parse as parseTOML, stringify as stringifyTOML } from "smol-toml";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

const SAMPLE_TOML = `[package]
name = "my-app"
version = "0.1.0"
edition = "2021"

[dependencies]
serde = { version = "1.0", features = ["derive"] }
tokio = { version = "1", features = ["full"] }

[profile.release]
opt-level = 3
lto = true
`;

const SAMPLE_JSON = `{
  "package": {
    "name": "my-app",
    "version": "0.1.0",
    "edition": "2021"
  },
  "dependencies": {
    "serde": { "version": "1.0", "features": ["derive"] },
    "tokio": { "version": "1", "features": ["full"] }
  }
}`;

type Direction = "toml-to-json" | "json-to-toml";

export default function TomlJsonTool() {
  const [direction, setDirection] = useState<Direction>("toml-to-json");
  const [input, setInput] = useState(SAMPLE_TOML);

  const result = useMemo(() => {
    if (!input.trim()) return { ok: true, output: "" };
    try {
      if (direction === "toml-to-json") {
        const parsed = parseTOML(input);
        return { ok: true, output: JSON.stringify(parsed, null, 2) };
      } else {
        const parsed = JSON.parse(input);
        return { ok: true, output: stringifyTOML(parsed) };
      }
    } catch (e) {
      return { ok: false, output: "", error: (e as Error).message };
    }
  }, [input, direction]);

  function swap() {
    const next: Direction = direction === "toml-to-json" ? "json-to-toml" : "toml-to-json";
    setDirection(next);
    if (result.ok && result.output) setInput(result.output);
  }

  function loadExample() {
    setInput(direction === "toml-to-json" ? SAMPLE_TOML : SAMPLE_JSON);
  }

  const fromLabel = direction === "toml-to-json" ? "TOML" : "JSON";
  const toLabel = direction === "toml-to-json" ? "JSON" : "TOML";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex gap-1 rounded-lg border border-border bg-muted p-1">
          <button
            onClick={() => { setDirection("toml-to-json"); setInput(SAMPLE_TOML); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${direction === "toml-to-json" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            TOML → JSON
          </button>
          <button
            onClick={() => { setDirection("json-to-toml"); setInput(SAMPLE_JSON); }}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${direction === "json-to-toml" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            JSON → TOML
          </button>
        </div>
        <Button variant="ghost" size="sm" onClick={loadExample}>Example</Button>
        <Button variant="outline" size="sm" onClick={swap} disabled={!result.ok || !result.output}>
          ⇄ Swap
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">{fromLabel}</label>
          <CodeEditor
            value={input}
            onChange={setInput}
            language={direction === "toml-to-json" ? "plain" : "json"}
            minHeight="320px"
          />
          {"error" in result && result.error && (
            <p className="text-xs text-destructive">{result.error}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">{toLabel}</label>
            {result.ok && result.output && <CopyButton value={result.output} label="" />}
          </div>
          <CodeEditor
            value={result.ok ? result.output : ""}
            language={direction === "toml-to-json" ? "json" : "plain"}
            readOnly
            minHeight="320px"
            placeholder="Output will appear here…"
          />
        </div>
      </div>
    </div>
  );
}
