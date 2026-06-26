import { useState, useCallback, useMemo } from "react";
import { Plus, Trash2, AlignLeft, AlignCenter, AlignRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CodeEditor } from "@/components/tools/code-editor";
import { CopyButton } from "@/components/tools/copy-button";

// ─── Types ────────────────────────────────────────────────────────────────────

type Alignment = "left" | "center" | "right";

interface TableState {
  headers: string[];
  alignments: Alignment[];
  rows: string[][];
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_STATE: TableState = {
  headers: ["Name", "Role", "Location"],
  alignments: ["left", "left", "left"],
  rows: [
    ["Alice", "Engineer", "New York"],
    ["Bob", "Designer", "London"],
    ["Carol", "Manager", "Tokyo"],
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function alignmentMarker(a: Alignment): string {
  if (a === "center") return ":---:";
  if (a === "right") return "---:";
  return ":---";
}

function generateMarkdown(state: TableState, pretty: boolean): string {
  const { headers, alignments, rows } = state;
  const colCount = headers.length;

  if (pretty) {
    // Compute max width for each column
    const widths = headers.map((h, ci) => {
      const marker = alignmentMarker(alignments[ci]);
      const maxData = rows.reduce((m, row) => Math.max(m, (row[ci] ?? "").length), 0);
      return Math.max(h.length, marker.length, maxData, 3);
    });

    const pad = (s: string, w: number, align: Alignment) => {
      if (align === "right") return s.padStart(w);
      if (align === "center") {
        const total = w - s.length;
        const left = Math.floor(total / 2);
        const right = total - left;
        return " ".repeat(left) + s + " ".repeat(right);
      }
      return s.padEnd(w);
    };

    const headerLine = "| " + headers.map((h, i) => pad(h, widths[i], alignments[i])).join(" | ") + " |";
    const sepLine = "| " + alignments.map((a, i) => {
      const w = widths[i];
      if (a === "center") return ":" + "-".repeat(w - 2) + ":";
      if (a === "right") return "-".repeat(w - 1) + ":";
      return ":" + "-".repeat(w - 1);
    }).join(" | ") + " |";
    const dataLines = rows.map(
      (row) =>
        "| " +
        Array.from({ length: colCount }, (_, i) => pad(row[i] ?? "", widths[i], alignments[i])).join(" | ") +
        " |",
    );

    return [headerLine, sepLine, ...dataLines].join("\n");
  }

  // Compact
  const headerLine = "| " + headers.join(" | ") + " |";
  const sepLine = "| " + alignments.map(alignmentMarker).join(" | ") + " |";
  const dataLines = rows.map(
    (row) => "| " + Array.from({ length: colCount }, (_, i) => row[i] ?? "").join(" | ") + " |",
  );

  return [headerLine, sepLine, ...dataLines].join("\n");
}

function parseDelimited(text: string): string[][] | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== "");
  if (lines.length < 1) return null;

  // Detect delimiter: tab first, then comma
  const firstLine = lines[0];
  const delimiter = firstLine.includes("\t") ? "\t" : ",";

  // Simple split (no quoted-field handling needed for table paste)
  return lines.map((l) => l.split(delimiter).map((c) => c.trim()));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MarkdownTableGeneratorTool() {
  const [table, setTable] = useState<TableState>(DEFAULT_STATE);
  const [pretty, setPretty] = useState(false);
  const [importText, setImportText] = useState("");
  const [importError, setImportError] = useState("");

  // ── Cell / header editing ──────────────────────────────────────────────────

  const setHeader = useCallback((ci: number, value: string) => {
    setTable((prev) => {
      const headers = [...prev.headers];
      headers[ci] = value;
      return { ...prev, headers };
    });
  }, []);

  const setCell = useCallback((ri: number, ci: number, value: string) => {
    setTable((prev) => {
      const rows = prev.rows.map((r) => [...r]);
      rows[ri][ci] = value;
      return { ...prev, rows };
    });
  }, []);

  const setAlignment = useCallback((ci: number, alignment: Alignment) => {
    setTable((prev) => {
      const alignments = [...prev.alignments];
      alignments[ci] = alignment;
      return { ...prev, alignments };
    });
  }, []);

  // ── Row / column operations ────────────────────────────────────────────────

  const addRow = useCallback(() => {
    setTable((prev) => ({
      ...prev,
      rows: [...prev.rows, Array(prev.headers.length).fill("")],
    }));
  }, []);

  const deleteRow = useCallback((ri: number) => {
    setTable((prev) => ({
      ...prev,
      rows: prev.rows.filter((_, i) => i !== ri),
    }));
  }, []);

  const addColumn = useCallback(() => {
    setTable((prev) => ({
      headers: [...prev.headers, `Col ${prev.headers.length + 1}`],
      alignments: [...prev.alignments, "left"],
      rows: prev.rows.map((r) => [...r, ""]),
    }));
  }, []);

  const deleteColumn = useCallback((ci: number) => {
    setTable((prev) => ({
      headers: prev.headers.filter((_, i) => i !== ci),
      alignments: prev.alignments.filter((_, i) => i !== ci),
      rows: prev.rows.map((r) => r.filter((_, i) => i !== ci)),
    }));
  }, []);

  // ── Import ─────────────────────────────────────────────────────────────────

  const handleImport = useCallback(() => {
    setImportError("");
    const parsed = parseDelimited(importText);
    if (!parsed || parsed.length < 1) {
      setImportError("Could not parse input. Paste CSV or TSV with at least one row.");
      return;
    }
    const [headerRow, ...dataRows] = parsed;
    const colCount = headerRow.length;
    setTable({
      headers: headerRow,
      alignments: Array(colCount).fill("left"),
      rows: dataRows.map((r) => {
        // Pad or trim to colCount
        const row = [...r];
        while (row.length < colCount) row.push("");
        return row.slice(0, colCount);
      }),
    });
    setImportText("");
  }, [importText]);

  // Auto-detect paste in the import textarea
  const handleImportPaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      const text = e.clipboardData.getData("text");
      if (!text) return;
      setImportText(text);
      // Give state a tick to settle, then auto-import
      setTimeout(() => {
        setImportError("");
        const parsed = parseDelimited(text);
        if (!parsed || parsed.length < 1) {
          setImportError("Could not parse pasted input.");
          return;
        }
        const [headerRow, ...dataRows] = parsed;
        const colCount = headerRow.length;
        setTable({
          headers: headerRow,
          alignments: Array(colCount).fill("left"),
          rows: dataRows.map((r) => {
            const row = [...r];
            while (row.length < colCount) row.push("");
            return row.slice(0, colCount);
          }),
        });
        setImportText("");
      }, 0);
    },
    [],
  );

  // ── Markdown output ────────────────────────────────────────────────────────

  const markdown = useMemo(() => generateMarkdown(table, pretty), [table, pretty]);

  const colCount = table.headers.length;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-6">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={addRow}>
          <Plus className="h-3.5 w-3.5" />
          Add Row
        </Button>
        <Button variant="outline" size="sm" onClick={addColumn}>
          <Plus className="h-3.5 w-3.5" />
          Add Column
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <label className="flex items-center gap-1.5 cursor-pointer select-none text-sm text-muted-foreground">
            <input
              type="checkbox"
              className="accent-primary"
              checked={pretty}
              onChange={(e) => setPretty(e.target.checked)}
            />
            Pretty-print
          </label>
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full border-collapse text-sm">
          <thead>
            {/* Header row */}
            <tr className="bg-muted/50">
              {table.headers.map((h, ci) => (
                <th key={ci} className="border-b border-border p-0 font-normal">
                  <Input
                    value={h}
                    onChange={(e) => setHeader(ci, e.target.value)}
                    className="h-9 rounded-none border-0 bg-transparent font-semibold focus-visible:ring-inset focus-visible:ring-1"
                    placeholder={`Header ${ci + 1}`}
                    aria-label={`Column ${ci + 1} header`}
                  />
                </th>
              ))}
              {/* Delete column buttons header cell */}
              <th className="border-b border-border w-8 bg-muted/50" aria-label="Actions" />
            </tr>

            {/* Alignment row */}
            <tr className="bg-muted/30">
              {table.alignments.map((a, ci) => (
                <td key={ci} className="border-b border-border px-2 py-1">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setAlignment(ci, "left")}
                      className={`rounded p-1 transition-colors ${a === "left" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                      aria-label={`Align column ${ci + 1} left`}
                      title="Align left"
                    >
                      <AlignLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setAlignment(ci, "center")}
                      className={`rounded p-1 transition-colors ${a === "center" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                      aria-label={`Align column ${ci + 1} center`}
                      title="Align center"
                    >
                      <AlignCenter className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setAlignment(ci, "right")}
                      className={`rounded p-1 transition-colors ${a === "right" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}
                      aria-label={`Align column ${ci + 1} right`}
                      title="Align right"
                    >
                      <AlignRight className="h-3.5 w-3.5" />
                    </button>
                    {colCount > 1 && (
                      <button
                        onClick={() => deleteColumn(ci)}
                        className="ml-auto rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
                        aria-label={`Delete column ${ci + 1}`}
                        title="Delete column"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
              ))}
              <td className="border-b border-border w-8" />
            </tr>
          </thead>

          <tbody>
            {table.rows.map((row, ri) => (
              <tr key={ri} className="group hover:bg-muted/20 transition-colors">
                {Array.from({ length: colCount }, (_, ci) => (
                  <td key={ci} className="border-b border-border p-0 last-of-type:border-b-0">
                    <Input
                      value={row[ci] ?? ""}
                      onChange={(e) => setCell(ri, ci, e.target.value)}
                      className="h-9 rounded-none border-0 bg-transparent focus-visible:ring-inset focus-visible:ring-1"
                      placeholder="—"
                      aria-label={`Row ${ri + 1}, column ${ci + 1}`}
                    />
                  </td>
                ))}
                <td className="border-b border-border w-8 text-center last-of-type:border-b-0">
                  {table.rows.length > 1 && (
                    <button
                      onClick={() => deleteRow(ri)}
                      className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                      aria-label={`Delete row ${ri + 1}`}
                      title="Delete row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Output ── */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Markdown output</span>
          <CopyButton value={markdown} />
        </div>
        <CodeEditor
          value={markdown}
          readOnly
          language="plain"
          minHeight="140px"
        />
      </div>

      {/* ── Import ── */}
      <details className="group">
        <summary className="cursor-pointer select-none text-sm text-muted-foreground hover:text-foreground transition-colors list-none flex items-center gap-1">
          <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
          Import from CSV / TSV
        </summary>
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
            Paste a CSV or TSV snippet below. The first row becomes the header. You can also paste directly into this box — it will auto-import.
          </p>
          <Textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            onPaste={handleImportPaste}
            className="font-mono text-xs resize-none min-h-[80px]"
            placeholder={"Name,Role,Location\nAlice,Engineer,New York"}
            aria-label="CSV or TSV import input"
          />
          {importError && <p className="text-xs text-destructive">{importError}</p>}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleImport} disabled={!importText.trim()}>
              Import
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setImportText(""); setImportError(""); }}
              disabled={!importText}
            >
              Clear
            </Button>
          </div>
        </div>
      </details>
    </div>
  );
}
