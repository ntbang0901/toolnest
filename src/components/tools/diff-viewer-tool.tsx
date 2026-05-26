import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

type Op = "equal" | "add" | "remove";
type Row = { op: Op; left?: string; right?: string };

function diffLines(a: string[], b: string[]): Row[] {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }
  const rows: Row[] = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      rows.push({ op: "equal", left: a[i], right: b[j] });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      rows.push({ op: "remove", left: a[i] });
      i++;
    } else {
      rows.push({ op: "add", right: b[j] });
      j++;
    }
  }
  while (i < n) rows.push({ op: "remove", left: a[i++] });
  while (j < m) rows.push({ op: "add", right: b[j++] });
  return rows;
}

export default function DiffViewerTool() {
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [ignoreWs, setIgnoreWs] = useState(false);
  const [ignoreCase, setIgnoreCase] = useState(false);

  const { rows, stats } = useMemo(() => {
    const norm = (s: string) => {
      let v = s;
      if (ignoreWs) v = v.replace(/\s+/g, " ").trim();
      if (ignoreCase) v = v.toLowerCase();
      return v;
    };
    const aSrc = left.split("\n");
    const bSrc = right.split("\n");
    const a = aSrc.map(norm);
    const b = bSrc.map(norm);
    const r = diffLines(a, b);
    let added = 0, removed = 0;
    for (const row of r) {
      if (row.op === "add") added++;
      else if (row.op === "remove") removed++;
    }
    let ai = 0, bi = 0;
    const restored = r.map((row) => {
      if (row.op === "equal") return { ...row, left: aSrc[ai++], right: bSrc[bi++] };
      if (row.op === "remove") return { ...row, left: aSrc[ai++] };
      return { ...row, right: bSrc[bi++] };
    });
    return { rows: restored, stats: { added, removed } };
  }, [left, right, ignoreWs, ignoreCase]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          value={left}
          onChange={(e) => setLeft(e.target.value)}
          placeholder="Original text…"
          className="min-h-[180px] font-mono text-sm lg:min-h-[220px]"
          spellCheck={false}
        />
        <Textarea
          value={right}
          onChange={(e) => setRight(e.target.value)}
          placeholder="Modified text…"
          className="min-h-[180px] font-mono text-sm lg:min-h-[220px]"
          spellCheck={false}
        />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Checkbox
          label="Ignore whitespace"
          checked={ignoreWs}
          onChange={(e) => setIgnoreWs(e.target.checked)}
        />
        <Checkbox
          label="Ignore case"
          checked={ignoreCase}
          onChange={(e) => setIgnoreCase(e.target.checked)}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setLeft("");
            setRight("");
          }}
          disabled={!left && !right}
        >
          Clear both
        </Button>
        <span className="ml-auto font-mono text-sm">
          <span className="text-emerald-600 dark:text-emerald-400">+{stats.added}</span>{" "}
          <span className="text-rose-600 dark:text-rose-400">-{stats.removed}</span>
        </span>
      </div>

      <div className="overflow-auto rounded-md border border-border">
        <table className="w-full font-mono text-xs">
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="align-top">
                <td
                  className={`w-1/2 whitespace-pre-wrap break-words border-r border-border px-3 py-1 ${
                    row.op === "remove"
                      ? "bg-rose-500/10 text-rose-700 dark:text-rose-200"
                      : ""
                  }`}
                >
                  {row.op === "remove" ? "− " : row.op === "equal" ? "  " : ""}
                  {row.left ?? ""}
                </td>
                <td
                  className={`w-1/2 whitespace-pre-wrap break-words px-3 py-1 ${
                    row.op === "add"
                      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-200"
                      : ""
                  }`}
                >
                  {row.op === "add" ? "+ " : row.op === "equal" ? "  " : ""}
                  {row.right ?? ""}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={2} className="p-6 text-center text-muted-foreground">
                  Paste text on both sides to see the diff.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
