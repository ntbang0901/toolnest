import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";

type Mode = "escape" | "unescape";
type Lang = "js" | "json" | "html" | "sql" | "regex" | "shell";

function escapeJs(s: string): string {
  return s.replace(/[\\"'\n\r\t\b\f]/g, (m) => {
    const map: Record<string, string> = { "\\": "\\\\", '"': '\\"', "'": "\\'", "\n": "\\n", "\r": "\\r", "\t": "\\t", "\b": "\\b", "\f": "\\f" };
    return map[m];
  });
}

function unescapeJs(s: string): string {
  return s.replace(/\\(["'\\nrtbfu0-9])/g, (_, ch: string) => {
    if (ch === "n") return "\n";
    if (ch === "r") return "\r";
    if (ch === "t") return "\t";
    if (ch === "b") return "\b";
    if (ch === "f") return "\f";
    return ch;
  });
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m]!));
}

function unescapeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function escapeSql(s: string): string {
  return s.replace(/'/g, "''");
}

function unescapeSql(s: string): string {
  return s.replace(/''/g, "'");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function unescapeRegex(s: string): string {
  return s.replace(/\\([.*+?^${}()|[\]\\])/g, "$1");
}

function escapeShell(s: string): string {
  return `'${s.replace(/'/g, "'\\''")}'`;
}

function unescapeShell(s: string): string {
  if (s.startsWith("'") && s.endsWith("'") && s.length >= 2) {
    return s.slice(1, -1).replace(/'\\''/g, "'");
  }
  return s;
}

function transform(input: string, mode: Mode, lang: Lang): string {
  if (mode === "escape") {
    if (lang === "js") return escapeJs(input);
    if (lang === "json") return JSON.stringify(input).slice(1, -1);
    if (lang === "html") return escapeHtml(input);
    if (lang === "sql") return escapeSql(input);
    if (lang === "regex") return escapeRegex(input);
    return escapeShell(input);
  }
  if (lang === "js") return unescapeJs(input);
  if (lang === "json") return JSON.parse(`"${input}"`);
  if (lang === "html") return unescapeHtml(input);
  if (lang === "sql") return unescapeSql(input);
  if (lang === "regex") return unescapeRegex(input);
  return unescapeShell(input);
}

export default function StringEscapeTool() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<Mode>("escape");
  const [lang, setLang] = useState<Lang>("js");

  const result = useMemo(() => {
    if (!input) return { ok: true as const, value: "" };
    try {
      return { ok: true as const, value: transform(input, mode, lang) };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Failed" };
    }
  }, [input, mode, lang]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: "escape", label: "Escape" },
            { value: "unescape", label: "Unescape" },
          ]}
        />
        <SegmentedControl
          size="sm"
          ariaLabel="Language"
          value={lang}
          onChange={(v) => setLang(v as Lang)}
          options={[
            { value: "js", label: "JS" },
            { value: "json", label: "JSON" },
            { value: "html", label: "HTML" },
            { value: "sql", label: "SQL" },
            { value: "regex", label: "Regex" },
            { value: "shell", label: "Shell" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input} className="ml-auto">
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={mode === "escape" ? "Type or paste raw text…" : "Paste escaped string…"}
          className="min-h-[220px] font-mono text-sm lg:min-h-[320px]"
          spellCheck={false}
        />
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <CopyButton value={result.ok ? result.value : ""} />
          </div>
          <Textarea
            value={result.ok ? result.value : ""}
            readOnly
            className="min-h-[220px] font-mono text-sm lg:min-h-[320px]"
            spellCheck={false}
          />
          {!result.ok && <p className="text-xs text-destructive">{result.error}</p>}
        </div>
      </div>
    </div>
  );
}
