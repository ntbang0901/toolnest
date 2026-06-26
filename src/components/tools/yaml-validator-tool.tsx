import { useState, useMemo } from "react";
import yaml from "js-yaml";
import { CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/tools/code-editor";
import { CopyButton } from "@/components/tools/copy-button";

const SAMPLE_YAML = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: production
  labels:
    app: my-app
    version: "1.0.0"
spec:
  replicas: 3
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: my-app:1.0.0
          ports:
            - containerPort: 8080
          env:
            - name: NODE_ENV
              value: production
            - name: PORT
              value: "8080"
          resources:
            requests:
              cpu: "100m"
              memory: "128Mi"
            limits:
              cpu: "500m"
              memory: "512Mi"
          readinessProbe:
            httpGet:
              path: /healthz
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 10
---
apiVersion: v1
kind: Service
metadata:
  name: my-app-svc
  namespace: production
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: ClusterIP
`;

type RootType = "object" | "array" | "string" | "number" | "boolean" | "null";

function getRootType(value: unknown): RootType {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  return typeof value as RootType;
}

function describeDocument(doc: unknown): string {
  const type = getRootType(doc);
  if (type === "object" && doc !== null) {
    const keys = Object.keys(doc as object);
    return `object with ${keys.length} key${keys.length !== 1 ? "s" : ""}`;
  }
  if (type === "array") {
    const len = (doc as unknown[]).length;
    return `array with ${len} item${len !== 1 ? "s" : ""}`;
  }
  return type;
}

type ValidationResult =
  | { ok: true; documents: unknown[]; isMultiDoc: boolean }
  | { ok: false; message: string; line?: number };

function parseYaml(input: string): ValidationResult {
  if (!input.trim()) return { ok: false, message: "Input is empty." };
  try {
    const documents: unknown[] = [];
    yaml.loadAll(input, (doc) => documents.push(doc));
    return { ok: true, documents, isMultiDoc: documents.length > 1 };
  } catch (err) {
    if (err instanceof yaml.YAMLException) {
      return {
        ok: false,
        message: err.reason ?? err.message,
        line: err.mark?.line != null ? err.mark.line + 1 : undefined,
      };
    }
    return { ok: false, message: String(err) };
  }
}

export default function YamlValidatorTool() {
  const [input, setInput] = useState(SAMPLE_YAML);
  const [showJson, setShowJson] = useState(false);

  const result = useMemo(() => parseYaml(input), [input]);

  const jsonOutput = useMemo(() => {
    if (!result.ok) return "";
    if (result.documents.length === 1) {
      return JSON.stringify(result.documents[0], null, 2);
    }
    return JSON.stringify(result.documents, null, 2);
  }, [result]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE_YAML)}>
          Sample
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">YAML Input</label>
        <CodeEditor
          value={input}
          onChange={setInput}
          language="yaml"
          placeholder="Paste your YAML here…"
          minHeight="320px"
        />
      </div>

      {input.trim() && (
        <div
          className={`rounded-lg border p-4 ${
            result.ok
              ? "border-green-500/30 bg-green-500/5"
              : "border-destructive/30 bg-destructive/5"
          }`}
        >
          {result.ok ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0 text-green-600 dark:text-green-400" />
                <span className="text-sm font-medium text-green-600 dark:text-green-400">
                  Valid YAML
                </span>
              </div>
              <ul className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                {result.isMultiDoc ? (
                  <>
                    <li>
                      Multi-document YAML — {result.documents.length} documents (separated by{" "}
                      <code className="font-mono">---</code>)
                    </li>
                    {result.documents.map((doc, i) => (
                      <li key={i}>
                        Document {i + 1}: {describeDocument(doc)}
                      </li>
                    ))}
                  </>
                ) : (
                  <li>Root element: {describeDocument(result.documents[0])}</li>
                )}
              </ul>
              <div className="mt-1 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowJson((v) => !v)}
                >
                  {showJson ? "Hide JSON" : "Convert to JSON"}
                </Button>
                {showJson && <CopyButton value={jsonOutput} label="Copy JSON" />}
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-2">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="flex flex-col gap-0.5">
                <span className="text-sm font-medium text-destructive">Invalid YAML</span>
                {result.line != null && (
                  <span className="text-xs text-muted-foreground">Line {result.line}</span>
                )}
                <span className="text-xs text-destructive">{result.message}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {result.ok && showJson && jsonOutput && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">JSON Output</label>
            <CopyButton value={jsonOutput} label="Copy JSON" />
          </div>
          <pre className="overflow-auto rounded-lg border bg-muted/40 p-3 text-xs font-mono leading-relaxed">
            {jsonOutput}
          </pre>
        </div>
      )}
    </div>
  );
}
