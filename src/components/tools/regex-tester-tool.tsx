import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const FLAG_OPTS: Array<{ id: string; label: string; hint: string }> = [
  { id: "g", label: "g", hint: "global" },
  { id: "i", label: "i", hint: "case-insensitive" },
  { id: "m", label: "m", hint: "multiline" },
  { id: "s", label: "s", hint: "dotAll" },
  { id: "u", label: "u", hint: "unicode" },
  { id: "y", label: "y", hint: "sticky" },
];

type Match = {
  text: string;
  index: number;
  groups: string[];
  named: Record<string, string>;
};

function runRegex(
  pattern: string,
  flags: string,
  input: string,
): { ok: true; matches: Match[] } | { ok: false; error: string } {
  try {
    const ensuredGlobal = flags.includes("g") ? flags : flags + "g";
    const re = new RegExp(pattern, ensuredGlobal);
    const matches: Match[] = [];
    let m: RegExpExecArray | null;
    let safety = 0;
    while ((m = re.exec(input)) !== null) {
      if (safety++ > 5000) break;
      matches.push({
        text: m[0],
        index: m.index,
        groups: m.slice(1).map((g) => g ?? ""),
        named: { ...(m.groups ?? {}) } as Record<string, string>,
      });
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return { ok: true, matches };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid regex" };
  }
}

function highlight(input: string, matches: Match[]): Array<{ text: string; hit: boolean }> {
  if (!matches.length) return [{ text: input, hit: false }];
  const out: Array<{ text: string; hit: boolean }> = [];
  let cursor = 0;
  for (const m of matches) {
    if (m.index > cursor) out.push({ text: input.slice(cursor, m.index), hit: false });
    out.push({ text: m.text, hit: true });
    cursor = m.index + m.text.length;
  }
  if (cursor < input.length) out.push({ text: input.slice(cursor), hit: false });
  return out;
}

export default function RegexTesterTool() {
  const [pattern, setPattern] = useState("(\\w+)@(\\w+\\.\\w+)");
  const [flags, setFlags] = useState("g");
  const [input, setInput] = useState("Email me at hello@toolnest.dev or admin@example.com");
  const [replace, setReplace] = useState("[$1] at $2");

  const result = useMemo(() => runRegex(pattern, flags, input), [pattern, flags, input]);

  const replaced = useMemo(() => {
    if (!result.ok) return "";
    try {
      const re = new RegExp(pattern, flags || "g");
      return input.replace(re, replace);
    } catch {
      return "";
    }
  }, [pattern, flags, input, replace, result.ok]);

  const segments = useMemo(
    () => (result.ok ? highlight(input, result.matches) : []),
    [result, input],
  );

  const toggleFlag = (id: string) => {
    setFlags((f) => (f.includes(id) ? f.replace(id, "") : f + id));
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="regex-pattern">Pattern</label>
        <div className="flex flex-wrap items-stretch gap-2">
          <span className="flex items-center px-2 font-mono text-muted-foreground">/</span>
          <Input
            id="regex-pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="flex-1 font-mono"
          />
          <span className="flex items-center px-1 font-mono text-muted-foreground">/</span>
          <div role="group" aria-label="Flags" className="flex rounded-md border border-input p-0.5 text-xs">
            {FLAG_OPTS.map((f) => {
              const active = flags.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  title={f.hint}
                  aria-pressed={active}
                  onClick={() => toggleFlag(f.id)}
                  className={`rounded px-2 py-1 font-mono transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </div>
        {!result.ok && <p className="text-xs text-destructive">{result.error}</p>}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="regex-input">Test string</label>
          <Textarea
            id="regex-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            className="min-h-[180px] font-mono text-sm lg:min-h-[220px]"
            spellCheck={false}
          />
          <div className="rounded-md border border-border bg-muted/30 p-3 font-mono text-sm whitespace-pre-wrap break-words">
            {segments.map((s, i) => (
              <span
                key={i}
                className={
                  s.hit
                    ? "rounded bg-brand/25 text-foreground"
                    : "text-muted-foreground"
                }
              >
                {s.text || (s.hit ? "·" : "")}
              </span>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              {result.ok
                ? `${result.matches.length} match${result.matches.length === 1 ? "" : "es"}`
                : "—"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPattern("");
                setInput("");
              }}
            >
              Clear
            </Button>
          </div>
          <div className="max-h-[260px] overflow-auto rounded-md border border-border">
            {result.ok && result.matches.length === 0 && (
              <p className="p-3 text-xs text-muted-foreground">No matches.</p>
            )}
            {result.ok &&
              result.matches.map((m, i) => (
                <div key={i} className="border-b border-border p-2 text-xs last:border-b-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="break-all font-mono text-foreground">{m.text}</span>
                    <span className="font-mono text-muted-foreground">@{m.index}</span>
                  </div>
                  {(m.groups.length > 0 || Object.keys(m.named).length > 0) && (
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-muted-foreground">
                      {m.groups.map((g, gi) => (
                        <span key={gi}>${gi + 1}={g || "—"}</span>
                      ))}
                      {Object.entries(m.named).map(([k, v]) => (
                        <span key={k}>?&lt;{k}&gt;={v || "—"}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
          </div>

          <label className="mt-2 text-sm font-medium" htmlFor="regex-replace">Replace</label>
          <Input
            id="regex-replace"
            value={replace}
            onChange={(e) => setReplace(e.target.value)}
            placeholder="$1, $2, ${name}…"
            className="font-mono"
          />
          <Textarea
            value={replaced}
            readOnly
            className="min-h-[120px] font-mono text-sm"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
