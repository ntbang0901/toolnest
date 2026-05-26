import type { ModelColumn, SchemaModel } from "../schema-model";
import { isBoolType, isDateType, isJsonType, isNumericType, isUuidType } from "../schema-model";
import { pascal, singularize } from "./shared";

function gqlType(col: ModelColumn): string {
  if (col.enumName) return pascal(col.enumName);
  const t = col.baseType.toLowerCase();
  if (isUuidType(t)) return "ID";
  if (isBoolType(t)) return "Boolean";
  if (isJsonType(t)) return "JSON";
  if (isDateType(t)) return "DateTime";
  if (isNumericType(t)) return /int/i.test(t) ? "Int" : "Float";
  return "String";
}

export function toGraphQL(model: SchemaModel): string {
  if (!model.tables.length) return "# no tables";
  const out: string[] = [];
  out.push(`scalar DateTime`);
  out.push(`scalar JSON`);
  out.push("");
  for (const e of model.enums) {
    out.push(`enum ${pascal(e.name)} {`);
    for (const v of e.values) out.push(`  ${v.name}`);
    out.push(`}\n`);
  }
  for (const t of model.tables) {
    const Type = pascal(singularize(t.name));
    if (t.note) out.push(`"""${t.note}"""`);
    out.push(`type ${Type} {`);
    for (const c of t.columns) {
      const bang = c.notNull || c.pk ? "!" : "";
      const isPk = c.pk;
      const type = isPk && c.name === "id" ? "ID" : gqlType(c);
      out.push(`  ${c.name}: ${type}${bang}`);
    }
    for (const r of model.refs.filter((r) => r.fromTable === t.id)) {
      const target = model.tables.find((tt) => tt.id === r.toTable);
      if (!target) continue;
      const field = r.fromColumn.replace(/_id$/i, "") || target.name.toLowerCase();
      out.push(`  ${field}: ${pascal(singularize(target.name))}`);
    }
    for (const r of model.refs.filter((r) => r.toTable === t.id)) {
      const source = model.tables.find((tt) => tt.id === r.fromTable);
      if (!source) continue;
      out.push(`  ${source.name}: [${pascal(singularize(source.name))}!]!`);
    }
    out.push(`}\n`);
  }
  return out.join("\n");
}

export function toMermaid(model: SchemaModel): string {
  if (!model.tables.length) return "%% no tables";
  const out: string[] = ["erDiagram"];
  for (const r of model.refs) {
    const a = model.tables.find((t) => t.id === r.fromTable)?.name ?? r.fromTable;
    const b = model.tables.find((t) => t.id === r.toTable)?.name ?? r.toTable;
    let arrow = "}o--||";
    if (r.kind === "1-1") arrow = "||--||";
    else if (r.kind === "n-n") arrow = "}o--o{";
    out.push(`  ${sanitize(a)} ${arrow} ${sanitize(b)} : "${r.fromColumn}->${r.toColumn}"`);
  }
  for (const t of model.tables) {
    out.push(`  ${sanitize(t.name)} {`);
    for (const c of t.columns) {
      const flags: string[] = [];
      if (c.pk) flags.push("PK");
      if (c.fk) flags.push("FK");
      if (c.unique && !c.pk) flags.push("UK");
      out.push(`    ${sanitize(c.baseType)} ${c.name}${flags.length ? " " + flags.join(",") : ""}`);
    }
    out.push(`  }`);
  }
  return out.join("\n");
}

function sanitize(s: string): string {
  return s.replace(/[^A-Za-z0-9_]/g, "_");
}

export function toDot(model: SchemaModel): string {
  if (!model.tables.length) return "// no tables";
  const out: string[] = [];
  out.push(`digraph schema {`);
  out.push(`  rankdir=LR;`);
  out.push(`  node [shape=plain, fontname="Helvetica"];`);
  for (const t of model.tables) {
    const rows = t.columns
      .map((c) => {
        const flags: string[] = [];
        if (c.pk) flags.push("PK");
        if (c.fk) flags.push("FK");
        return `<TR><TD PORT="${c.name}" ALIGN="LEFT">${flags.length ? `<B>${flags.join("·")}</B> ` : ""}${c.name} <FONT COLOR="#888">${c.baseType}</FONT></TD></TR>`;
      })
      .join("");
    out.push(
      `  "${t.id}" [label=<<TABLE BORDER="0" CELLBORDER="1" CELLSPACING="0"><TR><TD BGCOLOR="${t.headerColor ?? "#eee"}"><B>${t.name}</B></TD></TR>${rows}</TABLE>>];`,
    );
  }
  for (const r of model.refs) {
    out.push(`  "${r.fromTable}":${r.fromColumn} -> "${r.toTable}":${r.toColumn};`);
  }
  out.push(`}`);
  return out.join("\n");
}

export function toPlantUml(model: SchemaModel): string {
  if (!model.tables.length) return "' no tables";
  const out: string[] = ["@startuml", "hide circle", "skinparam linetype ortho", ""];
  for (const t of model.tables) {
    out.push(`entity "${t.name}" as ${sanitize(t.name)} {`);
    const pks = t.columns.filter((c) => c.pk);
    const others = t.columns.filter((c) => !c.pk);
    for (const c of pks) out.push(`  * ${c.name} : ${c.baseType} <<PK>>`);
    if (pks.length && others.length) out.push("  --");
    for (const c of others) {
      const star = c.notNull ? "* " : "  ";
      const tags: string[] = [];
      if (c.fk) tags.push("FK");
      if (c.unique) tags.push("UK");
      out.push(`  ${star}${c.name} : ${c.baseType}${tags.length ? " <<" + tags.join(",") + ">>" : ""}`);
    }
    out.push(`}`);
  }
  for (const r of model.refs) {
    const a = sanitize(model.tables.find((t) => t.id === r.fromTable)?.name ?? r.fromTable);
    const b = sanitize(model.tables.find((t) => t.id === r.toTable)?.name ?? r.toTable);
    out.push(`${a} }o--|| ${b}`);
  }
  out.push("@enduml");
  return out.join("\n");
}
