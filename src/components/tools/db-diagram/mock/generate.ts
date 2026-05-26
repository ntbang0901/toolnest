import type { ModelTable, SchemaModel } from "../schema-model";
import { quoteIfNeeded } from "../codegen/shared";
import { fakeValue, inferKind } from "./faker";
import { createRng, hashSeed } from "./rng";

export type SqlDialect = "postgres" | "mysql" | "mssql";
export type MockFormat = "sql" | "json" | "csv";

export interface MockOptions {
  rowsPerTable: number;
  seed: number;
  dialect: SqlDialect;
}

export interface GeneratedTable {
  table: ModelTable;
  rows: Record<string, unknown>[];
}

function topoSort(model: SchemaModel): ModelTable[] {
  const tables = [...model.tables];
  const idx = new Map<string, ModelTable>();
  for (const t of tables) idx.set(t.id, t);
  const deps = new Map<string, Set<string>>();
  for (const t of tables) deps.set(t.id, new Set());
  for (const r of model.refs) {
    if (r.fromTable === r.toTable) continue;
    deps.get(r.fromTable)?.add(r.toTable);
  }
  const result: ModelTable[] = [];
  const visited = new Set<string>();
  const onStack = new Set<string>();
  function visit(id: string) {
    if (visited.has(id)) return;
    if (onStack.has(id)) return; // cycle: ignore
    onStack.add(id);
    for (const d of deps.get(id) ?? []) visit(d);
    onStack.delete(id);
    visited.add(id);
    const t = idx.get(id);
    if (t) result.push(t);
  }
  for (const t of tables) visit(t.id);
  return result;
}

export function generateMock(model: SchemaModel, opts: MockOptions): GeneratedTable[] {
  const ordered = topoSort(model);
  const rng = createRng(opts.seed || hashSeed("toolnest"));
  const generated = new Map<string, Record<string, unknown>[]>();

  for (const t of ordered) {
    const rows: Record<string, unknown>[] = [];
    for (let i = 0; i < opts.rowsPerTable; i++) {
      const row: Record<string, unknown> = {};
      for (const col of t.columns) {
        const fk = model.refs.find((r) => r.fromTable === t.id && r.fromColumn === col.name);
        if (fk) {
          const targetRows = generated.get(fk.toTable) ?? [];
          if (targetRows.length === 0) {
            row[col.name] = null;
          } else {
            const target = targetRows[Math.floor(rng.next() * targetRows.length)];
            row[col.name] = target[fk.toColumn] ?? null;
          }
          continue;
        }
        if (col.unique || col.pk) {
          if (col.pk && col.increment) {
            row[col.name] = i + 1;
            continue;
          }
        }
        const enumValues = col.enumName
          ? (model.enums.find((e) => e.name === col.enumName)?.values ?? []).map((v) => v.name)
          : [];
        const kind = inferKind(col);
        let v = fakeValue(kind, col, rng, i, enumValues);
        if (col.unique && typeof v === "string") v = `${v}_${i + 1}`;
        if (!col.notNull && !col.pk && rng.bool(0.05)) v = null;
        row[col.name] = v;
      }
      rows.push(row);
    }
    generated.set(t.id, rows);
  }

  return ordered.map((t) => ({ table: t, rows: generated.get(t.id) ?? [] }));
}

export function toSqlInsert(data: GeneratedTable[], dialect: SqlDialect): string {
  if (!data.length) return "-- no tables";
  const out: string[] = [];
  out.push(`-- ${dialect.toUpperCase()} mock data`);
  if (dialect === "mysql") out.push("SET FOREIGN_KEY_CHECKS=0;");
  for (const { table, rows } of data) {
    if (!rows.length) continue;
    const tname = quoteIfNeeded(table.name, dialectFor(dialect));
    const cols = table.columns.map((c) => quoteIfNeeded(c.name, dialectFor(dialect))).join(", ");
    out.push(`-- ${rows.length} rows in ${table.name}`);
    out.push(`INSERT INTO ${tname} (${cols}) VALUES`);
    const lines = rows.map((row) => {
      const values = table.columns.map((c) => sqlLiteral(row[c.name], dialect)).join(", ");
      return `  (${values})`;
    });
    out.push(lines.join(",\n") + ";\n");
  }
  if (dialect === "mysql") out.push("SET FOREIGN_KEY_CHECKS=1;");
  return out.join("\n");
}

function dialectFor(d: SqlDialect): "pg" | "mysql" | "mssql" {
  if (d === "mysql") return "mysql";
  if (d === "mssql") return "mssql";
  return "pg";
}

function sqlLiteral(v: unknown, dialect: SqlDialect): string {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") {
    if (dialect === "mssql") return v ? "1" : "0";
    return v ? "TRUE" : "FALSE";
  }
  if (typeof v === "number") return String(v);
  if (v instanceof Date) return `'${v.toISOString()}'`;
  if (typeof v === "object") {
    const json = JSON.stringify(v).replace(/'/g, "''");
    return `'${json}'`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

export function toJsonMock(data: GeneratedTable[]): string {
  const obj: Record<string, unknown[]> = {};
  for (const { table, rows } of data) obj[table.name] = rows;
  return JSON.stringify(obj, null, 2);
}

export function toCsvMock(data: GeneratedTable[]): string {
  const sections: string[] = [];
  for (const { table, rows } of data) {
    sections.push(`# ${table.name}`);
    const headers = table.columns.map((c) => c.name);
    sections.push(headers.join(","));
    for (const row of rows) {
      sections.push(headers.map((h) => csvCell(row[h])).join(","));
    }
    sections.push("");
  }
  return sections.join("\n");
}

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = typeof v === "object" ? JSON.stringify(v) : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function renderMock(model: SchemaModel, opts: MockOptions, fmt: MockFormat): string {
  const data = generateMock(model, opts);
  if (fmt === "sql") return toSqlInsert(data, opts.dialect);
  if (fmt === "json") return toJsonMock(data);
  return toCsvMock(data);
}
