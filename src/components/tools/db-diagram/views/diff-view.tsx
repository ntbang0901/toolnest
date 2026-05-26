import { useMemo, useState } from "react";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import { buildSchemaModel } from "../schema-model";
import { diffSchemas, toMigrationSql, type DiffEntry } from "../diff/diff";

interface Props {
  current: string;
}

const COLOR: Record<string, string> = {
  added: "text-emerald-500",
  removed: "text-destructive",
  changed: "text-amber-500",
};

function colorOf(kind: string): string {
  if (kind.endsWith("_added")) return COLOR.added;
  if (kind.endsWith("_removed")) return COLOR.removed;
  return COLOR.changed;
}

export function DiffView({ current }: Props) {
  const [a, setA] = useState(current);
  const [b, setB] = useState(current);
  const [dialect, setDialect] = useState<"postgres" | "mysql">("postgres");

  const result = useMemo(() => {
    const ma = buildSchemaModel(a);
    const mb = buildSchemaModel(b);
    if (!ma.ok) return { error: `Left: ${ma.error}` };
    if (!mb.ok) return { error: `Right: ${mb.error}` };
    const diff = diffSchemas(ma.model, mb.model);
    const sql = toMigrationSql(ma.model, mb.model, dialect);
    return { diff, sql };
  }, [a, b, dialect]);

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Before (DBML A)</span>
            <button
              type="button"
              onClick={() => setA(current)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Use current
            </button>
          </div>
          <CodeEditor
            value={a}
            onChange={setA}
            language="sql"
            minHeight="300px"
          />
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">After (DBML B)</span>
            <button
              type="button"
              onClick={() => setB(current)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Use current
            </button>
          </div>
          <CodeEditor
            value={b}
            onChange={setB}
            language="sql"
            minHeight="300px"
          />
        </div>
      </div>

      {"error" in result && result.error ? (
        <p className="text-xs text-destructive">{result.error}</p>
      ) : "diff" in result && result.diff ? (
        <div className="grid gap-3 lg:grid-cols-2">
          <DiffList entries={result.diff.entries} />
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Migration SQL</span>
              <SegmentedControl
                ariaLabel="Migration dialect"
                size="sm"
                value={dialect}
                onChange={(v) => setDialect(v as "postgres" | "mysql")}
                options={[
                  { value: "postgres", label: "Postgres" },
                  { value: "mysql", label: "MySQL" },
                ]}
              />
              <CopyButton value={result.sql ?? ""} className="ml-auto" />
            </div>
            <CodeEditor
              value={result.sql ?? ""}
              language="sql"
              readOnly
              minHeight="280px"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DiffList({ entries }: { entries: DiffEntry[] }) {
  if (entries.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/20 p-4 text-xs text-muted-foreground">
        Schemas are identical.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border bg-card p-2">
      <div className="mb-2 px-2 text-xs text-muted-foreground">{entries.length} change{entries.length === 1 ? "" : "s"}</div>
      <ul className="flex flex-col font-mono text-[11px]">
        {entries.map((e, i) => (
          <li key={i} className={`px-2 py-0.5 ${colorOf(e.kind)}`}>
            {e.detail}
          </li>
        ))}
      </ul>
    </div>
  );
}
