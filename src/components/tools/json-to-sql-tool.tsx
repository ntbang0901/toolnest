import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import { formatInput } from "@/lib/format-input";

type Dialect = "postgresql" | "mysql" | "sqlite" | "sqlserver";

const DEFAULT_JSON = `[
  {"id": 1, "name": "Alice", "email": "alice@example.com", "active": true},
  {"id": 2, "name": "Bob", "email": "bob@example.com", "active": false},
  {"id": 3, "name": "Charlie", "email": null, "active": true}
]`;

function quoteIdentifier(name: string, dialect: Dialect): string {
  switch (dialect) {
    case "mysql":
      return `\`${name.replace(/`/g, "``")}\``;
    case "sqlserver":
      return `[${name.replace(/]/g, "]]")}]`;
    default:
      // postgresql, sqlite
      return `"${name.replace(/"/g, '""')}"`;
  }
}

function sqlValue(val: unknown): string {
  if (val === null || val === undefined) return "NULL";
  if (typeof val === "boolean") return val ? "TRUE" : "FALSE";
  if (typeof val === "number") return String(val);
  // Everything else (strings, objects, arrays) gets single-quoted
  const str = typeof val === "string" ? val : JSON.stringify(val);
  return `'${str.replace(/'/g, "''")}'`;
}

function inferSqlType(val: unknown, dialect: Dialect): string {
  if (typeof val === "boolean") {
    if (dialect === "sqlserver") return "BIT";
    if (dialect === "sqlite") return "INTEGER";
    return "BOOLEAN";
  }
  if (typeof val === "number") {
    return Number.isInteger(val) ? "INTEGER" : "NUMERIC";
  }
  if (dialect === "sqlserver") return "NVARCHAR(255)";
  if (dialect === "sqlite") return "TEXT";
  return "TEXT";
}

function generateSql(
  rows: Record<string, unknown>[],
  tableName: string,
  dialect: Dialect,
  includeCreate: boolean,
  batchInsert: boolean,
  quoteIds: boolean,
): string {
  if (!rows.length) return "";

  const name = tableName.trim() || "my_table";

  // Collect all column names from all rows (union of keys)
  const colSet = new Set<string>();
  for (const row of rows) {
    for (const key of Object.keys(row)) colSet.add(key);
  }
  const columns = Array.from(colSet);

  const qi = (col: string) => (quoteIds ? quoteIdentifier(col, dialect) : col);
  const qt = () => (quoteIds ? quoteIdentifier(name, dialect) : name);

  const parts: string[] = [];

  if (includeCreate) {
    // Infer column types from first non-null value found across rows
    const colTypes: Record<string, string> = {};
    for (const col of columns) {
      const sample = rows.find((r) => r[col] !== null && r[col] !== undefined)?.[col];
      colTypes[col] = sample !== undefined ? inferSqlType(sample, dialect) : "TEXT";
    }

    const colDefs = columns
      .map((col) => `  ${qi(col)} ${colTypes[col]}`)
      .join(",\n");

    const ifNotExists = dialect === "sqlserver" ? "" : "IF NOT EXISTS ";
    parts.push(`CREATE TABLE ${ifNotExists}${qt()} (\n${colDefs}\n);`);
  }

  const colList = columns.map(qi).join(", ");
  const tableRef = qt();

  if (batchInsert) {
    const valueRows = rows
      .map((row) => {
        const vals = columns.map((col) => sqlValue(row[col])).join(", ");
        return `  (${vals})`;
      })
      .join(",\n");
    parts.push(`INSERT INTO ${tableRef} (${colList})\nVALUES\n${valueRows};`);
  } else {
    for (const row of rows) {
      const vals = columns.map((col) => sqlValue(row[col])).join(", ");
      parts.push(`INSERT INTO ${tableRef} (${colList})\nVALUES (${vals});`);
    }
  }

  return parts.join("\n\n");
}

export default function JsonToSqlTool() {
  const [input, setInput] = useState(DEFAULT_JSON);
  const [tableName, setTableName] = useState("users");
  const [dialect, setDialect] = useState<Dialect>("postgresql");
  const [includeCreate, setIncludeCreate] = useState(false);
  const [batchInsert, setBatchInsert] = useState(true);
  const [quoteIds, setQuoteIds] = useState(false);

  const result = useMemo(() => {
    if (!input.trim()) return { ok: true as const, value: "" };
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch (e) {
      return { ok: false as const, error: `Invalid JSON: ${(e as Error).message}` };
    }
    if (!Array.isArray(parsed)) {
      return { ok: false as const, error: "Input must be a JSON array of objects." };
    }
    if (parsed.length === 0) {
      return { ok: true as const, value: "" };
    }
    const nonObjects = parsed.filter((item) => typeof item !== "object" || item === null || Array.isArray(item));
    if (nonObjects.length > 0) {
      return { ok: false as const, error: "All array items must be objects." };
    }
    try {
      const sql = generateSql(
        parsed as Record<string, unknown>[],
        tableName,
        dialect,
        includeCreate,
        batchInsert,
        quoteIds,
      );
      return { ok: true as const, value: sql };
    } catch (e) {
      return { ok: false as const, error: (e as Error).message };
    }
  }, [input, tableName, dialect, includeCreate, batchInsert, quoteIds]);

  return (
    <div className="flex flex-col gap-4">
      {/* Controls */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Table name</span>
          <Input
            value={tableName}
            onChange={(e) => setTableName(e.target.value)}
            placeholder="my_table"
            className="h-8 w-36 font-mono text-sm"
          />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">Dialect</span>
          <SegmentedControl
            size="sm"
            ariaLabel="SQL dialect"
            value={dialect}
            onChange={(v) => setDialect(v as Dialect)}
            options={[
              { value: "postgresql", label: "PostgreSQL" },
              { value: "mysql", label: "MySQL" },
              { value: "sqlite", label: "SQLite" },
              { value: "sqlserver", label: "SQL Server" },
            ]}
          />
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="self-end"
          onClick={() => {
            const r = formatInput(input, "json");
            if (r.ok) setInput(r.value);
          }}
          disabled={!input.trim() || !result.ok}
        >
          Format
        </Button>
      </div>

      <div className="flex flex-wrap gap-4">
        <Checkbox
          label="Include CREATE TABLE"
          checked={includeCreate}
          onChange={(e) => setIncludeCreate(e.target.checked)}
        />
        <Checkbox
          label="Batch INSERT (multi-row VALUES)"
          checked={batchInsert}
          onChange={(e) => setBatchInsert(e.target.checked)}
        />
        <Checkbox
          label="Quote identifiers"
          checked={quoteIds}
          onChange={(e) => setQuoteIds(e.target.checked)}
        />
      </div>

      {/* Editor panes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">JSON Input</span>
          <CodeEditor
            value={input}
            onChange={setInput}
            language="json"
            placeholder='[{"id": 1, "name": "Alice"}]'
            minHeight="320px"
            className="lg:min-h-[360px]"
          />
          {!result.ok && (
            <p className="text-xs text-destructive">{result.error}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">SQL Output</span>
            <CopyButton value={result.ok ? result.value : ""} />
          </div>
          <CodeEditor
            value={result.ok ? result.value : ""}
            language="sql"
            readOnly
            placeholder="SQL will appear here…"
            minHeight="320px"
            className="lg:min-h-[360px]"
          />
        </div>
      </div>
    </div>
  );
}
