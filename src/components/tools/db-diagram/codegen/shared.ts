import type { ModelColumn, ModelTable, SchemaModel, ModelRef } from "../schema-model";
import { isBoolType, isDateType, isJsonType, isNumericType, isTextType, isUuidType } from "../schema-model";

export type TsKind = "string" | "number" | "boolean" | "Date" | "bigint" | "Buffer" | "unknown" | "object";

export function tsKind(col: ModelColumn): TsKind {
  if (col.enumName) return "string";
  if (isUuidType(col.baseType)) return "string";
  if (isBoolType(col.baseType)) return "boolean";
  if (isNumericType(col.baseType)) {
    if (/bigint/i.test(col.baseType)) return "bigint";
    return "number";
  }
  if (isDateType(col.baseType)) return "Date";
  if (isJsonType(col.baseType)) return "object";
  if (isTextType(col.baseType)) return "string";
  if (/blob|bytea|binary/i.test(col.baseType)) return "Buffer";
  return "unknown";
}

export function tsTypeOf(col: ModelColumn): string {
  const base = col.enumName ?? tsKindUnion(col);
  return col.notNull || col.pk ? base : `${base} | null`;
}

function tsKindUnion(col: ModelColumn): string {
  return tsKind(col);
}

export function camel(name: string): string {
  return name
    .replace(/[_\s-]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

export function pascal(name: string): string {
  const c = camel(name);
  return c.charAt(0).toUpperCase() + c.slice(1);
}

export function snake(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

export function singularize(name: string): string {
  if (/ies$/i.test(name)) return name.slice(0, -3) + "y";
  if (/ses$/i.test(name) || /xes$/i.test(name) || /ches$/i.test(name) || /shes$/i.test(name)) {
    return name.slice(0, -2);
  }
  if (/s$/i.test(name) && !/ss$/i.test(name)) return name.slice(0, -1);
  return name;
}

export function refsByTable(model: SchemaModel) {
  const out = new Map<string, { outgoing: ModelRef[]; incoming: ModelRef[] }>();
  for (const t of model.tables) out.set(t.id, { outgoing: [], incoming: [] });
  for (const r of model.refs) {
    out.get(r.fromTable)?.outgoing.push(r);
    out.get(r.toTable)?.incoming.push(r);
  }
  return out;
}

export function bareTableName(t: ModelTable): string {
  return t.name;
}

export function quoteIfNeeded(name: string, dialect: "pg" | "mysql" | "mssql" = "pg"): string {
  const safe = /^[a-z_][a-z0-9_]*$/i.test(name) && !RESERVED.has(name.toLowerCase());
  if (safe) return name;
  if (dialect === "mysql") return `\`${name}\``;
  if (dialect === "mssql") return `[${name}]`;
  return `"${name}"`;
}

const RESERVED = new Set([
  "user", "order", "group", "table", "select", "where", "from", "join", "index",
  "primary", "key", "default", "check", "unique", "by", "asc", "desc", "case",
]);
