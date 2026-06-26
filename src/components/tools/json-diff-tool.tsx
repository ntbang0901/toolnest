import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/tools/code-editor";
import { CopyButton } from "@/components/tools/copy-button";
import { ArrowRight, ArrowLeft, ArrowLeftRight } from "lucide-react";

type DiffStatus = "added" | "removed" | "changed" | "same";

interface DiffEntry {
  path: string;
  left: unknown;
  right: unknown;
  status: DiffStatus;
}

const LEFT_SAMPLE = `{
  "name": "toolnest",
  "version": "1.0.0",
  "config": {
    "port": 3000,
    "debug": true,
    "theme": "light"
  },
  "features": ["search", "history", "favorites"],
  "deprecated": "old-flag"
}`;

const RIGHT_SAMPLE = `{
  "name": "toolnest",
  "version": "1.2.0",
  "config": {
    "port": 8080,
    "debug": false,
    "theme": "dark",
    "timeout": 30
  },
  "features": ["search", "history", "favorites", "export"],
  "newFlag": true
}`;

function formatValue(v: unknown): string {
  if (v === undefined) return "";
  return JSON.stringify(v);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function diffJson(left: unknown, right: unknown, path = ""): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const leftIsObj = isPlainObject(left);
  const rightIsObj = isPlainObject(right);
  const leftIsArr = Array.isArray(left);
  const rightIsArr = Array.isArray(right);

  if (leftIsObj && rightIsObj) {
    const allKeys = new Set([...Object.keys(left), ...Object.keys(right)]);
    for (const key of allKeys) {
      const childPath = path ? `${path}.${key}` : key;
      if (!(key in left)) {
        entries.push({ path: childPath, left: undefined, right: right[key], status: "added" });
      } else if (!(key in right)) {
        entries.push({ path: childPath, left: left[key], right: undefined, status: "removed" });
      } else {
        entries.push(...diffJson(left[key], right[key], childPath));
      }
    }
  } else if (leftIsArr && rightIsArr) {
    const maxLen = Math.max(left.length, right.length);
    for (let i = 0; i < maxLen; i++) {
      const childPath = `${path}[${i}]`;
      if (i >= left.length) {
        entries.push({ path: childPath, left: undefined, right: right[i], status: "added" });
      } else if (i >= right.length) {
        entries.push({ path: childPath, left: left[i], right: undefined, status: "removed" });
      } else {
        entries.push(...diffJson(left[i], right[i], childPath));
      }
    }
  } else {
    entries.push({ path, left, right, status: left === right ? "same" : "changed" });
  }

  return entries;
}

const STATUS_META: Record<DiffStatus, { label: string; rowClass: string; badgeClass: string }> = {
  added:   { label: "Added",   rowClass: "bg-green-500/5",   badgeClass: "bg-green-500/15 text-green-700 dark:text-green-400" },
  removed: { label: "Removed", rowClass: "bg-red-500/5",     badgeClass: "bg-red-500/15 text-red-700 dark:text-red-400" },
  changed: { label: "Changed", rowClass: "bg-yellow-500/10", badgeClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  same:    { label: "Same",    rowClass: "",                  badgeClass: "bg-muted text-muted-foreground" },
};

export default function JsonDiffTool() {
  const [left, setLeft] = useState(LEFT_SAMPLE);
  const [right, setRight] = useState(RIGHT_SAMPLE);
  const [showSame, setShowSame] = useState(false);
  const [showAllRows, setShowAllRows] = useState(false);
  const ROW_LIMIT = 200;

  const { entries, leftError, rightError, ready } = useMemo(() => {
    let leftParsed: unknown;
    let rightParsed: unknown;
    let leftError: string | null = null;
    let rightError: string | null = null;

    if (left.trim()) {
      try { leftParsed = JSON.parse(left); }
      catch (e) { leftError = (e as Error).message; }
    }
    if (right.trim()) {
      try { rightParsed = JSON.parse(right); }
      catch (e) { rightError = (e as Error).message; }
    }

    const ready = !leftError && !rightError && left.trim() !== "" && right.trim() !== "";
    const entries = ready ? diffJson(leftParsed, rightParsed) : [];
    return { entries, leftError, rightError, ready };
  }, [left, right]);

  const counts = useMemo(() => {
    const c = { added: 0, removed: 0, changed: 0, same: 0 };
    for (const e of entries) c[e.status]++;
    return c;
  }, [entries]);

  const hasChanges = counts.added + counts.removed + counts.changed > 0;
  const visibleEntries = showSame ? entries : entries.filter((e) => e.status !== "same");

  const copyValue = useMemo(() => {
    const header = "Path\tLeft\tRight\tStatus";
    const body = entries
      .map((e) => `${e.path || "(root)"}\t${formatValue(e.left)}\t${formatValue(e.right)}\t${e.status}`)
      .join("\n");
    return `${header}\n${body}`;
  }, [entries]);

  function formatJson(value: string, set: (v: string) => void) {
    try {
      set(JSON.stringify(JSON.parse(value), null, 2));
    } catch {
      // invalid JSON — leave as-is
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Inputs */}
      <div className="grid gap-x-2 gap-y-4 lg:grid-cols-[1fr_auto_1fr]">
        {/* Left editor */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Left (original)</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => formatJson(left, setLeft)} disabled={!left || !!leftError}>
                Format
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLeft(LEFT_SAMPLE)}>
                Sample
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setLeft("")} disabled={!left}>
                Clear
              </Button>
            </div>
          </div>
          <CodeEditor
            value={left}
            onChange={setLeft}
            language="json"
            placeholder="Paste JSON here…"
            minHeight="256px"
            maxHeight="480px"
          />
          {leftError && <p className="text-xs text-destructive">{leftError}</p>}
        </div>

        {/* Transfer buttons */}
        <div className="flex flex-row justify-center gap-1 lg:flex-col lg:items-center lg:justify-center lg:gap-2 lg:pt-7">
          <Button variant="ghost" size="icon" title="Copy left → right" onClick={() => setRight(left)} disabled={!left}>
            <ArrowRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Swap" onClick={() => { const tmp = left; setLeft(right); setRight(tmp); }} disabled={!left && !right}>
            <ArrowLeftRight className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" title="Copy right → left" onClick={() => setLeft(right)} disabled={!right}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>

        {/* Right editor */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Right (modified)</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => formatJson(right, setRight)} disabled={!right || !!rightError}>
                Format
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRight(RIGHT_SAMPLE)}>
                Sample
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRight("")} disabled={!right}>
                Clear
              </Button>
            </div>
          </div>
          <CodeEditor
            value={right}
            onChange={setRight}
            language="json"
            placeholder="Paste JSON here…"
            minHeight="256px"
            maxHeight="480px"
          />
          {rightError && <p className="text-xs text-destructive">{rightError}</p>}
        </div>
      </div>

      {ready && (
        <>
          {/* Summary + controls */}
          <div className="flex flex-wrap items-center gap-2">
            {(["changed", "added", "removed", "same"] as DiffStatus[]).map((s) =>
              counts[s] > 0 ? (
                <span
                  key={s}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_META[s].badgeClass}`}
                >
                  {counts[s]} {STATUS_META[s].label}
                </span>
              ) : null
            )}
            <div className="ml-auto flex items-center gap-3">
              {hasChanges && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={showSame}
                    onChange={(e) => setShowSame(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-input"
                  />
                  Show unchanged
                </label>
              )}
              {entries.length > 0 && <CopyButton value={copyValue} label="Copy as TSV" />}
            </div>
          </div>

          {!hasChanges && (
            <p className="text-sm text-muted-foreground text-center py-8">
              No differences found — the JSON values are identical.
            </p>
          )}

          {/* Diff table */}
          {visibleEntries.length > 0 && (
            <div className="flex flex-col gap-2">
              <div className="overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-1/3">Path</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[30%]">Left</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-[30%]">Right</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-20">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showAllRows ? visibleEntries : visibleEntries.slice(0, ROW_LIMIT)).map((entry) => {
                      const meta = STATUS_META[entry.status];
                      const leftVal = formatValue(entry.left);
                      const rightVal = formatValue(entry.right);
                      return (
                        <tr
                          key={entry.path}
                          className={`border-b border-border last:border-0 ${meta.rowClass}`}
                        >
                          <td className="px-3 py-2 font-mono text-xs font-medium break-all">
                            {entry.path || "(root)"}
                          </td>
                          <td className="px-3 py-2">
                            {entry.status === "added" ? (
                              <span className="italic text-muted-foreground text-xs">—</span>
                            ) : (
                              <code className={`break-all text-xs font-mono ${entry.status === "changed" ? "text-red-700 dark:text-red-400" : ""}`}>
                                {leftVal}
                              </code>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {entry.status === "removed" ? (
                              <span className="italic text-muted-foreground text-xs">—</span>
                            ) : (
                              <code className={`break-all text-xs font-mono ${entry.status === "changed" ? "text-green-700 dark:text-green-400" : ""}`}>
                                {rightVal}
                              </code>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${meta.badgeClass}`}>
                              {meta.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {visibleEntries.length > ROW_LIMIT && (
                <button
                  type="button"
                  onClick={() => setShowAllRows((v) => !v)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors text-center py-1"
                >
                  {showAllRows
                    ? "Show less"
                    : `Showing ${ROW_LIMIT} of ${visibleEntries.length} rows — click to show all`}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
