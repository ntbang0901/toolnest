import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import { Download, RefreshCw } from "lucide-react";
import { renderMock, type MockFormat, type SqlDialect } from "../mock/generate";
import type { SchemaModel } from "../schema-model";

interface Props {
  model: SchemaModel | null;
}

export function MockView({ model }: Props) {
  const [rows, setRows] = useState(10);
  const [seed, setSeed] = useState(42);
  const [fmt, setFmt] = useState<MockFormat>("sql");
  const [dialect, setDialect] = useState<SqlDialect>("postgres");
  const [tick, setTick] = useState(0);

  const out = useMemo(() => {
    if (!model || !model.tables.length) return "";
    return renderMock(model, { rowsPerTable: rows, seed, dialect }, fmt);
  }, [model, rows, seed, dialect, fmt, tick]);

  const filename = `mock-data.${fmt === "sql" ? "sql" : fmt}`;

  function download() {
    const blob = new Blob([out], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Rows / table</span>
          <Input
            type="number"
            min={1}
            max={1000}
            value={rows}
            onChange={(e) => setRows(Math.max(1, Math.min(1000, Number(e.target.value) || 1)))}
            className="h-8 w-24"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs">
          <span className="text-muted-foreground">Seed</span>
          <Input
            type="number"
            value={seed}
            onChange={(e) => setSeed(Number(e.target.value) || 0)}
            className="h-8 w-24"
          />
        </label>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Format</span>
          <SegmentedControl
            ariaLabel="Mock format"
            size="sm"
            value={fmt}
            onChange={(v) => setFmt(v as MockFormat)}
            options={[
              { value: "sql", label: "SQL INSERT" },
              { value: "json", label: "JSON" },
              { value: "csv", label: "CSV" },
            ]}
          />
        </div>
        {fmt === "sql" && (
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">Dialect</span>
            <SegmentedControl
              ariaLabel="SQL dialect"
              size="sm"
              value={dialect}
              onChange={(v) => setDialect(v as SqlDialect)}
              options={[
                { value: "postgres", label: "Postgres" },
                { value: "mysql", label: "MySQL" },
                { value: "mssql", label: "MSSQL" },
              ]}
            />
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={() => setTick((t) => t + 1)} className="ml-auto">
          <RefreshCw className="h-4 w-4" /> Reroll
        </Button>
        <Button variant="outline" size="sm" onClick={download} disabled={!out}>
          <Download className="h-4 w-4" /> Download
        </Button>
        <CopyButton value={out} />
      </div>
      <CodeEditor
        value={out}
        language={fmt === "json" ? "json" : "sql"}
        readOnly
        minHeight="480px"
        className="lg:min-h-[640px]"
      />
      <p className="text-xs text-muted-foreground">
        Smart faker infers values from column names (email, phone, address, name, slug, price, etc.) and respects FK references.
        Same seed → same data.
      </p>
    </div>
  );
}
