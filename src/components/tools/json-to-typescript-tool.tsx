import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import { formatInput } from "@/lib/format-input";

const SAMPLE = `{
  "name": "Alice",
  "age": 30,
  "active": true,
  "score": 9.5,
  "nickname": null,
  "tags": ["admin", "user"],
  "mixed": [1, "two", null, true],
  "address": {
    "city": "Hanoi",
    "zip": "100000"
  },
  "history": [
    { "date": "2024-01-01", "action": "login" }
  ]
}`;

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [k: string]: JsonValue };

function unionType(types: string[]): string {
  const unique = [...new Set(types)];
  if (unique.length === 1) return unique[0];
  return unique.join(" | ");
}

function inferType(
  value: JsonValue,
  name: string,
  interfaces: Map<string, string>
): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "number" : "number";
  if (typeof value === "string") return "string";

  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    // Collect types of ALL items, not just [0]
    const itemTypes = value.map((item) => inferType(item, name + "Item", interfaces));
    return `(${unionType(itemTypes)})[]`;
  }

  if (typeof value === "object") {
    const interfaceName = toPascalCase(name);
    const fields = Object.entries(value)
      .map(([k, v]) => {
        const fieldType = inferType(v, k, interfaces);
        // Mark field as optional if value is null
        const optional = v === null ? "?" : "";
        // Use union with null for nullable non-null values in arrays handled above
        return `  ${sanitizeKey(k)}${optional}: ${fieldType};`;
      })
      .join("\n");
    interfaces.set(interfaceName, `interface ${interfaceName} {\n${fields}\n}`);
    return interfaceName;
  }

  return "unknown";
}

function inferRootType(
  value: JsonValue,
  rootName: string,
  interfaces: Map<string, string>
): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    // For root arrays, union all item types
    const itemTypes = value.map((item) =>
      inferType(item, `${rootName}Item`, interfaces)
    );
    return `(${unionType(itemTypes)})[]`;
  }
  return inferType(value, rootName, interfaces);
}

function toPascalCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase());
}

function sanitizeKey(k: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
}

export default function JsonToTypescriptTool() {
  const [input, setInput] = useState(() => { const r = formatInput(SAMPLE, "json"); return r.ok ? r.value : SAMPLE; });
  const [rootName, setRootName] = useState("Root");

  const result = useMemo(() => {
    if (!input.trim()) return { ok: false as const, output: "", error: "" };
    try {
      const parsed = JSON.parse(input) as JsonValue;
      const interfaces = new Map<string, string>();
      const rootType = inferRootType(parsed, rootName || "Root", interfaces);

      // Emit nested interfaces first (dependency order — inner types before outer)
      const defs = [...interfaces.values()].reverse().join("\n\n");
      const rootAlias =
        interfaces.has(toPascalCase(rootName || "Root"))
          ? "" // Root is already defined as an interface
          : `type ${toPascalCase(rootName || "Root")} = ${rootType};`;

      const output = [defs, rootAlias].filter(Boolean).join("\n\n");
      return { ok: true as const, output, error: "" };
    } catch (e) {
      return { ok: false as const, output: "", error: (e as Error).message };
    }
  }, [input, rootName]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium shrink-0">Root type name</label>
        <input
          value={rootName}
          onChange={(e) => setRootName(e.target.value)}
          className="flex h-8 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const r = formatInput(input, "json");
            if (r.ok) setInput(r.value);
          }}
          disabled={!input.trim() || !result.ok}
        >
          Format
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
          Example
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">JSON Input</label>
          <CodeEditor
            value={input}
            onChange={setInput}
            language="json"
            minHeight="320px"
          />
          {!result.ok && result.error && (
            <p className="text-xs text-destructive">{result.error}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">TypeScript Output</label>
            {result.ok && <CopyButton value={result.output} label="" />}
          </div>
          <CodeEditor
            value={result.ok ? result.output : ""}
            language="typescript"
            readOnly
            minHeight="320px"
            placeholder="Output will appear here…"
          />
        </div>
      </div>
    </div>
  );
}
