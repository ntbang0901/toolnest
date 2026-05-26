import type { ModelColumn, ModelTable, SchemaModel } from "../schema-model";

export type LintLevel = "warn" | "info" | "error";

export interface LintIssue {
  level: LintLevel;
  rule: string;
  message: string;
  table?: string;
  column?: string;
}

const RESERVED = new Set([
  "user", "order", "group", "table", "select", "from", "where", "join",
  "primary", "key", "index", "unique", "by", "asc", "desc", "default",
  "case", "when", "then", "else", "end", "null", "true", "false", "as",
  "and", "or", "not", "in", "is", "like", "between", "exists", "all", "any",
]);

function isLowerSnake(s: string) {
  return /^[a-z][a-z0-9_]*$/.test(s);
}

function isPascal(s: string) {
  return /^[A-Z][A-Za-z0-9]*$/.test(s);
}

export function lintSchema(model: SchemaModel): LintIssue[] {
  const issues: LintIssue[] = [];
  const indexedCols = new Map<string, Set<string>>();
  for (const t of model.tables) {
    const set = new Set<string>();
    for (const c of t.columns) {
      if (c.pk || c.unique) set.add(c.name);
    }
    for (const idx of t.indexes) {
      if (idx.columns.length === 1) set.add(idx.columns[0]);
    }
    indexedCols.set(t.id, set);
  }

  for (const t of model.tables) {
    if (t.pkColumns.length === 0) {
      issues.push({
        level: "warn",
        rule: "missing-pk",
        table: t.name,
        message: `Table "${t.name}" has no primary key`,
      });
    }
    if (RESERVED.has(t.name.toLowerCase())) {
      issues.push({
        level: "warn",
        rule: "reserved-name",
        table: t.name,
        message: `Table name "${t.name}" is a SQL reserved word`,
      });
    }
    if (!isLowerSnake(t.name) && !isPascal(t.name)) {
      issues.push({
        level: "info",
        rule: "naming-convention",
        table: t.name,
        message: `Table "${t.name}" mixes naming styles — pick snake_case or PascalCase`,
      });
    }
    if (t.columns.length === 0) {
      issues.push({
        level: "warn",
        rule: "empty-table",
        table: t.name,
        message: `Table "${t.name}" has no columns`,
      });
    }

    for (const c of t.columns) {
      if (RESERVED.has(c.name.toLowerCase())) {
        issues.push({
          level: "warn",
          rule: "reserved-name",
          table: t.name,
          column: c.name,
          message: `Column "${t.name}.${c.name}" is a SQL reserved word`,
        });
      }
      if (/^varchar$/i.test(c.baseType) && !c.args) {
        issues.push({
          level: "info",
          rule: "varchar-no-length",
          table: t.name,
          column: c.name,
          message: `varchar column "${t.name}.${c.name}" has no length`,
        });
      }
      if (c.fk && !indexedCols.get(t.id)?.has(c.name)) {
        issues.push({
          level: "warn",
          rule: "fk-not-indexed",
          table: t.name,
          column: c.name,
          message: `Foreign key "${t.name}.${c.name}" is not indexed — joins will be slow`,
        });
      }
      if (c.pk && !c.notNull) {
        issues.push({
          level: "info",
          rule: "pk-nullable",
          table: t.name,
          column: c.name,
          message: `Primary key "${t.name}.${c.name}" should be NOT NULL`,
        });
      }
    }
  }

  for (const r of model.refs) {
    const from = model.tables.find((t) => t.id === r.fromTable);
    const to = model.tables.find((t) => t.id === r.toTable);
    if (!from || !to) continue;
    const fc = from.columns.find((c) => c.name === r.fromColumn);
    const tc = to.columns.find((c) => c.name === r.toColumn);
    if (fc && tc && fc.baseType.toLowerCase() !== tc.baseType.toLowerCase()) {
      issues.push({
        level: "warn",
        rule: "ref-type-mismatch",
        table: from.name,
        column: r.fromColumn,
        message: `Ref "${from.name}.${r.fromColumn}" (${fc.baseType}) → "${to.name}.${r.toColumn}" (${tc.baseType}) — types differ`,
      });
    }
  }

  return issues;
}

export function lintSummary(issues: LintIssue[]): { warn: number; info: number; error: number } {
  const out = { warn: 0, info: 0, error: 0 };
  for (const i of issues) out[i.level]++;
  return out;
}

export function suppress(_t: ModelTable, _c: ModelColumn): boolean {
  return false;
}
