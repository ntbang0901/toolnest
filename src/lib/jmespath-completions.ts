import type {
  Completion,
  CompletionContext,
  CompletionResult,
  CompletionSource,
} from "@codemirror/autocomplete";

/**
 * Data-driven autocomplete for the JMESPath query editor. We walk the user's
 * parsed JSON to surface the actual field names and dotted paths that exist in
 * their document, then blend in JMESPath's built-in functions and operators so
 * the editor can suggest a complete query as you type.
 */

const MAX_DEPTH = 6;
const MAX_NODES = 5000;
const IDENT_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;

/** Quote a key as a JMESPath identifier-expression when it isn't a bare ident. */
function quoteKey(key: string): string {
  return IDENT_RE.test(key) ? key : `"${key.replace(/"/g, '\\"')}"`;
}

function joinPath(parent: string, key: string): string {
  const segment = quoteKey(key);
  return parent ? `${parent}.${segment}` : segment;
}

export interface CollectedPaths {
  paths: string[];
  fields: Set<string>;
}

/**
 * Recursively collect field names and dotted paths from parsed JSON. Arrays
 * contribute `[*]` projections (using one representative element to derive
 * child fields) so suggestions like `store.books[*].title` show up.
 */
export function collectPaths(data: unknown): CollectedPaths {
  const paths = new Set<string>();
  const fields = new Set<string>();
  let nodeCount = 0;

  function walk(node: unknown, path: string, depth: number): void {
    if (depth > MAX_DEPTH || nodeCount > MAX_NODES || node == null) return;
    nodeCount++;

    if (Array.isArray(node)) {
      if (node.length === 0) return;
      // One representative element drives the child fields of the projection.
      walk(node[0], path ? `${path}[*]` : "[*]", depth + 1);
      return;
    }

    if (typeof node === "object") {
      for (const key of Object.keys(node as Record<string, unknown>)) {
        fields.add(key);
        const childPath = joinPath(path, key);
        paths.add(childPath);
        walk((node as Record<string, unknown>)[key], childPath, depth + 1);
      }
    }
  }

  walk(data, "", 0);
  return { paths: [...paths], fields };
}

interface FunctionDef {
  name: string;
  signature: string;
}

/** Curated JMESPath built-in functions with signatures shown in completion detail. */
export const JMESPATH_FUNCTIONS: FunctionDef[] = [
  { name: "abs", signature: "abs(number)" },
  { name: "avg", signature: "avg(array[number])" },
  { name: "ceil", signature: "ceil(number)" },
  { name: "contains", signature: "contains(subject, search)" },
  { name: "ends_with", signature: "ends_with(subject, suffix)" },
  { name: "floor", signature: "floor(number)" },
  { name: "join", signature: "join(glue, array[string])" },
  { name: "keys", signature: "keys(object)" },
  { name: "length", signature: "length(subject)" },
  { name: "map", signature: "map(expr, array)" },
  { name: "max", signature: "max(array[number]|array[string])" },
  { name: "max_by", signature: "max_by(array, &expr)" },
  { name: "merge", signature: "merge(obj, [obj, ...])" },
  { name: "min", signature: "min(array[number]|array[string])" },
  { name: "min_by", signature: "min_by(array, &expr)" },
  { name: "not_null", signature: "not_null(arg, [arg, ...])" },
  { name: "reverse", signature: "reverse(array|string)" },
  { name: "sort", signature: "sort(array)" },
  { name: "sort_by", signature: "sort_by(array, &expr)" },
  { name: "starts_with", signature: "starts_with(subject, prefix)" },
  { name: "sum", signature: "sum(array[number])" },
  { name: "to_array", signature: "to_array(arg)" },
  { name: "to_number", signature: "to_number(arg)" },
  { name: "to_string", signature: "to_string(arg)" },
  { name: "type", signature: "type(subject)" },
  { name: "values", signature: "values(object)" },
];

interface OperatorDef {
  label: string;
  detail: string;
}

/** JMESPath operators / syntax tokens. */
export const JMESPATH_OPERATORS: OperatorDef[] = [
  { label: "|", detail: "pipe — feed result into next expression" },
  { label: "[?]", detail: "filter — select elements matching a condition" },
  { label: "[*]", detail: "wildcard — project over all array elements" },
  { label: "&", detail: "expression reference (e.g. sort_by(x, &price))" },
  { label: "@", detail: "current node" },
];

/**
 * Build a CodeMirror CompletionSource from parsed JSON. Returns a source that
 * offers fields, full paths, JMESPath functions, and operators based on the
 * token before the cursor. Returns null when no JSON has been parsed yet.
 */
export function createJmespathCompletionSource(
  jsonData: unknown,
): CompletionSource {
  const { paths, fields } = collectPaths(jsonData);

  const fieldCompletions: Completion[] = [...fields].map((field) => ({
    label: quoteKey(field),
    detail: "field",
    type: "property",
  }));

  const pathCompletions: Completion[] = paths.map((path) => ({
    label: path,
    detail: "path",
    type: "variable",
  }));

  const functionCompletions: Completion[] = JMESPATH_FUNCTIONS.map((fn) => ({
    label: fn.name,
    detail: fn.signature,
    type: "function",
    apply: `${fn.name}(`,
  }));

  const operatorCompletions: Completion[] = JMESPATH_OPERATORS.map((op) => ({
    label: op.label,
    detail: op.detail,
    type: "keyword",
  }));

  const options: Completion[] = [
    ...fieldCompletions,
    ...pathCompletions,
    ...functionCompletions,
    ...operatorCompletions,
  ];

  return (context: CompletionContext): CompletionResult | null => {
    // Match the path/word token before the cursor: identifiers, dots, brackets,
    // quotes, and the projection/filter punctuation that makes up a JMESPath ref.
    const word = context.matchBefore(/[A-Za-z0-9_."'\[\]\*\?@.]+/);
    if (!word) {
      if (!context.explicit) return null;
      return { from: context.pos, options };
    }
    if (word.from === word.to && !context.explicit) return null;

    return { from: word.from, options };
  };
}
