import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/tools/code-editor";

// Minimal JSON Schema validator (draft-07 subset) — no external deps
type Schema = Record<string, unknown>;
type ValidationError = { path: string; message: string };

function validate(data: unknown, schema: Schema, path = "#"): ValidationError[] {
  const errors: ValidationError[] = [];

  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = data === null ? "null" : Array.isArray(data) ? "array" : typeof data;
    if (!types.includes(actual)) {
      errors.push({ path, message: `Expected type ${types.join("|")}, got ${actual}` });
      return errors;
    }
  }

  if (schema.enum !== undefined) {
    const enums = schema.enum as unknown[];
    if (!enums.some((e) => JSON.stringify(e) === JSON.stringify(data))) {
      errors.push({ path, message: `Value must be one of: ${enums.map((e) => JSON.stringify(e)).join(", ")}` });
    }
  }

  if (schema.const !== undefined) {
    if (JSON.stringify(schema.const) !== JSON.stringify(data)) {
      errors.push({ path, message: `Value must be ${JSON.stringify(schema.const)}` });
    }
  }

  if (typeof data === "string") {
    if (typeof schema.minLength === "number" && data.length < schema.minLength)
      errors.push({ path, message: `String too short (min ${schema.minLength})` });
    if (typeof schema.maxLength === "number" && data.length > schema.maxLength)
      errors.push({ path, message: `String too long (max ${schema.maxLength})` });
    if (typeof schema.pattern === "string") {
      try {
        if (!new RegExp(schema.pattern).test(data))
          errors.push({ path, message: `String does not match pattern /${schema.pattern}/` });
      } catch {
        errors.push({ path, message: `Invalid pattern: ${schema.pattern}` });
      }
    }
  }

  if (typeof data === "number") {
    if (typeof schema.minimum === "number" && data < schema.minimum)
      errors.push({ path, message: `Value ${data} < minimum ${schema.minimum}` });
    if (typeof schema.maximum === "number" && data > schema.maximum)
      errors.push({ path, message: `Value ${data} > maximum ${schema.maximum}` });
    if (typeof schema.exclusiveMinimum === "number" && data <= schema.exclusiveMinimum)
      errors.push({ path, message: `Value ${data} must be > ${schema.exclusiveMinimum}` });
    if (typeof schema.exclusiveMaximum === "number" && data >= schema.exclusiveMaximum)
      errors.push({ path, message: `Value ${data} must be < ${schema.exclusiveMaximum}` });
    if (typeof schema.multipleOf === "number" && data % schema.multipleOf !== 0)
      errors.push({ path, message: `Value must be multiple of ${schema.multipleOf}` });
  }

  if (Array.isArray(data)) {
    if (typeof schema.minItems === "number" && data.length < schema.minItems)
      errors.push({ path, message: `Array too short (min ${schema.minItems} items)` });
    if (typeof schema.maxItems === "number" && data.length > schema.maxItems)
      errors.push({ path, message: `Array too long (max ${schema.maxItems} items)` });
    if (schema.uniqueItems === true) {
      const seen = new Set<string>();
      data.forEach((item, i) => {
        const key = JSON.stringify(item);
        if (seen.has(key)) errors.push({ path: `${path}[${i}]`, message: "Duplicate item" });
        seen.add(key);
      });
    }
    if (schema.items && typeof schema.items === "object" && !Array.isArray(schema.items)) {
      data.forEach((item, i) => {
        errors.push(...validate(item, schema.items as Schema, `${path}[${i}]`));
      });
    }
  }

  if (data !== null && typeof data === "object" && !Array.isArray(data)) {
    const obj = data as Record<string, unknown>;
    const required = (schema.required as string[] | undefined) ?? [];
    for (const key of required) {
      if (!(key in obj)) errors.push({ path, message: `Missing required property: "${key}"` });
    }
    if (typeof schema.minProperties === "number" && Object.keys(obj).length < schema.minProperties)
      errors.push({ path, message: `Too few properties (min ${schema.minProperties})` });
    if (typeof schema.maxProperties === "number" && Object.keys(obj).length > schema.maxProperties)
      errors.push({ path, message: `Too many properties (max ${schema.maxProperties})` });
    if (schema.properties && typeof schema.properties === "object") {
      const props = schema.properties as Record<string, Schema>;
      for (const [key, subSchema] of Object.entries(props)) {
        if (key in obj) {
          errors.push(...validate(obj[key], subSchema, `${path}.${key}`));
        }
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties as object));
      for (const key of Object.keys(obj)) {
        if (!allowed.has(key))
          errors.push({ path: `${path}.${key}`, message: `Additional property not allowed: "${key}"` });
      }
    }
  }

  if (Array.isArray(schema.allOf)) {
    for (const sub of schema.allOf as Schema[]) errors.push(...validate(data, sub, path));
  }
  if (Array.isArray(schema.anyOf)) {
    const anyPasses = (schema.anyOf as Schema[]).some((sub) => validate(data, sub, path).length === 0);
    if (!anyPasses) errors.push({ path, message: "Value does not match any of the anyOf schemas" });
  }
  if (Array.isArray(schema.oneOf)) {
    const passing = (schema.oneOf as Schema[]).filter((sub) => validate(data, sub, path).length === 0);
    if (passing.length !== 1)
      errors.push({ path, message: `Value must match exactly one of oneOf schemas (matched ${passing.length})` });
  }
  if (schema.not !== undefined) {
    if (validate(data, schema.not as Schema, path).length === 0)
      errors.push({ path, message: "Value must NOT match the 'not' schema" });
  }

  return errors;
}

const EXAMPLE_SCHEMA = `{
  "type": "object",
  "required": ["name", "age"],
  "properties": {
    "name": { "type": "string", "minLength": 1 },
    "age": { "type": "integer", "minimum": 0, "maximum": 150 },
    "email": { "type": "string", "pattern": "^[^@]+@[^@]+$" }
  },
  "additionalProperties": false
}`;

const EXAMPLE_DATA = `{
  "name": "Alice",
  "age": 30,
  "email": "alice@example.com"
}`;

export default function JsonSchemaValidatorTool() {
  const [schemaText, setSchemaText] = useState(EXAMPLE_SCHEMA);
  const [dataText, setDataText] = useState(EXAMPLE_DATA);

  const result = useMemo(() => {
    let schema: Schema;
    let data: unknown;
    try {
      schema = JSON.parse(schemaText);
    } catch (e) {
      return { kind: "schema-error" as const, message: (e as Error).message };
    }
    try {
      data = JSON.parse(dataText);
    } catch (e) {
      return { kind: "data-error" as const, message: (e as Error).message };
    }
    const errors = validate(data, schema);
    return { kind: "result" as const, errors };
  }, [schemaText, dataText]);

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">JSON Schema</label>
            <Button variant="ghost" size="sm" onClick={() => setSchemaText(EXAMPLE_SCHEMA)}>
              Example
            </Button>
          </div>
          <CodeEditor
            value={schemaText}
            onChange={setSchemaText}
            language="json"
            minHeight="256px"
          />
          {result.kind === "schema-error" && (
            <p className="text-xs text-destructive">Schema parse error: {result.message}</p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">JSON Data</label>
            <Button variant="ghost" size="sm" onClick={() => setDataText(EXAMPLE_DATA)}>
              Example
            </Button>
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
              Valid — data matches the schema.
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
    </div>
  );
}
