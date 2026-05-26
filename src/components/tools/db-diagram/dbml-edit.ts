// Lightweight DBML text-surgery helpers. We avoid round-tripping through the
// parser for these operations so the user's formatting, comments, and casing
// stay intact.

interface BlockRange {
  start: number; // index of "Table" keyword
  bodyStart: number; // index right after the opening "{"
  bodyEnd: number; // index of the matching closing "}"
  end: number; // index right after the closing "}"
  headerEnd: number; // index of opening "{"
}

function tableHeaderRegex(name: string, schema?: string): RegExp {
  const nameAlts = [escapeRegex(name), `"${escapeRegex(name)}"`].join("|");
  if (schema && schema !== "public") {
    const schemaAlts = [escapeRegex(schema), `"${escapeRegex(schema)}"`].join("|");
    return new RegExp(`^[ \\t]*Table[ \\t]+(?:${schemaAlts})[ \\t]*\\.[ \\t]*(?:${nameAlts})\\b`, "m");
  }
  return new RegExp(`^[ \\t]*Table[ \\t]+(?:${nameAlts})\\b`, "m");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function findTableBlock(dbml: string, name: string, schema?: string): BlockRange | null {
  const re = tableHeaderRegex(name, schema);
  const m = re.exec(dbml);
  if (!m) return null;
  const start = m.index;
  const headerEnd = dbml.indexOf("{", start);
  if (headerEnd === -1) return null;
  let depth = 1;
  let i = headerEnd + 1;
  while (i < dbml.length && depth > 0) {
    const ch = dbml[i];
    if (ch === "{") depth++;
    else if (ch === "}") depth--;
    if (depth === 0) break;
    i++;
  }
  if (depth !== 0) return null;
  const bodyEnd = i;
  return { start, headerEnd, bodyStart: headerEnd + 1, bodyEnd, end: bodyEnd + 1 };
}

export function getTableBlockText(dbml: string, name: string, schema?: string): string | null {
  const range = findTableBlock(dbml, name, schema);
  if (!range) return null;
  return dbml.slice(range.start, range.end);
}

export function deleteTableBlock(dbml: string, name: string, schema?: string): string {
  const range = findTableBlock(dbml, name, schema);
  if (!range) return dbml;
  // Remove trailing newline that follows the block, if any, to avoid blank lines.
  let end = range.end;
  if (dbml[end] === "\n") end++;
  // Also drop preceding blank line if present.
  let start = range.start;
  let cut = start;
  while (cut > 0 && (dbml[cut - 1] === " " || dbml[cut - 1] === "\t")) cut--;
  if (cut > 0 && dbml[cut - 1] === "\n") {
    // collapse one blank line
    if (cut > 1 && dbml[cut - 2] === "\n") {
      start = cut - 1;
    }
  }
  return dbml.slice(0, start) + dbml.slice(end);
}

/**
 * Insert / update a `[headercolor: #xxxxxx]` setting on a Table block.
 * Pass `null` for color to remove the existing one.
 */
export function setTableHeaderColor(
  dbml: string,
  name: string,
  schema: string | undefined,
  color: string | null,
): string {
  const range = findTableBlock(dbml, name, schema);
  if (!range) return dbml;

  const headerSlice = dbml.slice(range.start, range.headerEnd);
  // Detect existing settings bracket: Table foo [setting...] {
  const settingsMatch = /\[([^\]]*)\]\s*$/.exec(headerSlice);

  const setColorInside = (inside: string): string => {
    const parts = inside
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean)
      .filter((p) => !/^headercolor\s*:/i.test(p));
    if (color) parts.push(`headercolor: ${color}`);
    return parts.join(", ");
  };

  if (settingsMatch) {
    const newInside = setColorInside(settingsMatch[1]);
    const newSettings = newInside ? ` [${newInside}]` : "";
    const before = headerSlice.slice(0, settingsMatch.index).replace(/\s*$/, "");
    const newHeader = before + newSettings + " ";
    return dbml.slice(0, range.start) + newHeader + dbml.slice(range.headerEnd);
  }

  if (!color) return dbml; // nothing to remove

  // No settings yet — append before "{"
  const before = headerSlice.replace(/\s*$/, "");
  const newHeader = `${before} [headercolor: ${color}] `;
  return dbml.slice(0, range.start) + newHeader + dbml.slice(range.headerEnd);
}

export function lineToOffset(text: string, line: number): number {
  // line is 1-based
  if (line <= 1) return 0;
  let idx = 0;
  let cur = 1;
  while (cur < line) {
    const next = text.indexOf("\n", idx);
    if (next === -1) return text.length;
    idx = next + 1;
    cur++;
  }
  return idx;
}
