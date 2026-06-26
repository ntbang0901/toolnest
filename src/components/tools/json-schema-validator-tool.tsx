import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/tools/code-editor";
import { formatInput } from "@/lib/format-input";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const ajv = new Ajv({ allErrors: true, strict: false });
addFormats(ajv);

const EXAMPLE_SCHEMA = `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "age", "email"],
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "age": { "type": "integer", "minimum": 0, "maximum": 150 },
    "email": { "type": "string", "format": "email" },
    "tags": { "type": "array", "items": { "type": "string" }, "uniqueItems": true }
  },
  "additionalProperties": false
}`;

const EXAMPLE_DATA = `{
  "name": "Alice",
  "age": 30,
  "email": "alice@example.com",
  "tags": ["admin", "user"]
}`;

type Result =
  | { kind: "schema-error"; message: string }
  | { kind: "data-error"; message: string }
  | { kind: "result"; errors: Array<{ path: string; message: string }> };

export default function JsonSchemaValidatorTool() {
  const [schemaText, setSchemaText] = useState(() => {
    const r = formatInput(EXAMPLE_SCHEMA, "json");
    return r.ok ? r.value : EXAMPLE_SCHEMA;
  });
  const [dataText, setDataText] = useState(() => {
    const r = formatInput(EXAMPLE_DATA, "json");
    return r.ok ? r.value : EXAMPLE_DATA;
  });

  const result = useMemo<Result>(() => {
    let schema: unknown;
    let data: unknown;

    try {
      schema = JSON.parse(schemaText);
    } catch (e) {
      return { kind: "schema-error", message: (e as Error).message };
    }

    try {
      data = JSON.parse(dataText);
    } catch (e) {
      return { kind: "data-error", message: (e as Error).message };
    }

    try {
      // Re-compile every time schema changes — Ajv caches by schema identity
      const validate = ajv.compile(schema as object);
      const valid = validate(data);
      if (valid) return { kind: "result", errors: [] };

      const errors = (validate.errors ?? []).map((err) => ({
        path: err.instancePath || "#",
        message: err.message ?? "unknown error",
      }));
      return { kind: "result", errors };
    } catch (e) {
      return { kind: "schema-error", message: (e as Error).message };
    }
  }, [schemaText, dataText]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">JSON Schema</label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const r = formatInput(schemaText, "json");
                  if (r.ok) setSchemaText(r.value);
                }}
                disabled={!schemaText.trim()}
              >
                Format
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSchemaText(EXAMPLE_SCHEMA)}>
                Example
              </Button>
            </div>
          </div>
          <CodeEditor
            value={schemaText}
            onChange={setSchemaText}
            language="json"
            minHeight="256px"
          />
          {result.kind === "schema-error" && (
            <p className="text-xs text-destructive">Schema error: {result.message}</p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">JSON Data</label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const r = formatInput(dataText, "json");
                  if (r.ok) setDataText(r.value);
                }}
                disabled={!dataText.trim()}
              >
                Format
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setDataText(EXAMPLE_DATA)}>
                Example
              </Button>
            </div>
          </div>
          <CodeEditor
            value={dataText}
            onChange={setDataText}
            language="json"
            minHeight="256px"
          />
          {result.kind === "data-error" && (
            <p className="text-xs text-destructive">Data parse error: {result.message}</p>
          )}
        </div>
      </div>

      {result.kind === "result" && (
        <div
          className={`rounded-lg border p-4 ${
            result.errors.length === 0
              ? "border-green-500/30 bg-green-500/5"
              : "border-destructive/30 bg-destructive/5"
          }`}
        >
          {result.errors.length === 0 ? (
            <p className="text-sm font-medium text-green-600 dark:text-green-400">
              Valid — data matches schema.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium text-destructive">
                {result.errors.length} validation error{result.errors.length > 1 ? "s" : ""}
              </p>
              <ul className="flex flex-col gap-1">
                {result.errors.map((err, i) => (
                  <li key={i} className="flex gap-2 text-xs">
                    <span className="font-mono text-muted-foreground shrink-0">{err.path}</span>
                    <span className="text-destructive">{err.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Powered by Ajv — supports JSON Schema draft-07 including{" "}
        <code>$ref</code>, <code>$defs</code>, <code>if/then/else</code>,{" "}
        <code>format</code>, <code>patternProperties</code>, and more.
      </p>
    </div>
  );
}
