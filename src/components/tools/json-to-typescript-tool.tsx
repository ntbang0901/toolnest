import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

const SAMPLE = `{
  "name": "Alice",
  "age": 30,
  "active": true,
  "score": 9.5,
  "tags": ["admin", "user"],
  "address": {
    "city": "Hanoi",
    "zip": "100000"
  },
  "history": [
    { "date": "2024-01-01", "action": "login" }
  ]
}`;

type JsonValue =
  | string | number | boolean | null
  | JsonValue[]
  | { [k: string]: JsonValue };

function inferType(value: JsonValue, name: string, interfaces: Map<string, string>): string {
  if (value === null) return "null";
  if (typeof value === "boolean") return "boolean";
  if (typeof value === "number") return Number.isInteger(value) ? "number" : "number";
  if (typeof value === "string") return "string";
  if (Array.isArray(value)) {
    if (value.length === 0) return "unknown[]";
    const itemType = inferType(value[0], name + "Item", interfaces);
    return `${itemType}[]`;
  }
  if (typeof value === "object") {
    const interfaceName = toPascalCase(name);
    const fields = Object.entries(value)
      .map(([k, v]) => `  ${sanitizeKey(k)}: ${inferType(v, k, interfaces)};`)
      .join("\n");
    interfaces.set(interfaceName, `interface ${interfaceName} {\n${fields}\n}`);
    return interfaceName;
  }
  return "unknown";
}

function toPascalCase(s: string): string {
  return s
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^(.)/, (c) => c.toUpperCase());
}

function sanitizeKey(k: string): string {
  return /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : `"${k}"`;
}

function jsonToTs(json: string, rootName: string): string {
  const parsed: JsonValue = JSON.parse(json);
  const interfaces = new Map<string, string>();

  if (Array.isArray(parsed)) {
    const itemType = parsed.length > 0 ? inferType(parsed[0], rootName + "Item", interfaces) : "unknown";
    const defs = [...interfaces.values()].reverse().join("\n\n");
    return defs ? `${defs}\n\ntype ${toPascalCase(rootName)} = ${itemType}[];` : `type ${toPascalCase(rootName)} = ${itemType}[];`;
  }

  if (typeof parsed === "object" && parsed !== null) {
    inferType(parsed, rootName, interfaces);
    return [...interfaces.values()].reverse().join("\n\n");
  }

  return `type ${toPascalCase(rootName)} = ${typeof parsed};`;
}

export default function JsonToTypescriptTool() {
  const [input, setInput] = useState(SAMPLE);
  const [rootName, setRootName] = useState("Root");

  const result = useMemo(() => {
    if (!input.trim()) return { ok: false, output: "", error: "" };
    try {
      return { ok: true, output: jsonToTs(input, rootName || "Root"), error: "" };
    } catch (e) {
      return { ok: false, output: "", error: (e as Error).message };
    }
  }, [input, rootName]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium shrink-0">Root type name</label>
        <input
          value={rootName}
          onChange={(e) => setRootName(e.target.value)}
          className="flex h-8 w-40 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
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
          {result.error && (
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
