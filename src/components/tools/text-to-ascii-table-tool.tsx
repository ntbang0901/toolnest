import { useState, useMemo } from "react";
import { CodeEditor } from "@/components/tools/code-editor";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";

type TableStyle = "simple" | "mysql" | "unicode" | "markdown" | "compact";

const DEFAULT_INPUT = `Name,Age,City,Role
Alice,30,New York,Engineer
Bob,25,San Francisco,Designer
Charlie,35,London,Manager
Diana,28,Berlin,Developer`;

function detectDelimiter(input: string): string {
  const firstLine = input.split("\n")[0] ?? "";
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const semicolonCount = (firstLine.match(/;/g) ?? []).length;
  const pipeCount = (firstLine.match(/\|/g) ?? []).length;
  const counts = [
    { d: "\t", n: tabCount },
    { d: ",", n: commaCount },
    { d: ";", n: semicolonCount },
    { d: "|", n: pipeCount },
  ];
  counts.sort((a, b) => b.n - a.n);
  return counts[0].n > 0 ? counts[0].d : ",";
}

function parseDelimited(input: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  for (const line of input.split("\n")) {
    const trimmed = line.replace(/\r$/, "");
    if (trimmed === "") continue;
    const cols: string[] = [];
    let field = "";
    let inQuotes = false;
    for (let i = 0; i < trimmed.length; i++) {
      const ch = trimmed[i];
      if (inQuotes) {
        if (ch === '"') {
          if (trimmed[i + 1] === '"') {
            field += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (trimmed.startsWith(delimiter, i)) {
        cols.push(field);
        field = "";
        i += delimiter.length - 1;
      } else {
        field += ch;
      }
    }
    cols.push(field);
    rows.push(cols);
  }
  return rows;
}

function colWidths(rows: string[][]): number[] {
  if (rows.length === 0) return [];
  const numCols = Math.max(...rows.map((r) => r.length));
  const widths = Array(numCols).fill(0) as number[];
  for (const row of rows) {
    for (let i = 0; i < numCols; i++) {
      widths[i] = Math.max(widths[i], (row[i] ?? "").length);
    }
  }
  return widths;
}

function pad(str: string, width: number): string {
  return str + " ".repeat(width - str.length);
}

function buildSimple(header: string[] | null, body: string[][], widths: number[]): string {
  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
  const rowLine = (row: string[]) =>
    "| " + widths.map((w, i) => pad(row[i] ?? "", w)).join(" | ") + " |";
  const lines: string[] = [];
  lines.push(sep);
  if (header) {
    lines.push(rowLine(header));
    lines.push(sep);
  }
  for (const row of body) {
    lines.push(rowLine(row));
  }
  lines.push(sep);
  return lines.join("\n");
}

function buildMysql(header: string[] | null, body: string[][], widths: number[]): string {
  const sep = "+" + widths.map((w) => "-".repeat(w + 2)).join("+") + "+";
  const rowLine = (row: string[]) =>
    "| " + widths.map((w, i) => pad(row[i] ?? "", w)).join(" | ") + " |";
  const lines: string[] = [];
  lines.push(sep);
  if (header) {
    lines.push(rowLine(header));
    lines.push(sep);
  }
  for (const row of body) {
    lines.push(rowLine(row));
  }
  lines.push(sep);
  return lines.join("\n");
}

function buildUnicode(header: string[] | null, body: string[][], widths: number[]): string {
  const top = "┌" + widths.map((w) => "─".repeat(w + 2)).join("┬") + "┐";
  const mid = "├" + widths.map((w) => "─".repeat(w + 2)).join("┼") + "┤";
  const bot = "└" + widths.map((w) => "─".repeat(w + 2)).join("┴") + "┘";
  const rowLine = (row: string[]) =>
    "│ " + widths.map((w, i) => pad(row[i] ?? "", w)).join(" │ ") + " │";
  const lines: string[] = [];
  lines.push(top);
  if (header) {
    lines.push(rowLine(header));
    lines.push(mid);
  }
  for (let i = 0; i < body.length; i++) {
    lines.push(rowLine(body[i]));
    if (i < body.length - 1) lines.push(mid);
  }
  lines.push(bot);
  return lines.join("\n");
}

function buildMarkdown(header: string[] | null, body: string[][], widths: number[]): string {
  const rowLine = (row: string[]) =>
    "| " + widths.map((w, i) => pad(row[i] ?? "", w)).join(" | ") + " |";
  const sepLine = "| " + widths.map((w) => "-".repeat(w)).join(" | ") + " |";
  const lines: string[] = [];
  if (header) {
    lines.push(rowLine(header));
    lines.push(sepLine);
  } else {
    // no header — markdown needs one, use first body row as header
    const [first, ...rest] = body;
    if (first) {
      lines.push(rowLine(first));
      lines.push(sepLine);
      for (const row of rest) lines.push(rowLine(row));
      return lines.join("\n");
    }
  }
  for (const row of body) lines.push(rowLine(row));
  return lines.join("\n");
}

function buildCompact(header: string[] | null, body: string[][], widths: number[]): string {
  const sep = " " + widths.map((w) => "-".repeat(w)).join("  ") + " ";
  const rowLine = (row: string[]) =>
    " " + widths.map((w, i) => pad(row[i] ?? "", w)).join("  ") + " ";
  const lines: string[] = [];
  if (header) {
    lines.push(rowLine(header));
    lines.push(sep);
  }
  for (const row of body) lines.push(rowLine(row));
  return lines.join("\n");
}

function buildTable(
  rows: string[][],
  style: TableStyle,
  firstRowHeader: boolean,
): string {
  if (rows.length === 0) return "";
  const header = firstRowHeader ? rows[0] : null;
  const body = firstRowHeader ? rows.slice(1) : rows;
  const allRows = header ? [header, ...body] : body;
  const widths = colWidths(allRows);

  switch (style) {
    case "simple":
      return buildSimple(header, body, widths);
    case "mysql":
      return buildMysql(header, body, widths);
    case "unicode":
      return buildUnicode(header, body, widths);
    case "markdown":
      return buildMarkdown(header, body, widths);
    case "compact":
      return buildCompact(header, body, widths);
  }
}

export default function TextToAsciiTableTool() {
  const [input, setInput] = useState(DEFAULT_INPUT);
  const [style, setStyle] = useState<TableStyle>("unicode");
  const [firstRowHeader, setFirstRowHeader] = useState(true);
  const [customDelimiter, setCustomDelimiter] = useState("");

  const detectedDelimiter = useMemo(() => detectDelimiter(input), [input]);
  const delimiter = customDelimiter !== "" ? customDelimiter : detectedDelimiter;

  const result = useMemo(() => {
    if (!input.trim()) return { ok: true as const, value: "" };
    try {
      const rows = parseDelimited(input, delimiter);
      if (rows.length === 0) return { ok: true as const, value: "" };
      const value = buildTable(rows, style, firstRowHeader);
      return { ok: true as const, value };
    } catch (err) {
      return {
        ok: false as const,
        error: err instanceof Error ? err.message : "Failed to parse input",
      };
    }
  }, [input, delimiter, style, firstRowHeader]);

  const delimiterLabel =
    delimiter === "\t" ? "\\t (TSV)" : delimiter === "," ? ", (CSV)" : `"${delimiter}"`;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Style</span>
          <SegmentedControl
            ariaLabel="Table style"
            value={style}
            onChange={(v) => setStyle(v as TableStyle)}
            options={[
              { value: "simple", label: "Simple" },
              { value: "mysql", label: "MySQL" },
              { value: "unicode", label: "Unicode" },
              { value: "markdown", label: "Markdown" },
              { value: "compact", label: "Compact" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">
            Delimiter{customDelimiter === "" ? ` (auto: ${delimiterLabel})` : ""}
          </span>
          <Input
            value={customDelimiter}
            onChange={(e) => setCustomDelimiter(e.target.value)}
            placeholder="auto"
            className="h-8 w-20 font-mono text-sm"
            aria-label="Custom delimiter"
          />
        </div>

        <Checkbox
          label="First row is header"
          checked={firstRowHeader}
          onChange={(e) => setFirstRowHeader(e.target.checked)}
        />
      </div>

      {/* Input */}
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Input (CSV / TSV)</span>
        <CodeEditor
          value={input}
          onChange={setInput}
          language="plain"
          placeholder="Paste CSV or TSV data here…"
          minHeight="140px"
        />
      </div>

      {/* Output */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">ASCII Table</span>
          <CopyButton value={result.ok ? result.value : ""} />
        </div>
        {result.ok ? (
          <pre className="min-h-[140px] overflow-x-auto rounded-md border border-input bg-muted/40 p-3 font-mono text-sm leading-snug whitespace-pre">
            {result.value || <span className="text-muted-foreground">Output will appear here…</span>}
          </pre>
        ) : (
          <pre className="min-h-[140px] overflow-x-auto rounded-md border border-destructive/40 bg-muted/40 p-3 font-mono text-sm leading-snug whitespace-pre">
            <span className="text-destructive">{result.error}</span>
          </pre>
        )}
      </div>
    </div>
  );
}
