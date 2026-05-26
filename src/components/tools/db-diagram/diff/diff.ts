import type { ModelColumn, ModelRef, ModelTable, SchemaModel } from "../schema-model";

export type DiffKind =
  | "table_added"
  | "table_removed"
  | "column_added"
  | "column_removed"
  | "column_changed"
  | "ref_added"
  | "ref_removed"
  | "index_added"
  | "index_removed";

export interface DiffEntry {
  kind: DiffKind;
  table?: string;
  detail: string;
  before?: string;
  after?: string;
}

export interface SchemaDiff {
  entries: DiffEntry[];
  added: number;
  removed: number;
  changed: number;
}

function colSig(c: ModelColumn): string {
  const flags: string[] = [];
  if (c.pk) flags.push("PK");
  if (c.unique) flags.push("UQ");
  if (c.notNull) flags.push("NN");
  if (c.increment) flags.push("AI");
  if (c.default !== undefined) flags.push(`DEF=${c.default}`);
  return `${c.rawType}${flags.length ? " [" + flags.join(",") + "]" : ""}`;
}

function refSig(r: ModelRef): string {
  return `${r.fromTable}.${r.fromColumn} -> ${r.toTable}.${r.toColumn} (${r.kind})`;
}

function indexSig(t: ModelTable, i: number): string {
  const idx = t.indexes[i];
  return `(${idx.columns.join(",")})${idx.unique ? " UNIQUE" : ""}${idx.pk ? " PK" : ""}`;
}

export function diffSchemas(a: SchemaModel, b: SchemaModel): SchemaDiff {
  const entries: DiffEntry[] = [];
  const aTables = new Map(a.tables.map((t) => [t.id, t] as const));
  const bTables = new Map(b.tables.map((t) => [t.id, t] as const));

  for (const [id, t] of bTables) {
    if (!aTables.has(id)) {
      entries.push({ kind: "table_added", table: t.name, detail: `+ table ${t.name}` });
    }
  }
  for (const [id, t] of aTables) {
    if (!bTables.has(id)) {
      entries.push({ kind: "table_removed", table: t.name, detail: `- table ${t.name}` });
    }
  }

  for (const [id, ta] of aTables) {
    const tb = bTables.get(id);
    if (!tb) continue;
    const aCols = new Map(ta.columns.map((c) => [c.name, c] as const));
    const bCols = new Map(tb.columns.map((c) => [c.name, c] as const));
    for (const [name, c] of bCols) {
      if (!aCols.has(name)) {
        entries.push({
          kind: "column_added",
          table: tb.name,
          detail: `+ ${tb.name}.${name} ${colSig(c)}`,
          after: colSig(c),
        });
      }
    }
    for (const [name, c] of aCols) {
      if (!bCols.has(name)) {
        entries.push({
          kind: "column_removed",
          table: ta.name,
          detail: `- ${ta.name}.${name}`,
          before: colSig(c),
        });
      }
    }
    for (const [name, ca] of aCols) {
      const cb = bCols.get(name);
      if (!cb) continue;
      const sigA = colSig(ca);
      const sigB = colSig(cb);
      if (sigA !== sigB) {
        entries.push({
          kind: "column_changed",
          table: ta.name,
          detail: `~ ${ta.name}.${name}: ${sigA} → ${sigB}`,
          before: sigA,
          after: sigB,
        });
      }
    }

    const aIdx = new Set(ta.indexes.map((_, i) => indexSig(ta, i)));
    const bIdx = new Set(tb.indexes.map((_, i) => indexSig(tb, i)));
    for (const sig of bIdx) if (!aIdx.has(sig)) entries.push({ kind: "index_added", table: tb.name, detail: `+ index ${tb.name} ${sig}` });
    for (const sig of aIdx) if (!bIdx.has(sig)) entries.push({ kind: "index_removed", table: ta.name, detail: `- index ${ta.name} ${sig}` });
  }

  const aRefs = new Set(a.refs.map(refSig));
  const bRefs = new Set(b.refs.map(refSig));
  for (const r of b.refs) if (!aRefs.has(refSig(r))) entries.push({ kind: "ref_added", detail: `+ ref ${refSig(r)}` });
  for (const r of a.refs) if (!bRefs.has(refSig(r))) entries.push({ kind: "ref_removed", detail: `- ref ${refSig(r)}` });

  let added = 0,
    removed = 0,
    changed = 0;
  for (const e of entries) {
    if (e.kind.endsWith("added")) added++;
    else if (e.kind.endsWith("removed")) removed++;
    else changed++;
  }
  return { entries, added, removed, changed };
}

export function toMigrationSql(a: SchemaModel, b: SchemaModel, dialect: "postgres" | "mysql"): string {
  const lines: string[] = [`-- Migration ${dialect.toUpperCase()}`];
  const aTables = new Map(a.tables.map((t) => [t.id, t] as const));
  const bTables = new Map(b.tables.map((t) => [t.id, t] as const));

  for (const [id, t] of bTables) {
    if (aTables.has(id)) continue;
    lines.push(createTableSql(t, dialect));
  }

  for (const [id, ta] of aTables) {
    const tb = bTables.get(id);
    if (!tb) {
      lines.push(`DROP TABLE ${quote(ta.name, dialect)};`);
      continue;
    }
    const aCols = new Map(ta.columns.map((c) => [c.name, c] as const));
    const bCols = new Map(tb.columns.map((c) => [c.name, c] as const));
    for (const [name, c] of bCols) {
      if (!aCols.has(name)) {
        lines.push(`ALTER TABLE ${quote(tb.name, dialect)} ADD COLUMN ${columnSql(c, dialect)};`);
      }
    }
    for (const [name] of aCols) {
      if (!bCols.has(name)) {
        lines.push(`ALTER TABLE ${quote(ta.name, dialect)} DROP COLUMN ${quote(name, dialect)};`);
      }
    }
    for (const [name, ca] of aCols) {
      const cb = bCols.get(name);
      if (!cb) continue;
      if (ca.rawType !== cb.rawType) {
        if (dialect === "postgres") {
          lines.push(`ALTER TABLE ${quote(tb.name, dialect)} ALTER COLUMN ${quote(name, dialect)} TYPE ${cb.rawType};`);
        } else {
          lines.push(`ALTER TABLE ${quote(tb.name, dialect)} MODIFY COLUMN ${columnSql(cb, dialect)};`);
        }
      }
      if (ca.notNull !== cb.notNull) {
        if (dialect === "postgres") {
          lines.push(
            `ALTER TABLE ${quote(tb.name, dialect)} ALTER COLUMN ${quote(name, dialect)} ${cb.notNull ? "SET" : "DROP"} NOT NULL;`,
          );
        }
      }
    }
  }

  const aRefSigs = new Set(a.refs.map((r) => `${r.fromTable}.${r.fromColumn}->${r.toTable}.${r.toColumn}`));
  for (const r of b.refs) {
    const key = `${r.fromTable}.${r.fromColumn}->${r.toTable}.${r.toColumn}`;
    if (aRefSigs.has(key)) continue;
    const fromTable = b.tables.find((t) => t.id === r.fromTable);
    const toTable = b.tables.find((t) => t.id === r.toTable);
    if (!fromTable || !toTable) continue;
    const cname = `fk_${fromTable.name}_${r.fromColumn}`;
    lines.push(
      `ALTER TABLE ${quote(fromTable.name, dialect)} ADD CONSTRAINT ${quote(cname, dialect)} FOREIGN KEY (${quote(r.fromColumn, dialect)}) REFERENCES ${quote(toTable.name, dialect)} (${quote(r.toColumn, dialect)});`,
    );
  }

  return lines.join("\n");
}

function quote(s: string, d: "postgres" | "mysql"): string {
  return d === "mysql" ? `\`${s}\`` : `"${s}"`;
}

function columnSql(c: ModelColumn, dialect: "postgres" | "mysql"): string {
  const parts = [quote(c.name, dialect), c.rawType];
  if (c.pk) parts.push("PRIMARY KEY");
  if (c.notNull && !c.pk) parts.push("NOT NULL");
  if (c.unique && !c.pk) parts.push("UNIQUE");
  if (c.default !== undefined) {
    if (c.defaultIsExpr) parts.push(`DEFAULT ${c.default}`);
    else parts.push(`DEFAULT '${c.default}'`);
  }
  return parts.join(" ");
}

function createTableSql(t: ModelTable, dialect: "postgres" | "mysql"): string {
  const cols = t.columns.map((c) => "  " + columnSql(c, dialect));
  return `CREATE TABLE ${quote(t.name, dialect)} (\n${cols.join(",\n")}\n);`;
}
