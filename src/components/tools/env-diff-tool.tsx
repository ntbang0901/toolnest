import { useState, useMemo } from "react";
import { CodeEditor } from "@/components/tools/code-editor";
import { CopyButton } from "@/components/tools/copy-button";

const LEFT_SAMPLE = `# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_USER=admin
DB_PASSWORD="s3cr3t"

# App
APP_ENV=development
APP_PORT=3000
APP_SECRET=abc123
DEBUG=true

# Feature flags
ENABLE_NOTIFICATIONS=true
LEGACY_API=true
`;

const RIGHT_SAMPLE = `# Database
DB_HOST=db.production.example.com
DB_PORT=5432
DB_NAME=myapp_prod
DB_USER=admin
DB_PASSWORD="pr0d-s3cr3t!"

# App
APP_ENV=production
APP_PORT=8080
APP_SECRET=xyz999
DEBUG=false

# Feature flags
ENABLE_NOTIFICATIONS=true
NEW_DASHBOARD=true
`;

// Keys that likely contain secrets — shown masked by default
const SECRET_PATTERN = /secret|password|passwd|pwd|key|token|auth|api_?key|private|credential|cert|salt/i;

type Status = "same" | "changed" | "added" | "removed";

interface DiffRow {
  key: string;
  left: string | null;
  right: string | null;
  status: Status;
}

function parseEnv(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    // Skip comments and blank lines; also handle `export VAR=val` syntax
    if (!trimmed || trimmed.startsWith("#")) continue;
    const withoutExport = trimmed.startsWith("export ") ? trimmed.slice(7) : trimmed;
    const eqIdx = withoutExport.indexOf("=");
    if (eqIdx === -1) continue;
    const key = withoutExport.slice(0, eqIdx).trim();
    if (!key) continue;
    let value = withoutExport.slice(eqIdx + 1).trim();
    // Strip surrounding quotes (single or double)
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    map.set(key, value);
  }
  return map;
}

function computeDiff(leftRaw: string, rightRaw: string): DiffRow[] {
  const left = parseEnv(leftRaw);
  const right = parseEnv(rightRaw);
  const allKeys = new Set([...left.keys(), ...right.keys()]);

  const rows: DiffRow[] = [];
  for (const key of allKeys) {
    const l = left.has(key) ? left.get(key)! : null;
    const r = right.has(key) ? right.get(key)! : null;
    let status: Status;
    if (l === null) status = "added";
    else if (r === null) status = "removed";
    else if (l !== r) status = "changed";
    else status = "same";
    rows.push({ key, left: l, right: r, status });
  }

  // Sort: changed first, then added/removed, then same
  const order: Record<Status, number> = { changed: 0, added: 1, removed: 1, same: 2 };
  return rows.sort((a, b) => order[a.status] - order[b.status] || a.key.localeCompare(b.key));
}

const STATUS_META: Record<Status, { label: string; rowClass: string; badgeClass: string }> = {
  added:   { label: "Added",   rowClass: "bg-green-500/5",  badgeClass: "bg-green-500/15 text-green-700 dark:text-green-400" },
  removed: { label: "Removed", rowClass: "bg-red-500/5",    badgeClass: "bg-red-500/15 text-red-700 dark:text-red-400" },
  changed: { label: "Changed", rowClass: "bg-yellow-500/10",badgeClass: "bg-yellow-500/15 text-yellow-700 dark:text-yellow-400" },
  same:    { label: "Same",    rowClass: "",                 badgeClass: "bg-muted text-muted-foreground" },
};

function maskValue(value: string): string {
  if (value.length <= 2) return "••••";
  return value.slice(0, 1) + "•".repeat(Math.min(value.length - 1, 8));
}

function ValueCell({
  value,
  status,
  side,
  revealed,
}: {
  value: string | null;
  status: Status;
  side: "left" | "right";
  revealed: boolean;
}) {
  if (value === null) {
    return <span className="italic text-muted-foreground text-xs">—</span>;
  }
  const highlight =
    status === "changed"
      ? side === "left"
        ? "text-red-700 dark:text-red-400"
        : "text-green-700 dark:text-green-400"
      : "";

  const display = revealed ? value : maskValue(value);

  return (
    <code className={`break-all text-xs font-mono ${highlight}`}>
      {value === "" ? <span className="italic text-muted-foreground">(empty)</span> : display}
    </code>
  );
}

export default function EnvDiffTool() {
  const [left, setLeft] = useState(LEFT_SAMPLE);
  const [right, setRight] = useState(RIGHT_SAMPLE);
  const [revealSecrets, setRevealSecrets] = useState(false);

  const rows = useMemo(() => computeDiff(left, right), [left, right]);
  const counts = useMemo(() => {
    const c = { added: 0, removed: 0, changed: 0, same: 0 };
    for (const r of rows) c[r.status]++;
    return c;
  }, [rows]);

  const hasSecretKeys = useMemo(
    () => rows.some((r) => SECRET_PATTERN.test(r.key)),
    [rows]
  );

  const copyValue = useMemo(() => {
    const header = "Key\tLeft\tRight\tStatus";
    const body = rows
      .map((r) => `${r.key}\t${r.left ?? ""}\t${r.right ?? ""}\t${r.status}`)
      .join("\n");
    return `${header}\n${body}`;
  }, [rows]);

  return (
    <div className="flex flex-col gap-6">
      {/* Inputs */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Left (.env)</span>
          <CodeEditor
            value={left}
            onChange={setLeft}
            language="plain"
            placeholder="Paste .env content here…"
            minHeight="200px"
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Right (.env)</span>
          <CodeEditor
            value={right}
            onChange={setRight}
            language="plain"
            placeholder="Paste .env content here…"
            minHeight="200px"
          />
        </div>
      </div>

      {rows.length > 0 && (
        <>
          {/* Summary badges */}
          <div className="flex flex-wrap items-center gap-2">
            {(["changed", "added", "removed", "same"] as Status[]).map((s) =>
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
              {hasSecretKeys && (
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={revealSecrets}
                    onChange={(e) => setRevealSecrets(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-input accent-brand"
                  />
                  Reveal secret values
                </label>
              )}
              <CopyButton value={copyValue} label="Copy as TSV" />
            </div>
          </div>

          {/* Diff table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-1/4">Key</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-1/3">Left</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-1/3">Right</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-16">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const meta = STATUS_META[row.status];
                  const isSecret = SECRET_PATTERN.test(row.key);
                  const revealed = !isSecret || revealSecrets;
                  return (
                    <tr key={row.key} className={`border-b border-border last:border-0 ${meta.rowClass}`}>
                      <td className="px-3 py-2 font-mono text-xs font-medium break-all">{row.key}</td>
                      <td className="px-3 py-2">
                        <ValueCell value={row.left} status={row.status} side="left" revealed={revealed} />
                      </td>
                      <td className="px-3 py-2">
                        <ValueCell value={row.right} status={row.status} side="right" revealed={revealed} />
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
        </>
      )}

      {rows.length === 0 && (left.trim() || right.trim()) && (
        <p className="text-sm text-muted-foreground text-center py-8">
          No variables found. Paste .env content above to see diff.
        </p>
      )}
    </div>
  );
}
