import { useState, useMemo } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeEditor } from "@/components/tools/code-editor";
import { CopyButton } from "@/components/tools/copy-button";

// ─── Types ────────────────────────────────────────────────────────────────────

type RecordType = "A" | "AAAA" | "CNAME" | "MX" | "TXT" | "NS" | "SRV" | "CAA" | "PTR";

interface DnsRecord {
  id: string;
  type: RecordType;
  name: string;   // subdomain or "@" or "*"
  ttl: string;    // empty = use $TTL default
  // Common
  value: string;  // A/AAAA/CNAME/TXT/NS/PTR value
  // MX
  priority: string;
  // SRV
  srvPriority: string;
  srvWeight: string;
  srvPort: string;
  srvTarget: string;
  // CAA
  caaFlag: string;   // 0 or 128
  caaTag: string;    // issue | issuewild | iodef
  caaValue: string;
}

// ─── Validation ───────────────────────────────────────────────────────────────

const IPV4_RE = /^(\d{1,3}\.){3}\d{1,3}$/;
const IPV6_RE = /^[0-9a-fA-F:]+$/;
const DOMAIN_RE = /^(\*\.)?([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z]{2,}\.?$|^@$|^\*$/;

function validateRecord(rec: DnsRecord): string | null {
  const name = rec.name.trim();
  if (!name) return "Name is required";

  switch (rec.type) {
    case "A": {
      const v = rec.value.trim();
      if (!v) return "IPv4 address is required";
      if (!IPV4_RE.test(v)) return "Invalid IPv4 address";
      const parts = v.split(".").map(Number);
      if (parts.some((p) => p > 255)) return "IPv4 octets must be 0–255";
      break;
    }
    case "AAAA": {
      const v = rec.value.trim();
      if (!v) return "IPv6 address is required";
      if (!IPV6_RE.test(v) || v.split(":").length < 3) return "Invalid IPv6 address";
      break;
    }
    case "CNAME":
    case "NS":
    case "PTR": {
      if (!rec.value.trim()) return "Value is required";
      break;
    }
    case "MX": {
      if (!rec.value.trim()) return "Mail server is required";
      const p = Number(rec.priority);
      if (!rec.priority.trim() || isNaN(p) || p < 0 || p > 65535)
        return "Priority must be 0–65535";
      break;
    }
    case "TXT": {
      if (!rec.value.trim()) return "TXT content is required";
      break;
    }
    case "SRV": {
      if (!rec.srvTarget.trim()) return "Target is required";
      for (const [label, val, max] of [
        ["Priority", rec.srvPriority, 65535],
        ["Weight",   rec.srvWeight,   65535],
        ["Port",     rec.srvPort,     65535],
      ] as [string, string, number][]) {
        const n = Number(val);
        if (!val.trim() || isNaN(n) || n < 0 || n > max)
          return `${label} must be 0–${max}`;
      }
      break;
    }
    case "CAA": {
      if (!rec.caaValue.trim()) return "CAA value is required";
      const flag = Number(rec.caaFlag);
      if (isNaN(flag) || (flag !== 0 && flag !== 128)) return "Flag must be 0 or 128";
      if (!["issue", "issuewild", "iodef"].includes(rec.caaTag)) return "Invalid CAA tag";
      break;
    }
  }
  return null;
}

// ─── Zone file generation ─────────────────────────────────────────────────────

function recordToZoneLine(rec: DnsRecord, defaultTtl: string): string {
  const name = rec.name.trim() || "@";
  const ttl = rec.ttl.trim() || "";
  const ttlPart = ttl ? `\t${ttl}` : "";

  switch (rec.type) {
    case "A":
    case "AAAA":
    case "CNAME":
    case "NS":
    case "PTR":
      return `${name}${ttlPart}\tIN\t${rec.type}\t${rec.value.trim()}`;
    case "MX":
      return `${name}${ttlPart}\tIN\tMX\t${rec.priority}\t${rec.value.trim()}`;
    case "TXT": {
      // Wrap value in quotes if not already
      const raw = rec.value.trim();
      const quoted = raw.startsWith('"') ? raw : `"${raw.replace(/"/g, '\\"')}"`;
      return `${name}${ttlPart}\tIN\tTXT\t${quoted}`;
    }
    case "SRV":
      return `${name}${ttlPart}\tIN\tSRV\t${rec.srvPriority}\t${rec.srvWeight}\t${rec.srvPort}\t${rec.srvTarget.trim()}`;
    case "CAA":
      return `${name}${ttlPart}\tIN\tCAA\t${rec.caaFlag}\t${rec.caaTag}\t"${rec.caaValue.trim()}"`;
    default:
      return "";
  }
}

function generateZoneFile(origin: string, defaultTtl: string, records: DnsRecord[]): string {
  const lines: string[] = [];
  const o = origin.trim() || "example.com";
  const ttl = defaultTtl.trim() || "3600";

  lines.push(`$ORIGIN ${o.endsWith(".") ? o : o + "."}`);
  lines.push(`$TTL ${ttl}`);
  lines.push("");

  const valid = records.filter((r) => !validateRecord(r));
  if (valid.length === 0) {
    lines.push("; No valid records yet");
    return lines.join("\n");
  }

  // Group by type for readability
  const order: RecordType[] = ["NS", "A", "AAAA", "CNAME", "MX", "TXT", "SRV", "CAA", "PTR"];
  const byType = new Map<RecordType, DnsRecord[]>();
  for (const rec of valid) {
    const list = byType.get(rec.type) ?? [];
    list.push(rec);
    byType.set(rec.type, list);
  }

  for (const type of order) {
    const group = byType.get(type);
    if (!group) continue;
    lines.push(`; ${type} records`);
    for (const rec of group) {
      lines.push(recordToZoneLine(rec, ttl));
    }
    lines.push("");
  }

  return lines.join("\n").trimEnd();
}

// ─── Defaults ─────────────────────────────────────────────────────────────────

function emptyRecord(overrides: Partial<DnsRecord> = {}): DnsRecord {
  return {
    id: crypto.randomUUID(),
    type: "A",
    name: "@",
    ttl: "",
    value: "",
    priority: "10",
    srvPriority: "10",
    srvWeight: "20",
    srvPort: "443",
    srvTarget: "",
    caaFlag: "0",
    caaTag: "issue",
    caaValue: "",
    ...overrides,
  };
}

const DEFAULT_RECORDS: DnsRecord[] = [
  emptyRecord({ type: "A",     name: "@",    value: "203.0.113.10" }),
  emptyRecord({ type: "A",     name: "www",  value: "203.0.113.10" }),
  emptyRecord({ type: "CNAME", name: "mail", value: "mail.example.com." }),
  emptyRecord({ type: "MX",    name: "@",    value: "mail.example.com.", priority: "10" }),
  emptyRecord({ type: "TXT",   name: "@",    value: "v=spf1 mx ~all" }),
];

// ─── Record type meta ─────────────────────────────────────────────────────────

const RECORD_TYPES: RecordType[] = ["A", "AAAA", "CNAME", "MX", "TXT", "NS", "SRV", "CAA", "PTR"];

const TYPE_DESCRIPTIONS: Record<RecordType, string> = {
  A:     "IPv4 address",
  AAAA:  "IPv6 address",
  CNAME: "Canonical name alias",
  MX:    "Mail exchanger",
  TXT:   "Text / SPF / DKIM / DMARC",
  NS:    "Name server",
  SRV:   "Service locator",
  CAA:   "Certificate authority authorization",
  PTR:   "Reverse DNS pointer",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-muted-foreground">
        {label}
        {hint && <span className="ml-1 font-normal opacity-60">{hint}</span>}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function RecordTypeFields({
  rec,
  onChange,
}: {
  rec: DnsRecord;
  onChange: (patch: Partial<DnsRecord>) => void;
}) {
  switch (rec.type) {
    case "A":
      return (
        <Field label="IPv4 Address">
          <Input
            value={rec.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="203.0.113.10"
            className="font-mono"
            spellCheck={false}
          />
        </Field>
      );
    case "AAAA":
      return (
        <Field label="IPv6 Address">
          <Input
            value={rec.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="2001:db8::1"
            className="font-mono"
            spellCheck={false}
          />
        </Field>
      );
    case "CNAME":
      return (
        <Field label="Target" hint="(canonical name)">
          <Input
            value={rec.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="target.example.com."
            className="font-mono"
            spellCheck={false}
          />
        </Field>
      );
    case "NS":
      return (
        <Field label="Name Server">
          <Input
            value={rec.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="ns1.example.com."
            className="font-mono"
            spellCheck={false}
          />
        </Field>
      );
    case "PTR":
      return (
        <Field label="Pointer Target">
          <Input
            value={rec.value}
            onChange={(e) => onChange({ value: e.target.value })}
            placeholder="host.example.com."
            className="font-mono"
            spellCheck={false}
          />
        </Field>
      );
    case "MX":
      return (
        <div className="grid grid-cols-[80px_1fr] gap-2">
          <Field label="Priority">
            <Input
              value={rec.priority}
              onChange={(e) => onChange({ priority: e.target.value })}
              placeholder="10"
              type="number"
              min={0}
              max={65535}
              className="font-mono"
            />
          </Field>
          <Field label="Mail Server">
            <Input
              value={rec.value}
              onChange={(e) => onChange({ value: e.target.value })}
              placeholder="mail.example.com."
              className="font-mono"
              spellCheck={false}
            />
          </Field>
        </div>
      );
    case "TXT":
      return (
        <Field label="Text Content">
          <CodeEditor
            value={rec.value}
            onChange={(v) => onChange({ value: v })}
            language="plain"
            placeholder='v=spf1 include:_spf.google.com ~all'
            minHeight="60px"
          />
        </Field>
      );
    case "SRV":
      return (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            <Field label="Priority">
              <Input
                value={rec.srvPriority}
                onChange={(e) => onChange({ srvPriority: e.target.value })}
                placeholder="10"
                type="number"
                min={0}
                max={65535}
                className="font-mono"
              />
            </Field>
            <Field label="Weight">
              <Input
                value={rec.srvWeight}
                onChange={(e) => onChange({ srvWeight: e.target.value })}
                placeholder="20"
                type="number"
                min={0}
                max={65535}
                className="font-mono"
              />
            </Field>
            <Field label="Port">
              <Input
                value={rec.srvPort}
                onChange={(e) => onChange({ srvPort: e.target.value })}
                placeholder="443"
                type="number"
                min={0}
                max={65535}
                className="font-mono"
              />
            </Field>
          </div>
          <Field label="Target">
            <Input
              value={rec.srvTarget}
              onChange={(e) => onChange({ srvTarget: e.target.value })}
              placeholder="host.example.com."
              className="font-mono"
              spellCheck={false}
            />
          </Field>
        </div>
      );
    case "CAA":
      return (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-[80px_1fr] gap-2">
            <Field label="Flag" hint="(0 or 128)">
              <Input
                value={rec.caaFlag}
                onChange={(e) => onChange({ caaFlag: e.target.value })}
                placeholder="0"
                type="number"
                min={0}
                max={128}
                className="font-mono"
              />
            </Field>
            <Field label="Tag">
              <select
                value={rec.caaTag}
                onChange={(e) => onChange({ caaTag: e.target.value })}
                className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="issue">issue</option>
                <option value="issuewild">issuewild</option>
                <option value="iodef">iodef</option>
              </select>
            </Field>
          </div>
          <Field label="Value">
            <Input
              value={rec.caaValue}
              onChange={(e) => onChange({ caaValue: e.target.value })}
              placeholder='letsencrypt.org'
              className="font-mono"
              spellCheck={false}
            />
          </Field>
        </div>
      );
    default:
      return null;
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function DnsRecordBuilderTool() {
  const [origin, setOrigin] = useState("example.com");
  const [defaultTtl, setDefaultTtl] = useState("3600");
  const [records, setRecords] = useState<DnsRecord[]>(DEFAULT_RECORDS);

  function updateRecord(id: string, patch: Partial<DnsRecord>) {
    setRecords((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function removeRecord(id: string) {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  }

  function addRecord() {
    setRecords((prev) => [...prev, emptyRecord()]);
  }

  const zoneFile = useMemo(
    () => generateZoneFile(origin, defaultTtl, records),
    [origin, defaultTtl, records],
  );

  return (
    <div className="flex flex-col gap-6">

      {/* Zone settings */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="dns-origin">
            Zone Origin
          </label>
          <Input
            id="dns-origin"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="example.com"
            className="font-mono"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="dns-ttl">
            Default TTL <span className="font-normal text-muted-foreground">(seconds)</span>
          </label>
          <Input
            id="dns-ttl"
            value={defaultTtl}
            onChange={(e) => setDefaultTtl(e.target.value)}
            placeholder="3600"
            type="number"
            min={0}
            className="font-mono"
          />
        </div>
      </div>

      {/* Records list */}
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">Records</span>

        {records.map((rec, idx) => {
          const error = validateRecord(rec);
          return (
            <div
              key={rec.id}
              className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
            >
              {/* Header row */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold tabular-nums text-muted-foreground w-5 shrink-0">
                    {idx + 1}.
                  </span>
                  <select
                    value={rec.type}
                    onChange={(e) =>
                      updateRecord(rec.id, { type: e.target.value as RecordType })
                    }
                    aria-label="Record type"
                    className="h-7 rounded-md border border-input bg-background px-2 text-xs font-mono font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {RECORD_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-muted-foreground truncate hidden sm:block">
                    {TYPE_DESCRIPTIONS[rec.type]}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRecord(rec.id)}
                  disabled={records.length === 1}
                  aria-label="Remove record"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Name + TTL row */}
              <div className="grid grid-cols-[1fr_120px] gap-2">
                <Field label="Name" hint='("@" = zone root, "*" = wildcard)'>
                  <Input
                    value={rec.name}
                    onChange={(e) => updateRecord(rec.id, { name: e.target.value })}
                    placeholder="@"
                    className="font-mono"
                    spellCheck={false}
                  />
                </Field>
                <Field label="TTL" hint="(blank = default)">
                  <Input
                    value={rec.ttl}
                    onChange={(e) => updateRecord(rec.id, { ttl: e.target.value })}
                    placeholder={defaultTtl || "3600"}
                    type="number"
                    min={0}
                    className="font-mono"
                  />
                </Field>
              </div>

              {/* Type-specific fields */}
              <RecordTypeFields rec={rec} onChange={(patch) => updateRecord(rec.id, patch)} />

              {/* Validation error */}
              {error && (
                <p className="text-xs text-destructive">{error}</p>
              )}
            </div>
          );
        })}
      </div>

      <Button variant="outline" size="sm" onClick={addRecord} className="self-start gap-1.5">
        <Plus className="h-4 w-4" />
        Add Record
      </Button>

      {/* Zone file output */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Zone File</span>
          <CopyButton value={zoneFile} label="Copy" disabled={!zoneFile} />
        </div>
        <pre className="min-h-[120px] overflow-auto rounded-md border border-border bg-card px-4 py-3 font-mono text-xs leading-relaxed whitespace-pre">
          {zoneFile}
        </pre>
      </div>

    </div>
  );
}
