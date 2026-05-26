import { Parser } from "@dbml/core";

export type RelationKind = "1-1" | "1-n" | "n-n";

export interface ModelColumn {
  name: string;
  rawType: string;
  baseType: string;
  args?: string;
  pk: boolean;
  fk: boolean;
  unique: boolean;
  notNull: boolean;
  increment: boolean;
  default?: string;
  defaultIsExpr?: boolean;
  note?: string;
  enumName?: string;
}

export interface ModelIndex {
  name?: string;
  columns: string[];
  unique: boolean;
  pk: boolean;
}

export interface ModelTable {
  id: string;
  name: string;
  schema?: string;
  note?: string;
  headerColor?: string;
  columns: ModelColumn[];
  indexes: ModelIndex[];
  pkColumns: string[];
}

export interface ModelRef {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  kind: RelationKind;
  onDelete?: string;
  onUpdate?: string;
  name?: string;
}

export interface ModelEnum {
  name: string;
  schema?: string;
  values: { name: string; note?: string }[];
}

export interface SchemaModel {
  tables: ModelTable[];
  refs: ModelRef[];
  enums: ModelEnum[];
  tableCount: number;
  fieldCount: number;
  refCount: number;
}

interface FieldLite {
  name: string;
  type?: { type_name?: string; args?: string; schemaName?: string };
  pk?: boolean;
  unique?: boolean;
  not_null?: boolean;
  increment?: boolean;
  dbdefault?: { value?: string | number; type?: string };
  note?: string;
}
interface IndexColumnLite {
  value: string;
  type?: string;
}
interface IndexLite {
  name?: string;
  unique?: boolean;
  pk?: boolean;
  columns: IndexColumnLite[];
}
interface TableLite {
  name: string;
  schemaName?: string;
  note?: string;
  headerColor?: string;
  fields: FieldLite[];
  indexes?: IndexLite[];
}
interface EndpointLite {
  schemaName?: string;
  tableName?: string;
  fieldNames?: string[];
  relation?: string;
}
interface RefLite {
  name?: string;
  endpoints: EndpointLite[];
  onDelete?: string;
  onUpdate?: string;
}
interface EnumValueLite {
  name: string;
  note?: string;
}
interface EnumLite {
  name: string;
  schemaName?: string;
  values: EnumValueLite[];
}
interface SchemaLite {
  name?: string;
  tables: TableLite[];
  refs: RefLite[];
  enums?: EnumLite[];
}

function tableId(schema: string | undefined, name: string): string {
  return schema && schema !== "public" ? `${schema}.${name}` : name;
}

function classify(rel: RelationKind | string): RelationKind {
  if (rel === "1-1" || rel === "1-n" || rel === "n-n") return rel;
  return "1-n";
}

function inferRelation(a: string, b: string): RelationKind {
  if (a === "1" && b === "1") return "1-1";
  if (a === "*" && b === "*") return "n-n";
  return "1-n";
}

export function buildSchemaModel(dbml: string): { ok: true; model: SchemaModel } | { ok: false; error: string } {
  if (!dbml.trim()) {
    return {
      ok: true,
      model: { tables: [], refs: [], enums: [], tableCount: 0, fieldCount: 0, refCount: 0 },
    };
  }
  try {
    const parser = new Parser();
    const database = parser.parse(dbml, "dbml");
    const schemas = (database.schemas ?? []) as unknown as SchemaLite[];

    const enumIndex = new Map<string, ModelEnum>();
    const enums: ModelEnum[] = [];
    for (const s of schemas) {
      for (const e of s.enums ?? []) {
        const m: ModelEnum = {
          name: e.name,
          schema: e.schemaName,
          values: (e.values ?? []).map((v) => ({ name: v.name, note: v.note })),
        };
        enums.push(m);
        enumIndex.set(e.name.toLowerCase(), m);
        enumIndex.set(`${e.schemaName ?? "public"}.${e.name}`.toLowerCase(), m);
      }
    }

    const fkSet = new Set<string>();
    for (const s of schemas) {
      for (const r of s.refs ?? []) {
        for (const ep of r.endpoints ?? []) {
          if (!ep.tableName) continue;
          for (const fn of ep.fieldNames ?? []) {
            fkSet.add(`${tableId(ep.schemaName, ep.tableName)}.${fn}`);
          }
        }
      }
    }

    const tables: ModelTable[] = [];
    let fieldCount = 0;

    for (const s of schemas) {
      for (const t of s.tables ?? []) {
        const id = tableId(s.name, t.name);
        const columns: ModelColumn[] = (t.fields ?? []).map((f) => {
          fieldCount++;
          const baseType = f.type?.type_name ?? "string";
          const enumMatch = enumIndex.get(baseType.toLowerCase());
          return {
            name: f.name,
            rawType: f.type?.args ? `${baseType}(${f.type.args})` : baseType,
            baseType,
            args: f.type?.args,
            pk: !!f.pk,
            fk: fkSet.has(`${id}.${f.name}`),
            unique: !!f.unique,
            notNull: !!f.not_null,
            increment: !!f.increment,
            default: f.dbdefault?.value !== undefined ? String(f.dbdefault.value) : undefined,
            defaultIsExpr: f.dbdefault?.type === "expression",
            note: f.note,
            enumName: enumMatch?.name,
          };
        });
        const indexes: ModelIndex[] = (t.indexes ?? []).map((idx) => ({
          name: idx.name,
          columns: idx.columns.map((c) => c.value),
          unique: !!idx.unique,
          pk: !!idx.pk,
        }));
        const pkColumns: string[] = [];
        for (const c of columns) if (c.pk) pkColumns.push(c.name);
        for (const idx of indexes) {
          if (idx.pk) {
            for (const c of idx.columns) if (!pkColumns.includes(c)) pkColumns.push(c);
          }
        }
        tables.push({
          id,
          name: t.name,
          schema: s.name,
          note: t.note,
          headerColor: t.headerColor,
          columns,
          indexes,
          pkColumns,
        });
      }
    }

    const refs: ModelRef[] = [];
    for (const s of schemas) {
      for (const r of s.refs ?? []) {
        const [a, b] = r.endpoints ?? [];
        if (!a || !b || !a.tableName || !b.tableName) continue;
        const fromCol = (a.fieldNames ?? [])[0];
        const toCol = (b.fieldNames ?? [])[0];
        if (!fromCol || !toCol) continue;
        refs.push({
          fromTable: tableId(a.schemaName, a.tableName),
          fromColumn: fromCol,
          toTable: tableId(b.schemaName, b.tableName),
          toColumn: toCol,
          kind: classify(inferRelation(a.relation ?? "*", b.relation ?? "1")),
          onDelete: r.onDelete,
          onUpdate: r.onUpdate,
          name: r.name,
        });
      }
    }

    return {
      ok: true,
      model: {
        tables,
        refs,
        enums,
        tableCount: tables.length,
        fieldCount,
        refCount: refs.length,
      },
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to parse DBML" };
  }
}

export function tableByName(model: SchemaModel, name: string): ModelTable | undefined {
  return model.tables.find((t) => t.id === name || t.name === name);
}

export function columnByName(table: ModelTable, name: string): ModelColumn | undefined {
  return table.columns.find((c) => c.name === name);
}

export function pickPk(table: ModelTable): ModelColumn | undefined {
  if (table.pkColumns.length === 0) return undefined;
  return table.columns.find((c) => c.name === table.pkColumns[0]);
}

export function isNumericType(t: string): boolean {
  const x = t.toLowerCase();
  return /(int|float|double|decimal|numeric|real|bigint|smallint|tinyint|number|serial|money)/.test(x);
}

export function isDateType(t: string): boolean {
  const x = t.toLowerCase();
  return /(date|time|timestamp)/.test(x);
}

export function isBoolType(t: string): boolean {
  return /^(bool|boolean|bit)$/i.test(t);
}

export function isJsonType(t: string): boolean {
  return /^(json|jsonb)$/i.test(t);
}

export function isUuidType(t: string): boolean {
  return /^uuid$/i.test(t);
}

export function isTextType(t: string): boolean {
  const x = t.toLowerCase();
  return /(char|text|string|clob)/.test(x);
}
