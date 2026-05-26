import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopyButton } from "@/components/tools/copy-button";

function tokenize(input: string): string[] {
  return (
    input
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
      .replace(/[_\-./\s]+/g, " ")
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => w.toLowerCase())
  );
}

const transforms: Array<{ id: string; label: string; fn: (parts: string[]) => string }> = [
  { id: "camel", label: "camelCase", fn: (p) => p.map((w, i) => (i === 0 ? w : cap(w))).join("") },
  { id: "pascal", label: "PascalCase", fn: (p) => p.map(cap).join("") },
  { id: "snake", label: "snake_case", fn: (p) => p.join("_") },
  { id: "kebab", label: "kebab-case", fn: (p) => p.join("-") },
  { id: "constant", label: "CONSTANT_CASE", fn: (p) => p.join("_").toUpperCase() },
  { id: "dot", label: "dot.case", fn: (p) => p.join(".") },
  { id: "path", label: "path/case", fn: (p) => p.join("/") },
  { id: "title", label: "Title Case", fn: (p) => p.map(cap).join(" ") },
  { id: "sentence", label: "Sentence case", fn: (p) => (p.length ? cap(p[0]) + (p.length > 1 ? " " + p.slice(1).join(" ") : "") : "") },
  { id: "upper", label: "UPPER CASE", fn: (p) => p.join(" ").toUpperCase() },
  { id: "lower", label: "lower case", fn: (p) => p.join(" ") },
];

function cap(w: string): string {
  return w ? w[0].toUpperCase() + w.slice(1) : w;
}

export default function CaseConverterTool() {
  const [input, setInput] = useState("");

  const rows = useMemo(() => {
    const tokens = tokenize(input);
    return transforms.map((t) => ({ id: t.id, label: t.label, value: tokens.length ? t.fn(tokens) : "" }));
  }, [input]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Input</span>
          <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
            Clear
          </Button>
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or paste any text — handles camelCase, snake_case, kebab-case, spaces…"
          className="min-h-[120px]"
          spellCheck={false}
        />
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.id} className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{r.label}</span>
              <CopyButton value={r.value} label="" />
            </div>
            <div className="break-all font-mono text-sm">
              {r.value || <span className="text-muted-foreground">—</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
