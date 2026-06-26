import type { LayoutGraph, LayoutNode, LayoutEdge, TranspileResult } from "./types";
import { measureText } from "../renderer/text";
import { THEME } from "../renderer/theme";

/**
 * ERD DSL → LayoutGraph
 *
 *   erd
 *
 *   User { id PK, name, email UK }
 *   Post { id PK, user_id FK, title, body }
 *
 *   User ||--o{ Post: writes
 */

interface FieldDef {
  name: string;
  type: string;
  constraint: string;
}

function parseEntityFields(fieldStr: string): FieldDef[] {
  const fields: FieldDef[] = [];
  const parts = fieldStr.split(",").map((f) => f.trim()).filter(Boolean);

  for (const part of parts) {
    const tokens = part.split(/\s+/);
    const name = tokens[0];
    let constraint = "";
    let type = "string";

    const lastToken = tokens[tokens.length - 1]?.toUpperCase();
    if (["PK", "FK", "UK"].includes(lastToken) && tokens.length > 1) {
      constraint = lastToken;
      type = tokens.length > 2 ? tokens.slice(1, -1).join(" ") : "string";
    } else if (tokens.length > 1) {
      type = tokens.slice(1).join(" ");
    }

    fields.push({ name, type, constraint });
  }
  return fields;
}

function calcEntityNodeSize(name: string, fields: FieldDef[]): { width: number; height: number } {
  const headerWidth = measureText(name, THEME.fontSize + 1, 600);
  let maxFieldWidth = 0;
  for (const f of fields) {
    const fieldText = `${f.name} ${f.type}${f.constraint ? " " + f.constraint : ""}`;
    const w = measureText(fieldText, THEME.fontSize - 1, 400);
    if (w > maxFieldWidth) maxFieldWidth = w;
  }
  const contentWidth = Math.max(headerWidth, maxFieldWidth);
  const width = contentWidth + THEME.nodePadding.x * 2 + 10;
  const headerHeight = THEME.fontSize + THEME.nodePadding.y * 2;
  const fieldsHeight = fields.length > 0 ? fields.length * (THEME.fontSize + 4) + THEME.nodePadding.y : 0;
  const height = headerHeight + fieldsHeight;
  return { width: Math.max(width, 140), height: Math.max(height, 40) };
}

export function transpileErd(lines: string[]): TranspileResult {
  const nodesMap = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  let colorCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    // Entity definition: Name { field PK, field2 FK, field3 }
    const entityMatch = line.match(/^(\w+)\s*\{\s*(.+?)\s*\}$/);
    if (entityMatch) {
      const name = entityMatch[1];
      const fields = parseEntityFields(entityMatch[2]);
      const size = calcEntityNodeSize(name, fields);

      // Build multiline label: entity name + fields
      const fieldLines = fields.map(
        (f) => `${f.constraint ? f.constraint + " " : ""}${f.name}: ${f.type}`
      );
      const label = [name, ...fieldLines].join("\n");

      nodesMap.set(name, {
        id: name,
        label,
        shape: "rect",
        ...size,
        colorIndex: colorCounter++,
      });
      continue;
    }

    // Relationship: Entity1 cardinality Entity2: label
    // e.g., User ||--o{ Post: writes
    const relMatch = line.match(/^(\w+)\s+(\S+)\s+(\w+)\s*(?::\s*(.+))?$/);
    if (relMatch) {
      const from = relMatch[1];
      const cardinality = relMatch[2];
      const to = relMatch[3];
      const label = relMatch[4] || "";

      // Validate cardinality looks like ER notation
      if (/[\|\}\{o]/.test(cardinality) || cardinality === "--") {
        // Ensure nodes exist
        for (const name of [from, to]) {
          if (!nodesMap.has(name)) {
            const size = calcEntityNodeSize(name, []);
            nodesMap.set(name, {
              id: name,
              label: name,
              shape: "rect",
              ...size,
              colorIndex: colorCounter++,
            });
          }
        }

        edges.push({
          from,
          to,
          label: label || undefined,
          style: "solid",
        });
        continue;
      }
    }

    return { ok: false, error: `Invalid syntax: "${line}"`, line: i + 1 };
  }

  if (nodesMap.size === 0) {
    return { ok: false, error: "Empty diagram — define entities and relationships" };
  }

  const graph: LayoutGraph = {
    nodes: Array.from(nodesMap.values()),
    edges,
    direction: "LR",
    type: "erd",
  };

  return { ok: true, graph };
}
