import { Parser } from "@dbml/core";
import type { Edge, Node } from "@xyflow/react";
import type { CrowFootEdgeData } from "./crow-foot-edge";
import type { DbColumn, DbIndexEntry, DbTableData } from "./table-node";

interface FieldLite {
  name: string;
  type?: { type_name?: string; args?: string };
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
  endpoints: EndpointLite[];
}
interface SchemaLite {
  name?: string;
  tables: TableLite[];
  refs: RefLite[];
}

export type ParsedSchema = {
  nodes: Node<DbTableData>[];
  edges: Edge<CrowFootEdgeData>[];
  tableCount: number;
  fieldCount: number;
  refCount: number;
  tableLines: Record<string, number>;
};

function tableId(schema: string | undefined, name: string): string {
  return schema && schema !== "public" ? `${schema}.${name}` : name;
}

function fieldType(f: FieldLite): string {
  const base = f.type?.type_name ?? "string";
  return f.type?.args ? `${base}(${f.type.args})` : base;
}

const TABLE_RE = /^[ \t]*Table[ \t]+("([^"]+)"|([A-Za-z_][\w]*))(?:[ \t]*\.[ \t]*("([^"]+)"|([A-Za-z_][\w]*)))?/gm;

function indexTableLines(dbml: string): Record<string, number> {
  const out: Record<string, number> = {};
  TABLE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TABLE_RE.exec(dbml)) !== null) {
    const firstName = m[2] ?? m[3] ?? "";
    const secondName = m[5] ?? m[6] ?? "";
    const schema = secondName ? firstName : undefined;
    const name = secondName || firstName;
    if (!name) continue;
    const id = tableId(schema, name);
    const line = dbml.slice(0, m.index).split("\n").length; // 1-based
    if (!(id in out)) out[id] = line;
    if (!(name in out)) out[name] = line;
  }
  return out;
}

export function parseDbml(dbml: string): { ok: true; data: ParsedSchema } | { ok: false; error: string } {
  if (!dbml.trim())
    return {
      ok: true,
      data: { nodes: [], edges: [], tableCount: 0, fieldCount: 0, refCount: 0, tableLines: {} },
    };
  try {
    const parser = new Parser();
    const database = parser.parse(dbml, "dbml");
    const schemas = (database.schemas ?? []) as unknown as SchemaLite[];
    const tableLines = indexTableLines(dbml);

    const fkSet = new Set<string>();
    for (const schema of schemas) {
      for (const ref of schema.refs ?? []) {
        for (const ep of ref.endpoints ?? []) {
          if (!ep.tableName) continue;
          for (const fn of ep.fieldNames ?? []) {
            fkSet.add(`${tableId(ep.schemaName, ep.tableName)}.${fn}`);
          }
        }
      }
    }

    const nodes: Node<DbTableData>[] = [];
    let fieldCount = 0;

    for (const schema of schemas) {
      for (const table of schema.tables ?? []) {
        const id = tableId(schema.name, table.name);
        const columns: DbColumn[] = (table.fields ?? []).map((f) => {
          fieldCount++;
          return {
            name: f.name,
            type: fieldType(f),
            pk: !!f.pk,
            fk: fkSet.has(`${id}.${f.name}`),
            unique: !!f.unique,
            notNull: !!f.not_null,
            increment: !!f.increment,
            default: f.dbdefault?.value !== undefined ? String(f.dbdefault.value) : undefined,
            note: f.note,
          };
        });
        const indexes: DbIndexEntry[] = (table.indexes ?? []).map((idx) => ({
          columns: idx.columns.map((c) => c.value),
          unique: idx.unique,
          pk: idx.pk,
          name: idx.name,
        }));
        nodes.push({
          id,
          type: "table",
          position: { x: 0, y: 0 },
          data: {
            name: table.name,
            schema: schema.name,
            note: table.note,
            headerColor: table.headerColor,
            columns,
            indexes,
          },
        });
      }
    }

    const edges: Edge<CrowFootEdgeData>[] = [];
    let refCount = 0;
    for (const schema of schemas) {
      for (const ref of schema.refs ?? []) {
        const [a, b] = ref.endpoints ?? [];
        if (!a || !b || !a.tableName || !b.tableName) continue;
        const fromId = tableId(a.schemaName, a.tableName);
        const toId = tableId(b.schemaName, b.tableName);
        const fromField = (a.fieldNames ?? [])[0];
        const toField = (b.fieldNames ?? [])[0];
        if (!fromField || !toField) continue;

        const aRel = a.relation ?? "*";
        const bRel = b.relation ?? "*";

        edges.push({
          id: `${fromId}.${fromField}->${toId}.${toField}`,
          source: fromId,
          sourceHandle: `${fromField}__s`,
          target: toId,
          targetHandle: `${toField}__t`,
          type: "crowfoot",
          data: {
            sourceCard: aRel === "1" ? "one" : "many",
            targetCard: bRel === "1" ? "one" : "many",
            fromField,
            toField,
          },
        });
        refCount++;
      }
    }

    return { ok: true, data: { nodes, edges, tableCount: nodes.length, fieldCount, refCount, tableLines } };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to parse DBML" };
  }
}
