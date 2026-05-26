import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

type Direction = "csv2json" | "json2csv";

function parseCsv(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === delimiter) {
        row.push(field);
        field = "";
      } else if (ch === "\n") {
        row.push(field);
        rows.push(row);
        row = [];
        field = "";
      } else if (ch === "\r") {
        // skip; handled by \n
      } else {
        field += ch;
      }
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function escapeCsvField(value: unknown, delimiter: string): string {
  const s = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  if (s.includes('"') || s.includes(delimiter) || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function csvToJson(input: string, delimiter: string, hasHeader: boolean): string {
  const rows = parseCsv(input, delimiter).filter((r) => !(r.length === 1 && r[0] === ""));
  if (!rows.length) return "[]";
  if (!hasHeader) {
    return JSON.stringify(rows, null, 2);
  }
  const [header, ...body] = rows;
  const out = body.map((row) => {
    const obj: Record<string, string> = {};
    header.forEach((key, i) => {
      obj[key] = row[i] ?? "";
    });
    return obj;
  });
  return JSON.stringify(out, null, 2);
}

function jsonToCsv(input: string, delimiter: string): string {
  const data = JSON.parse(input);
  if (!Array.isArray(data)) throw new Error("JSON must be an array of objects or arrays");
  if (!data.length) return "";
  if (Array.isArray(data[0])) {
    return data.map((row: unknown[]) => row.map((v) => escapeCsvField(v, delimiter)).join(delimiter)).join("\n");
  }
  const keys = Array.from(
    data.reduce((set: Set<string>, item: unknown) => {
      if (item && typeof item === "object") for (const k of Object.keys(item)) set.add(k);
      return set;
    }, new Set<string>()),
  );
  const lines = [keys.map((k) => escapeCsvField(k, delimiter)).join(delimiter)];
  for (const item of data) {
    const obj = (item ?? {}) as Record<string, unknown>;
    lines.push(keys.map((k) => escapeCsvField(obj[k], delimiter)).join(delimiter));
  }
  return lines.join("\n");
}

export default function CsvJsonTool() {
  const [direction, setDirection] = useState<Direction>("csv2json");
  const [input, setInput] = useState("name,role\nada,creator\ngrace,admiral");
  const [delimiter, setDelimiter] = useState(",");
  const [hasHeader, setHasHeader] = useState(true);

  const result = useMemo(() => {
    if (!input.trim()) return { ok: true as const, value: "" };
    try {
      const value =
        direction === "csv2json"
          ? csvToJson(input, delimiter, hasHeader)
          : jsonToCsv(input, delimiter);
      return { ok: true as const, value };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Conversion failed" };
    }
  }, [input, direction, delimiter, hasHeader]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Direction"
          value={direction}
          onChange={(v) => setDirection(v as Direction)}
          options={[
            { value: "csv2json", label: "CSV → JSON" },
            { value: "json2csv", label: "JSON → CSV" },
          ]}
        />

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Delimiter</span>
          <SegmentedControl
            size="sm"
            ariaLabel="Delimiter"
            value={delimiter}
            onChange={setDelimiter}
            options={[
              { value: ",", label: "," },
              { value: ";", label: ";" },
              { value: "\t", label: "\\t" },
              { value: "|", label: "|" },
            ]}
          />
        </div>

        {direction === "csv2json" && (
          <Checkbox
            label="First row is header"
            checked={hasHeader}
            onChange={(e) => setHasHeader(e.target.checked)}
          />
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={() => setInput("")}
          disabled={!input}
          className="ml-auto"
        >
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">{direction === "csv2json" ? "CSV" : "JSON"}</span>
          <CodeEditor
            value={input}
            onChange={setInput}
            language={direction === "csv2json" ? "plain" : "json"}
            placeholder={direction === "csv2json" ? "name,role\nada,creator" : '[{"name":"ada"}]'}
            minHeight="220px"
            className="lg:min-h-[300px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{direction === "csv2json" ? "JSON" : "CSV"}</span>
            <CopyButton value={result.ok ? result.value : ""} />
          </div>
          <CodeEditor
            value={result.ok ? result.value : ""}
            language={direction === "csv2json" ? "json" : "plain"}
            readOnly
            minHeight="220px"
            className="lg:min-h-[300px]"
          />
          {!result.ok && <p className="text-xs text-destructive">{result.error}</p>}
        </div>
      </div>
    </div>
  );
}
