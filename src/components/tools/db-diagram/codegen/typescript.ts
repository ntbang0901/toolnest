import type { ModelColumn, SchemaModel } from "../schema-model";
import { isBoolType, isDateType, isJsonType, isNumericType, isUuidType } from "../schema-model";
import { pascal, singularize } from "./shared";

function tsType(col: ModelColumn): string {
  if (col.enumName) return pascal(col.enumName);
  const t = col.baseType.toLowerCase();
  if (isUuidType(t)) return "string";
  if (isBoolType(t)) return "boolean";
  if (isJsonType(t)) return "Record<string, unknown>";
  if (isDateType(t)) return "Date";
  if (isNumericType(t)) return /bigint/.test(t) ? "bigint" : "number";
  if (/bytea|blob|binary/.test(t)) return "Uint8Array";
  return "string";
}

function colDoc(col: ModelColumn): string {
  const parts: string[] = [];
  if (col.pk) parts.push("PK");
  if (col.fk) parts.push("FK");
  if (col.unique && !col.pk) parts.push("unique");
  if (col.note) parts.push(col.note);
  return parts.length ? ` // ${parts.join(", ")}` : "";
}

export function toTypeScript(model: SchemaModel): string {
  if (!model.tables.length) return "// no tables";
  const out: string[] = [];
  for (const e of model.enums) {
    out.push(
      `export type ${pascal(e.name)} = ${e.values.map((v) => `"${v.name}"`).join(" | ")};\n`,
    );
  }
  for (const t of model.tables) {
    out.push(`export interface ${pascal(singularize(t.name))} {`);
    for (const c of t.columns) {
      const opt = c.notNull || c.pk ? "" : " | null";
      out.push(`  ${c.name}: ${tsType(c)}${opt};${colDoc(c)}`);
    }
    out.push("}\n");
  }
  return out.join("\n");
}

export function toZod(model: SchemaModel): string {
  if (!model.tables.length) return "// no tables";
  const out: string[] = [];
  out.push(`import { z } from "zod";\n`);
  for (const e of model.enums) {
    out.push(
      `export const ${pascal(e.name)}Schema = z.enum([${e.values.map((v) => `"${v.name}"`).join(", ")}]);`,
    );
    out.push(`export type ${pascal(e.name)} = z.infer<typeof ${pascal(e.name)}Schema>;\n`);
  }
  for (const t of model.tables) {
    const Name = pascal(singularize(t.name));
    out.push(`export const ${Name}Schema = z.object({`);
    for (const c of t.columns) {
      out.push(`  ${c.name}: ${zodFor(c)},`);
    }
    out.push(`});`);
    out.push(`export type ${Name} = z.infer<typeof ${Name}Schema>;\n`);
  }
  return out.join("\n");
}

function zodFor(col: ModelColumn): string {
  let z: string;
  if (col.enumName) z = `${pascal(col.enumName)}Schema`;
  else {
    const t = col.baseType.toLowerCase();
    if (isUuidType(t)) z = "z.string().uuid()";
    else if (isBoolType(t)) z = "z.boolean()";
    else if (isJsonType(t)) z = "z.record(z.unknown())";
    else if (isDateType(t)) z = "z.coerce.date()";
    else if (isNumericType(t)) {
      if (/int/i.test(t)) z = "z.number().int()";
      else z = "z.number()";
    } else if (/varchar|char/i.test(col.rawType)) {
      const len = col.args ? `.max(${col.args.split(",")[0].trim()})` : "";
      z = `z.string()${len}`;
    } else if (/^(text|string|clob)/i.test(t)) z = "z.string()";
    else z = "z.string()";
  }
  if (col.note?.toLowerCase().includes("email")) z = "z.string().email()";
  if (col.note?.toLowerCase().includes("url")) z = "z.string().url()";
  if (!col.notNull && !col.pk) z = `${z}.nullable()`;
  return z;
}

export function toJsonSchema(model: SchemaModel): string {
  if (!model.tables.length) return "{}";
  const definitions: Record<string, unknown> = {};
  for (const t of model.tables) {
    const props: Record<string, unknown> = {};
    const required: string[] = [];
    for (const c of t.columns) {
      props[c.name] = jsonTypeFor(c);
      if (c.notNull || c.pk) required.push(c.name);
    }
    definitions[pascal(singularize(t.name))] = {
      type: "object",
      properties: props,
      ...(required.length ? { required } : {}),
    };
  }
  return JSON.stringify({ $schema: "http://json-schema.org/draft-07/schema#", definitions }, null, 2);
}

function jsonTypeFor(col: ModelColumn): Record<string, unknown> {
  const t = col.baseType.toLowerCase();
  const nullable = !col.notNull && !col.pk;
  let entry: Record<string, unknown>;
  if (col.enumName) entry = { type: "string", title: pascal(col.enumName) };
  else if (isUuidType(t)) entry = { type: "string", format: "uuid" };
  else if (isBoolType(t)) entry = { type: "boolean" };
  else if (isJsonType(t)) entry = { type: "object" };
  else if (isDateType(t)) entry = { type: "string", format: "date-time" };
  else if (isNumericType(t)) entry = { type: /int/i.test(t) ? "integer" : "number" };
  else entry = { type: "string", ...(col.args ? { maxLength: Number(col.args.split(",")[0]) } : {}) };
  if (nullable) entry.type = [entry.type as string, "null"];
  if (col.note) entry.description = col.note;
  return entry;
}
