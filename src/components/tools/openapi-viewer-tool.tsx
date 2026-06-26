import { useState, useMemo } from "react";
import yaml from "js-yaml";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/tools/code-editor";

// ---------------------------------------------------------------------------
// Sample spec
// ---------------------------------------------------------------------------

const SAMPLE_SPEC = `openapi: "3.0.3"
info:
  title: Pet Store API
  version: "1.0.0"
  description: A simple example API for managing pets.
servers:
  - url: https://api.petstore.example.com/v1
    description: Production
  - url: https://sandbox.petstore.example.com/v1
    description: Sandbox
tags:
  - name: pets
    description: Operations about pets
  - name: owners
    description: Operations about owners
paths:
  /pets:
    get:
      tags: [pets]
      summary: List all pets
      operationId: listPets
      parameters:
        - name: limit
          in: query
          description: Maximum number of pets to return
          required: false
          schema:
            type: integer
            maximum: 100
        - name: status
          in: query
          description: Filter by status
          required: false
          schema:
            type: string
            enum: [available, pending, sold]
      responses:
        "200":
          description: A list of pets
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Pet"
        "400":
          description: Bad request
    post:
      tags: [pets]
      summary: Create a pet
      operationId: createPet
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/NewPet"
      responses:
        "201":
          description: Pet created
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pet"
        "422":
          description: Validation error
  /pets/{petId}:
    get:
      tags: [pets]
      summary: Get a pet by ID
      operationId: getPet
      parameters:
        - name: petId
          in: path
          required: true
          description: The pet identifier
          schema:
            type: string
      responses:
        "200":
          description: The pet
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Pet"
        "404":
          description: Pet not found
    delete:
      tags: [pets]
      summary: Delete a pet
      operationId: deletePet
      parameters:
        - name: petId
          in: path
          required: true
          description: The pet identifier
          schema:
            type: string
      responses:
        "204":
          description: Pet deleted
        "404":
          description: Pet not found
  /owners:
    get:
      tags: [owners]
      summary: List all owners
      operationId: listOwners
      responses:
        "200":
          description: A list of owners
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Owner"
components:
  schemas:
    Pet:
      type: object
      required: [id, name]
      properties:
        id:
          type: string
        name:
          type: string
        status:
          type: string
          enum: [available, pending, sold]
        ownerId:
          type: string
    NewPet:
      type: object
      required: [name]
      properties:
        name:
          type: string
        status:
          type: string
          enum: [available, pending, sold]
    Owner:
      type: object
      required: [id, name]
      properties:
        id:
          type: string
        name:
          type: string
        email:
          type: string
`;

// ---------------------------------------------------------------------------
// Types (minimal, compatible with OAS 3.x and Swagger 2.0)
// ---------------------------------------------------------------------------

interface ParsedSpec {
  info?: { title?: string; version?: string; description?: string };
  // OAS 3.x
  servers?: Array<{ url: string; description?: string }>;
  // Swagger 2.0
  host?: string;
  basePath?: string;
  schemes?: string[];
  paths?: Record<string, PathItem>;
  tags?: Array<{ name: string; description?: string }>;
  // OAS 3.x components / Swagger 2.0 definitions (for schema display)
  components?: { schemas?: Record<string, SchemaObject> };
  definitions?: Record<string, SchemaObject>;
  swagger?: string;
  openapi?: string;
}

type HttpMethod = "get" | "post" | "put" | "patch" | "delete" | "head" | "options" | "trace";

type PathItem = Partial<Record<HttpMethod, OperationObject>>;

interface OperationObject {
  summary?: string;
  description?: string;
  operationId?: string;
  tags?: string[];
  parameters?: ParameterObject[];
  requestBody?: RequestBodyObject;
  responses?: Record<string, ResponseObject>;
  // Swagger 2.0 request body fields
  consumes?: string[];
  produces?: string[];
}

interface ParameterObject {
  name: string;
  in: "query" | "path" | "header" | "cookie" | "body" | "formData";
  description?: string;
  required?: boolean;
  schema?: SchemaObject;
  // Swagger 2.0 inline schema fields
  type?: string;
  format?: string;
  enum?: unknown[];
}

interface RequestBodyObject {
  description?: string;
  required?: boolean;
  content?: Record<string, { schema?: SchemaObject }>;
}

interface ResponseObject {
  description?: string;
  content?: Record<string, { schema?: SchemaObject }>;
  // Swagger 2.0
  schema?: SchemaObject;
}

interface SchemaObject {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  required?: string[];
  enum?: unknown[];
  $ref?: string;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  minimum?: number;
  maximum?: number;
  example?: unknown;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const METHOD_COLORS: Record<string, string> = {
  get: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  post: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  put: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  patch: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  delete: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  head: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
  options: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
  trace: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
};

const HTTP_METHODS: HttpMethod[] = [
  "get", "post", "put", "patch", "delete", "head", "options", "trace",
];

function parseSpec(input: string): { ok: true; spec: ParsedSpec } | { ok: false; error: string } {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, error: "No input" };
  try {
    // Try JSON first, fall back to YAML
    let parsed: unknown;
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      parsed = JSON.parse(trimmed);
    } else {
      parsed = yaml.load(trimmed);
    }
    if (typeof parsed !== "object" || parsed === null) {
      return { ok: false, error: "Parsed value is not an object" };
    }
    return { ok: true, spec: parsed as ParsedSpec };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Parse error" };
  }
}

/** Collect all endpoints grouped by first tag (or "default"). */
function groupByTag(
  paths: Record<string, PathItem>,
): Map<string, Array<{ path: string; method: HttpMethod; op: OperationObject }>> {
  const groups = new Map<string, Array<{ path: string; method: HttpMethod; op: OperationObject }>>();
  for (const [path, pathItem] of Object.entries(paths)) {
    for (const method of HTTP_METHODS) {
      const op = pathItem[method];
      if (!op) continue;
      const tag = op.tags?.[0] ?? "default";
      if (!groups.has(tag)) groups.set(tag, []);
      groups.get(tag)!.push({ path, method, op });
    }
  }
  return groups;
}

/** Render a schema object as a compact, readable string. */
function schemaToString(schema: SchemaObject | undefined, depth = 0): string {
  if (!schema) return "any";
  if (schema.$ref) {
    const parts = schema.$ref.split("/");
    return parts[parts.length - 1];
  }
  if (schema.type === "array") {
    return `${schemaToString(schema.items, depth)}[]`;
  }
  if (schema.type === "object" || schema.properties) {
    if (depth > 0) return "object";
    const props = schema.properties
      ? Object.entries(schema.properties)
          .map(([k, v]) => `  ${k}${schema.required?.includes(k) ? "" : "?"}: ${schemaToString(v, depth + 1)}`)
          .join("\n")
      : "";
    return props ? `{\n${props}\n}` : "object";
  }
  if (schema.enum) {
    return schema.enum.map((v) => JSON.stringify(v)).join(" | ");
  }
  const base = schema.format ? `${schema.type}<${schema.format}>` : schema.type ?? "any";
  return base;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function MethodBadge({ method }: { method: string }) {
  const colors = METHOD_COLORS[method.toLowerCase()] ?? METHOD_COLORS.options;
  return (
    <span
      className={`inline-block min-w-[60px] rounded px-2 py-0.5 text-center font-mono text-xs font-semibold uppercase ${colors}`}
    >
      {method}
    </span>
  );
}

function SchemaBlock({ schema, label }: { schema?: SchemaObject; label?: string }) {
  if (!schema) return null;
  const text = schemaToString(schema);
  return (
    <div className="flex flex-col gap-1">
      {label && <span className="text-xs font-medium text-muted-foreground">{label}</span>}
      <pre className="rounded bg-muted/50 px-3 py-2 font-mono text-xs leading-relaxed overflow-x-auto">
        {text}
      </pre>
    </div>
  );
}

function ParametersTable({ params }: { params: ParameterObject[] }) {
  if (params.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">Parameters</span>
      <div className="overflow-x-auto rounded border border-border">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-3 py-1.5 text-left font-medium">Name</th>
              <th className="px-3 py-1.5 text-left font-medium">In</th>
              <th className="px-3 py-1.5 text-left font-medium">Type</th>
              <th className="px-3 py-1.5 text-left font-medium">Required</th>
              <th className="px-3 py-1.5 text-left font-medium">Description</th>
            </tr>
          </thead>
          <tbody>
            {params.map((p, i) => {
              const type = p.schema ? schemaToString(p.schema) : p.type ?? "any";
              return (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-3 py-1.5 font-mono font-medium">{p.name}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{p.in}</td>
                  <td className="px-3 py-1.5 font-mono text-muted-foreground">{type}</td>
                  <td className="px-3 py-1.5">
                    {p.required ? (
                      <span className="text-destructive">yes</span>
                    ) : (
                      <span className="text-muted-foreground">no</span>
                    )}
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{p.description ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RequestBodySection({ body }: { body: RequestBodyObject }) {
  const entries = body.content ? Object.entries(body.content) : [];
  const first = entries[0];
  const schema = first?.[1]?.schema;
  const mediaType = first?.[0];
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">
        Request Body{body.required ? " (required)" : ""}
        {mediaType && <span className="ml-1 font-mono text-muted-foreground/70">· {mediaType}</span>}
      </span>
      {schema && <SchemaBlock schema={schema} />}
      {!schema && (
        <p className="text-xs text-muted-foreground italic">No schema defined</p>
      )}
    </div>
  );
}

function ResponsesSection({ responses }: { responses: Record<string, ResponseObject> }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-medium text-muted-foreground">Responses</span>
      {Object.entries(responses).map(([code, resp]) => {
        const entries = resp.content ? Object.entries(resp.content) : [];
        const schema = entries[0]?.[1]?.schema ?? resp.schema;
        const statusClass =
          code.startsWith("2")
            ? "text-emerald-600 dark:text-emerald-400"
            : code.startsWith("4")
            ? "text-orange-600 dark:text-orange-400"
            : code.startsWith("5")
            ? "text-red-600 dark:text-red-400"
            : "text-muted-foreground";
        return (
          <div key={code} className="flex flex-col gap-1">
            <div className="flex items-baseline gap-2">
              <span className={`font-mono text-xs font-semibold ${statusClass}`}>{code}</span>
              {resp.description && (
                <span className="text-xs text-muted-foreground">{resp.description}</span>
              )}
            </div>
            {schema && <SchemaBlock schema={schema} />}
          </div>
        );
      })}
    </div>
  );
}

function EndpointRow({
  path,
  method,
  op,
}: {
  path: string;
  method: HttpMethod;
  op: OperationObject;
}) {
  const [open, setOpen] = useState(false);
  const hasDetails =
    (op.parameters && op.parameters.length > 0) ||
    op.requestBody ||
    (op.responses && Object.keys(op.responses).length > 0) ||
    op.description;

  return (
    <div className="border-b border-border last:border-0">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/30 transition-colors"
        onClick={() => hasDetails && setOpen((o) => !o)}
        aria-expanded={open}
        disabled={!hasDetails}
      >
        <span className="shrink-0">
          {hasDetails ? (
            open ? (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
            )
          ) : (
            <span className="h-3.5 w-3.5 block" />
          )}
        </span>
        <MethodBadge method={method} />
        <span className="font-mono text-sm">{path}</span>
        {op.summary && (
          <span className="ml-2 text-sm text-muted-foreground truncate">{op.summary}</span>
        )}
        {op.operationId && (
          <span className="ml-auto shrink-0 font-mono text-xs text-muted-foreground/60 hidden sm:block">
            {op.operationId}
          </span>
        )}
      </button>

      {open && hasDetails && (
        <div className="flex flex-col gap-4 border-t border-border bg-muted/10 px-4 py-4 pl-12">
          {op.description && (
            <p className="text-sm text-muted-foreground">{op.description}</p>
          )}
          {op.parameters && op.parameters.length > 0 && (
            <ParametersTable params={op.parameters} />
          )}
          {op.requestBody && <RequestBodySection body={op.requestBody} />}
          {op.responses && Object.keys(op.responses).length > 0 && (
            <ResponsesSection responses={op.responses} />
          )}
        </div>
      )}
    </div>
  );
}

function TagSection({
  tag,
  endpoints,
  defaultOpen,
}: {
  tag: string;
  endpoints: Array<{ path: string; method: HttpMethod; op: OperationObject }>;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        className="flex w-full items-center gap-2 bg-muted/30 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
        <span className="font-medium text-sm">{tag}</span>
        <span className="ml-auto text-xs text-muted-foreground">{endpoints.length} endpoint{endpoints.length !== 1 ? "s" : ""}</span>
      </button>
      {open && (
        <div>
          {endpoints.map(({ path, method, op }, i) => (
            <EndpointRow key={`${method}-${path}-${i}`} path={path} method={method} op={op} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function OpenApiViewerTool() {
  const [input, setInput] = useState(SAMPLE_SPEC);

  const result = useMemo(() => parseSpec(input), [input]);

  const groups = useMemo(() => {
    if (!result.ok || !result.spec.paths) return null;
    return groupByTag(result.spec.paths);
  }, [result]);

  const spec = result.ok ? result.spec : null;
  const isSwagger2 = spec && typeof spec.swagger === "string" && spec.swagger.startsWith("2");

  // Build server display string for Swagger 2.0
  const swagger2BaseUrl = useMemo(() => {
    if (!spec || !isSwagger2) return null;
    const scheme = spec.schemes?.[0] ?? "https";
    const host = spec.host ?? "";
    const base = spec.basePath ?? "/";
    return host ? `${scheme}://${host}${base}` : null;
  }, [spec, isSwagger2]);

  return (
    <div className="flex flex-col gap-4">
      {/* Input */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">OpenAPI / Swagger Spec</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE_SPEC)}>
              Sample
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
          </div>
        </div>
        <CodeEditor
          value={input}
          onChange={setInput}
          language="yaml"
          placeholder="Paste your OpenAPI 3.x or Swagger 2.0 spec here (YAML or JSON)…"
          minHeight="160px"
        />
        {!result.ok && input.trim() && (
          <p className="text-xs text-destructive">{result.error}</p>
        )}
      </div>

      {/* Rendered docs */}
      {spec && (
        <div className="flex flex-col gap-4">
          {/* Info */}
          <div className="rounded-lg border border-border p-4 flex flex-col gap-1.5">
            <div className="flex flex-wrap items-baseline gap-2">
              <h2 className="text-lg font-semibold">
                {spec.info?.title ?? "Untitled API"}
              </h2>
              {spec.info?.version && (
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  v{spec.info.version}
                </span>
              )}
              {(spec.openapi || spec.swagger) && (
                <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                  {spec.openapi ? `OpenAPI ${spec.openapi}` : `Swagger ${spec.swagger}`}
                </span>
              )}
            </div>
            {spec.info?.description && (
              <p className="text-sm text-muted-foreground">{spec.info.description}</p>
            )}
            {/* Servers (OAS 3.x) */}
            {spec.servers && spec.servers.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1">
                {spec.servers.map((s, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs">
                    <span className="font-mono text-muted-foreground">{s.url}</span>
                    {s.description && (
                      <span className="text-muted-foreground/60">· {s.description}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Base URL (Swagger 2.0) */}
            {swagger2BaseUrl && (
              <div className="flex items-center gap-1.5 rounded border border-border px-2 py-1 text-xs w-fit mt-1">
                <span className="font-mono text-muted-foreground">{swagger2BaseUrl}</span>
              </div>
            )}
          </div>

          {/* Paths */}
          {groups && groups.size > 0 ? (
            <div className="flex flex-col gap-3">
              {Array.from(groups.entries()).map(([tag, endpoints], i) => (
                <TagSection
                  key={tag}
                  tag={tag}
                  endpoints={endpoints}
                  defaultOpen={i === 0}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No paths defined in this spec.</p>
          )}
        </div>
      )}
    </div>
  );
}
