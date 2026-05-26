import type { ModelColumn, SchemaModel } from "../schema-model";
import { isBoolType, isDateType, isJsonType, isNumericType, isUuidType } from "../schema-model";
import { camel, pascal } from "./shared";

function drizzleColumn(col: ModelColumn): string {
  const t = col.baseType.toLowerCase();
  let fn: string;
  let args = `"${col.name}"`;
  if (col.enumName) fn = "text"; // simple fallback
  else if (isUuidType(t)) fn = "uuid";
  else if (isBoolType(t)) fn = "boolean";
  else if (isJsonType(t)) fn = "jsonb";
  else if (isDateType(t)) {
    fn = "timestamp";
    if (/timestamptz|with time zone/i.test(col.rawType)) args += `, { withTimezone: true }`;
  } else if (isNumericType(t)) {
    if (/bigint/.test(t)) fn = "bigint";
    else if (/decimal|numeric/.test(t)) fn = "decimal";
    else if (/float|double|real/.test(t)) fn = "doublePrecision";
    else if (/smallint/.test(t)) fn = "smallint";
    else fn = "integer";
    if (col.increment) fn = fn === "bigint" ? "bigserial" : "serial";
  } else if (/varchar|char/.test(t)) {
    fn = "varchar";
    if (col.args) args += `, { length: ${col.args} }`;
  } else if (/text|string|clob/.test(t)) fn = "text";
  else if (/bytea|blob|binary/.test(t)) fn = "bytea";
  else fn = "text";

  let chain = `${fn}(${args})`;
  if (col.pk) chain += ".primaryKey()";
  if (col.notNull && !col.pk) chain += ".notNull()";
  if (col.unique && !col.pk) chain += ".unique()";
  if (col.default !== undefined) {
    if (col.defaultIsExpr) {
      if (/now\(\)|current_timestamp/i.test(col.default)) chain += ".defaultNow()";
      else chain += `.default(sql\`${col.default}\`)`;
    } else {
      if (/^(true|false)$/i.test(col.default)) chain += `.default(${col.default.toLowerCase()})`;
      else if (!isNaN(Number(col.default))) chain += `.default(${col.default})`;
      else chain += `.default("${col.default}")`;
    }
  }
  return chain;
}

export function toDrizzle(model: SchemaModel): string {
  if (!model.tables.length) return "// no tables";
  const out: string[] = [];
  out.push("// Drizzle ORM (Postgres) — adjust import if using mysql/sqlite");
  out.push(
    `import { pgTable, serial, bigserial, integer, bigint, smallint, decimal, doublePrecision, varchar, text, boolean, timestamp, jsonb, uuid, bytea } from "drizzle-orm/pg-core";`,
  );
  out.push(`import { sql, relations } from "drizzle-orm";\n`);

  for (const t of model.tables) {
    const varName = camel(t.name);
    out.push(`export const ${varName} = pgTable("${t.name}", {`);
    for (const col of t.columns) {
      out.push(`  ${camel(col.name)}: ${drizzleColumn(col)},`);
    }
    out.push(`}, (${varName}) => ({`);
    for (let i = 0; i < t.indexes.length; i++) {
      const idx = t.indexes[i];
      if (idx.pk) continue;
      const idxName = idx.name ?? `${t.name}_${idx.columns.join("_")}_idx`;
      const cols = idx.columns.map((c) => `${varName}.${camel(c)}`).join(", ");
      const fnName = idx.unique ? "uniqueIndex" : "index";
      out.push(`  ${camel(idxName)}: ${fnName}("${idxName}").on(${cols}),`);
    }
    out.push(`}));\n`);
  }

  for (const t of model.tables) {
    const outRefs = model.refs.filter((r) => r.fromTable === t.id);
    const inRefs = model.refs.filter((r) => r.toTable === t.id);
    if (!outRefs.length && !inRefs.length) continue;
    const v = camel(t.name);
    out.push(`export const ${v}Relations = relations(${v}, ({ one, many }) => ({`);
    for (const r of outRefs) {
      const target = model.tables.find((tt) => tt.id === r.toTable);
      if (!target) continue;
      const fieldName = camel(r.fromColumn.replace(/_id$/i, "")) || camel(target.name);
      out.push(
        `  ${fieldName}: one(${camel(target.name)}, { fields: [${v}.${camel(r.fromColumn)}], references: [${camel(target.name)}.${camel(r.toColumn)}] }),`,
      );
    }
    for (const r of inRefs) {
      const source = model.tables.find((tt) => tt.id === r.fromTable);
      if (!source) continue;
      out.push(`  ${camel(source.name)}: many(${camel(source.name)}),`);
    }
    out.push(`}));\n`);
  }

  // suppress unused import warning by referencing pascal
  void pascal;
  return out.join("\n");
}
