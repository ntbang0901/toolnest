import { useState, useRef, useEffect, useCallback } from "react";
import { Play, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/tools/code-editor";

const DEFAULT_SQL = `CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT, email TEXT, age INTEGER);
INSERT INTO users VALUES (1, 'Alice', 'alice@example.com', 30);
INSERT INTO users VALUES (2, 'Bob', 'bob@example.com', 25);
INSERT INTO users VALUES (3, 'Charlie', 'charlie@example.com', 35);
SELECT * FROM users WHERE age > 25;`;

type QueryResult = {
  columns: string[];
  rows: (string | number | null)[][];
};

type ExecOutput =
  | { ok: true; results: QueryResult[] }
  | { ok: false; error: string };

export default function SqlPlaygroundTool() {
  const [sql, setSql] = useState(DEFAULT_SQL);
  const [output, setOutput] = useState<ExecOutput | null>(null);
  const [loading, setLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const dbRef = useRef<any>(null);
  const SQLRef = useRef<any>(null);

  useEffect(() => {
    if ((window as any).initSqlJs) {
      (window as any)
        .initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
        })
        .then((SQL: any) => {
          SQLRef.current = SQL;
          dbRef.current = new SQL.Database();
          setLoading(false);
        })
        .catch((err: Error) => {
          setInitError(err.message);
          setLoading(false);
        });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sql.js.org/dist/sql-wasm.js";
    script.onload = () => {
      (window as any)
        .initSqlJs({
          locateFile: (file: string) => `https://sql.js.org/dist/${file}`,
        })
        .then((SQL: any) => {
          SQLRef.current = SQL;
          dbRef.current = new SQL.Database();
          setLoading(false);
        })
        .catch((err: Error) => {
          setInitError(err.message);
          setLoading(false);
        });
    };
    script.onerror = () => {
      setInitError("Failed to load sql.js from CDN.");
      setLoading(false);
    };
    document.head.appendChild(script);
  }, []);

  const runQuery = useCallback(() => {
    if (!dbRef.current) return;

    try {
      const raw = dbRef.current.exec(sql);
      const results: QueryResult[] = raw.map((res: any) => ({
        columns: res.columns as string[],
        rows: res.values as (string | number | null)[][],
      }));
      setOutput({ ok: true, results });
    } catch (err) {
      setOutput({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [sql]);

  const resetDb = useCallback(() => {
    if (!SQLRef.current) return;
    dbRef.current = new SQLRef.current.Database();
    setOutput(null);
    setSql(DEFAULT_SQL);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      runQuery();
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          onClick={runQuery}
          disabled={loading || !sql.trim()}
          className="gap-1.5"
        >
          <Play className="h-3.5 w-3.5" />
          Run
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={resetDb}
          disabled={loading}
          className="gap-1.5"
          title="Reset database and editor"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Reset
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {loading ? "Loading sql.js…" : "SQLite (in-browser) · ⌘↵ to run"}
        </span>
      </div>

      {/* Editor */}
      <div onKeyDown={handleKeyDown}>
        <CodeEditor
          value={sql}
          onChange={setSql}
          language="sql"
          placeholder="Write SQL here…"
          minHeight="180px"
          readOnly={loading}
        />
      </div>

      {/* Status / errors */}
      {initError && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {initError}
        </div>
      )}

      {output && !output.ok && (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 font-mono text-sm text-destructive"
        >
          {output.error}
        </div>
      )}

      {/* Results */}
      {output?.ok && (
        <div className="flex flex-col gap-4">
          {output.results.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Query executed successfully. No rows returned.
            </p>
          ) : (
            output.results.map((result, idx) => (
              <div key={idx} className="flex flex-col gap-1">
                {output.results.length > 1 && (
                  <span className="text-xs text-muted-foreground">
                    Result set {idx + 1}
                  </span>
                )}
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        {result.columns.map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left font-medium text-muted-foreground"
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="border-b last:border-0 hover:bg-muted/30"
                        >
                          {row.map((cell, cellIdx) => (
                            <td
                              key={cellIdx}
                              className="px-3 py-2 font-mono"
                            >
                              {cell === null ? (
                                <span className="text-muted-foreground italic">
                                  NULL
                                </span>
                              ) : (
                                String(cell)
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="px-3 py-1.5 text-xs text-muted-foreground">
                    {result.rows.length} row{result.rows.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
