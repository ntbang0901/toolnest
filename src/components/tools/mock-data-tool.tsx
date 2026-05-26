import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

const FIRST_NAMES = [
  "Ada", "Grace", "Linus", "Margaret", "Alan", "Katherine", "Tim", "Donald", "Barbara", "Ken",
  "Hedy", "Dennis", "Edsger", "Brian", "Bjarne", "Anders", "Yukihiro", "Guido", "James", "Rich",
  "Jane", "Mai", "Long", "Vy", "Phuc", "Anh", "Bao", "Dat", "Hoa", "Khang",
];
const LAST_NAMES = [
  "Lovelace", "Hopper", "Torvalds", "Hamilton", "Turing", "Johnson", "Berners-Lee", "Knuth",
  "Liskov", "Thompson", "Lamarr", "Ritchie", "Dijkstra", "Kernighan", "Stroustrup", "Hejlsberg",
  "Matsumoto", "Rossum", "Gosling", "Hickey", "Nguyen", "Tran", "Le", "Pham", "Hoang", "Vo",
];
const DOMAINS = ["example.com", "test.dev", "mail.io", "demo.app", "sample.org"];
const COMPANIES = ["Acme Co", "Globex", "Initech", "Umbrella", "Stark Industries", "Wayne Enterprises"];
const STREETS = ["Main", "Oak", "Pine", "Maple", "Cedar", "Elm", "Sunset", "Lake", "Park"];
const CITIES = ["Hanoi", "Saigon", "Da Nang", "London", "New York", "Tokyo", "Berlin", "Paris"];

type Format = "json" | "csv";

interface Field {
  id: string;
  label: string;
  enabled: boolean;
  generate: () => string | number;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const FIELDS: Field[] = [
  { id: "id", label: "ID (uuid)", enabled: true, generate: () => crypto.randomUUID() },
  { id: "firstName", label: "First name", enabled: true, generate: () => pick(FIRST_NAMES) },
  { id: "lastName", label: "Last name", enabled: true, generate: () => pick(LAST_NAMES) },
  {
    id: "email",
    label: "Email",
    enabled: true,
    generate: () => `${pick(FIRST_NAMES).toLowerCase()}.${pick(LAST_NAMES).toLowerCase()}@${pick(DOMAINS)}`,
  },
  { id: "phone", label: "Phone", enabled: false, generate: () => `+84 ${Math.floor(900000000 + Math.random() * 99999999)}` },
  { id: "company", label: "Company", enabled: false, generate: () => pick(COMPANIES) },
  {
    id: "address",
    label: "Address",
    enabled: false,
    generate: () => `${Math.floor(1 + Math.random() * 999)} ${pick(STREETS)} St, ${pick(CITIES)}`,
  },
  { id: "city", label: "City", enabled: false, generate: () => pick(CITIES) },
  { id: "age", label: "Age", enabled: false, generate: () => Math.floor(18 + Math.random() * 50) },
  { id: "active", label: "Active (bool)", enabled: false, generate: () => (Math.random() < 0.7 ? "true" : "false") },
];

function makeRow(enabled: Field[]): Record<string, string | number> {
  const row: Record<string, string | number> = {};
  for (const f of enabled) row[f.id] = f.generate();
  return row;
}

function toCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [keys.join(","), ...rows.map((r) => keys.map((k) => escape(r[k])).join(","))].join("\n");
}

export default function MockDataTool() {
  const [count, setCount] = useState(10);
  const [format, setFormat] = useState<Format>("json");
  const [fields, setFields] = useState<Field[]>(FIELDS);
  const [output, setOutput] = useState("");

  const regen = useCallback(() => {
    const enabled = fields.filter((f) => f.enabled);
    const safeCount = Math.max(1, Math.min(200, Math.floor(count) || 1));
    const rows = Array.from({ length: safeCount }, () => makeRow(enabled));
    setOutput(format === "json" ? JSON.stringify(rows, null, 2) : toCsv(rows));
  }, [fields, count, format]);

  useEffect(() => {
    regen();
  }, [regen]);

  const toggleField = (id: string) =>
    setFields((s) => s.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f)));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="mock-count">
            Rows
          </label>
          <Input
            id="mock-count"
            type="number"
            min={1}
            max={200}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 font-mono"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Format</span>
          <SegmentedControl
            ariaLabel="Format"
            value={format}
            onChange={(v) => setFormat(v as Format)}
            options={[
              { value: "json", label: "JSON" },
              { value: "csv", label: "CSV" },
            ]}
          />
        </div>
        <Button onClick={regen} className="ml-auto">
          <RefreshCw className="h-4 w-4" />
          Regenerate
        </Button>
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 rounded-md border border-border bg-card p-3">
        {fields.map((f) => (
          <Checkbox key={f.id} label={f.label} checked={f.enabled} onChange={() => toggleField(f.id)} />
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">{format.toUpperCase()} output</span>
          <CopyButton value={output} label="Copy" />
        </div>
        <CodeEditor
          value={output}
          language={format === "json" ? "json" : "plain"}
          readOnly
          minHeight="280px"
          className="lg:min-h-[400px]"
        />
      </div>
    </div>
  );
}
