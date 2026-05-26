import { useMemo, useState } from "react";
import { format as formatSql } from "sql-formatter";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

const DIALECTS = ["sql", "postgresql", "mysql", "sqlite", "bigquery", "snowflake"] as const;
type Dialect = (typeof DIALECTS)[number];

const SAMPLE = `select u.id, u.name, count(o.id) as orders from users u left join orders o on o.user_id = u.id where u.active = true group by u.id, u.name having count(o.id) > 0 order by orders desc limit 10`;

export default function SqlFormatterTool() {
  const [input, setInput] = useState("");
  const [dialect, setDialect] = useState<Dialect>("sql");
  const [indent, setIndent] = useState<"2" | "4">("2");

  const result = useMemo(() => {
    if (!input.trim()) return { ok: true as const, value: "" };
    try {
      return {
        ok: true as const,
        value: formatSql(input, { language: dialect, tabWidth: Number(indent), keywordCase: "upper" }),
      };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Format failed" };
    }
  }, [input, dialect, indent]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          size="sm"
          ariaLabel="Dialect"
          value={dialect}
          onChange={(v) => setDialect(v as Dialect)}
          options={DIALECTS.map((d) => ({ value: d, label: d === "sql" ? "Standard" : d }))}
        />
        <SegmentedControl
          size="sm"
          ariaLabel="Indent"
          value={indent}
          onChange={(v) => setIndent(v as "2" | "4")}
          options={[
            { value: "2", label: "2 sp" },
            { value: "4", label: "4 sp" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
          Sample
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CodeEditor
          value={input}
          onChange={setInput}
          language="sql"
          placeholder="Paste SQL here…"
          minHeight="280px"
          className="lg:min-h-[440px]"
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <CopyButton value={result.ok ? result.value : ""} />
          </div>
          <CodeEditor
            value={result.ok ? result.value : ""}
            language="sql"
            readOnly
            minHeight="280px"
            className="lg:min-h-[440px]"
          />
          {!result.ok && <p className="text-xs text-destructive">{result.error}</p>}
        </div>
      </div>
    </div>
  );
}
