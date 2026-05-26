import type { ModelColumn, ModelRef, ModelTable, SchemaModel } from "../schema-model";
import { isBoolType, isDateType, isJsonType, isNumericType, isUuidType } from "../schema-model";
import { pascal, refsByTable, singularize } from "./shared";

function prismaType(col: ModelColumn): string {
  if (col.enumName) return pascal(col.enumName);
  const t = col.baseType.toLowerCase();
  if (isUuidType(t)) return "String";
  if (isBoolType(t)) return "Boolean";
  if (isJsonType(t)) return "Json";
  if (isDateType(t)) return "DateTime";
  if (isNumericType(t)) {
    if (/bigint/.test(t)) return "BigInt";
    if (/decimal|numeric|money/.test(t)) return "Decimal";
    if (/float|double|real/.test(t)) return "Float";
    return "Int";
  }
  if (/bytea|blob|binary/.test(t)) return "Bytes";
  return "String";
}

function attrs(col: ModelColumn, table: ModelTable): string[] {
  const out: string[] = [];
  if (col.pk && !table.indexes.some((i) => i.pk)) out.push("@id");
  if (col.unique && !col.pk) out.push("@unique");
  if (col.increment) out.push("@default(autoincrement())");
  else if (col.default !== undefined) {
    if (col.defaultIsExpr) {
      const v = col.default.toLowerCase();
      if (v === "now()" || v === "current_timestamp") out.push("@default(now())");
      else out.push(`@default(dbgenerated("${col.default}"))`);
    } else {
      const t = prismaType(col);
      if (t === "String") out.push(`@default("${col.default}")`);
      else if (t === "Boolean") out.push(`@default(${col.default === "true" || col.default === "1"})`);
      else out.push(`@default(${col.default})`);
    }
  }
  if (isUuidType(col.baseType) && col.pk) out.push("@default(uuid())");
  return out;
}

function relationsFor(table: ModelTable, refs: { outgoing: ModelRef[]; incoming: ModelRef[] }, allTables: ModelTable[]): string[] {
  const lines: string[] = [];
  for (const r of refs.outgoing) {
    const target = allTables.find((t) => t.id === r.toTable);
    if (!target) continue;
    const fieldName = relName(r.fromColumn, target.name);
    const refType = pascal(target.name);
    const optional = !table.columns.find((c) => c.name === r.fromColumn)?.notNull ? "?" : "";
    lines.push(
      `  ${fieldName} ${refType}${optional} @relation(fields: [${r.fromColumn}], references: [${r.toColumn}])`,
    );
  }
  for (const r of refs.incoming) {
    const source = allTables.find((t) => t.id === r.fromTable);
    if (!source) continue;
    const list = pascal(source.name);
    const fieldName = camelPlural(source.name);
    if (r.kind === "1-1") {
      lines.push(`  ${singularize(fieldName)} ${list}?`);
    } else {
      lines.push(`  ${fieldName} ${list}[]`);
    }
  }
  return lines;
}

function relName(fk: string, targetTable: string): string {
  const stripped = fk.replace(/_id$/i, "").replace(/Id$/, "");
  if (stripped && stripped !== fk) return camel(stripped);
  return camel(singularize(targetTable));
}

function camel(s: string): string {
  return s
    .replace(/[_\s-]+(.)/g, (_, c: string) => c.toUpperCase())
    .replace(/^[A-Z]/, (c) => c.toLowerCase());
}

function camelPlural(s: string): string {
  const c = camel(s);
  return /s$/i.test(c) ? c : `${c}s`;
}

export function toPrisma(model: SchemaModel): string {
  if (!model.tables.length) return "// no tables";
  const refIdx = refsByTable(model);
  const out: string[] = [];

  out.push("generator client {\n  provider = \"prisma-client-js\"\n}\n");
  out.push("datasource db {\n  provider = \"postgresql\"\n  url      = env(\"DATABASE_URL\")\n}\n");

  for (const e of model.enums) {
    out.push(`enum ${pascal(e.name)} {\n${e.values.map((v) => `  ${v.name}`).join("\n")}\n}\n`);
  }

  for (const t of model.tables) {
    const buf: string[] = [];
    buf.push(`model ${pascal(t.name)} {`);
    for (const col of t.columns) {
      const optional = col.notNull || col.pk ? "" : "?";
      const type = prismaType(col);
      const a = attrs(col, t);
      buf.push(`  ${col.name} ${type}${optional}${a.length ? " " + a.join(" ") : ""}`);
    }
    const rels = refIdx.get(t.id);
    if (rels) {
      const relLines = relationsFor(t, rels, model.tables);
      if (relLines.length) buf.push("", ...relLines);
    }
    const composite = t.indexes.find((i) => i.pk);
    if (composite) buf.push(`\n  @@id([${composite.columns.join(", ")}])`);
    for (const idx of t.indexes) {
      if (idx.pk) continue;
      if (idx.unique) buf.push(`  @@unique([${idx.columns.join(", ")}]${idx.name ? `, name: "${idx.name}"` : ""})`);
      else buf.push(`  @@index([${idx.columns.join(", ")}]${idx.name ? `, name: "${idx.name}"` : ""})`);
    }
    if (t.name !== pascal(t.name)) buf.push(`  @@map("${t.name}")`);
    buf.push("}");
    out.push(buf.join("\n") + "\n");
  }
  return out.join("\n");
}
