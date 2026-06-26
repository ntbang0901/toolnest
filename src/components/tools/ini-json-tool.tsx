import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

type Direction = "ini2json" | "json2ini";

const SAMPLE_INI = `; Application configuration
[database]
host = localhost
port = 5432
name = myapp

[server]
host = 0.0.0.0
port = 8080
debug = true

version = 1.0.0
`;

const SAMPLE_JSON = `{
  "database": {
    "host": "localhost",
    "port": "5432",
    "name": "myapp"
  },
  "server": {
    "host": "0.0.0.0",
    "port": "8080",
    "debug": "true"
  },
  "version": "1.0.0"
}`;

function parseIni(input: string): Record<string, unknown> {
  const result: Record<string, Record<string, string> | string> = {};
  let currentSection: string | null = null;

  for (const raw of input.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith(";") || line.startsWith("#")) continue;

    const sectionMatch = line.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1].trim();
      result[currentSection] = {};
      continue;
    }

    const eqIdx = line.indexOf("=");
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();

    if (currentSection) {
      (result[currentSection] as Record<string, string>)[key] = value;
    } else {
      result[key] = value;
    }
  }

  return result;
}

function stringifyIni(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  const sections: [string, Record<string, unknown>][] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      sections.push([key, value as Record<string, unknown>]);
    } else {
      lines.push(`${key} = ${String(value)}`);
    }
  }

  for (const [section, entries] of sections) {
    if (lines.length > 0) lines.push("");
    lines.push(`[${section}]`);
    for (const [k, v] of Object.entries(entries)) {
      lines.push(`${k} = ${String(v)}`);
    }
  }

  return lines.join("\n") + "\n";
}

function convert(input: string, dir: Direction): string {
  if (!input.trim()) return "";
  if (dir === "ini2json") {
    const parsed = parseIni(input);
    return JSON.stringify(parsed, null, 2);
  }
  const parsed = JSON.parse(input) as Record<string, unknown>;
  return stringifyIni(parsed);
}

export default function IniJsonTool() {
  const [direction, setDirection] = useState<Direction>("ini2json");
  const [input, setInput] = useState(SAMPLE_INI);

  const result = useMemo(() => {
    try {
      return { ok: true as const, value: convert(input, direction) };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Conversion failed" };
    }
  }, [input, direction]);

  const fromLang = direction === "ini2json" ? "ini" : "json";
  const toLang = direction === "ini2json" ? "json" : "ini";
  const fromLabel = direction === "ini2json" ? "INI" : "JSON";
  const toLabel = direction === "ini2json" ? "JSON" : "INI";

  function handleSwap() {
    const newDir: Direction = direction === "ini2json" ? "json2ini" : "ini2json";
    setDirection(newDir);
    setInput(result.ok ? result.value : "");
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Direction"
          value={direction}
          onChange={(v) => setDirection(v as Direction)}
          options={[
            { value: "ini2json", label: "INI → JSON" },
            { value: "json2ini", label: "JSON → INI" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={handleSwap} disabled={!result.ok}>
          Swap
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setInput(direction === "ini2json" ? SAMPLE_INI : SAMPLE_JSON)}
        >
          Sample
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex min-h-8 items-center">
            <span className="text-sm font-medium">{fromLabel}</span>
          </div>
          <CodeEditor
            value={input}
            onChange={setInput}
            language={fromLang === "json" ? "json" : undefined}
            minHeight="260px"
            className="lg:min-h-[380px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex min-h-8 items-center justify-between">
            <span className="text-sm font-medium">{toLabel}</span>
            <CopyButton value={result.ok ? result.value : ""} />
          </div>
          <CodeEditor
            value={result.ok ? result.value : ""}
            language={toLang === "json" ? "json" : undefined}
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
