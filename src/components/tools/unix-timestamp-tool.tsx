import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";

const TIMEZONES = [
  "UTC",
  "Asia/Ho_Chi_Minh",
  "Asia/Tokyo",
  "Asia/Singapore",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
];

function detectInput(raw: string): { ms: number } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n)) return null;
    if (trimmed.length <= 10) return { ms: n * 1000 };
    if (trimmed.length === 13) return { ms: n };
    if (trimmed.length === 16) return { ms: Math.floor(n / 1000) };
    return { ms: n };
  }
  const parsed = Date.parse(trimmed);
  if (Number.isNaN(parsed)) return null;
  return { ms: parsed };
}

function formatInTz(date: Date, tz: string): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(date);
  } catch {
    return "—";
  }
}

export default function UnixTimestampTool() {
  const [input, setInput] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const detected = useMemo(() => (input ? detectInput(input) : { ms: now }), [input, now]);
  const date = detected ? new Date(detected.ms) : null;

  const isLive = !input;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Input</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Unix seconds, ms, or ISO 8601 (leave empty for current time)"
            className="font-mono"
          />
          <div className="flex gap-2">
            <Button variant="outline" size="md" onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>
              Now
            </Button>
            <Button variant="ghost" size="md" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
          </div>
        </div>
        {input && !detected && (
          <p className="text-xs text-destructive">Unable to parse this input.</p>
        )}
      </div>

      {date && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field
              label={`Unix seconds${isLive ? " (live)" : ""}`}
              value={String(Math.floor(date.getTime() / 1000))}
            />
            <Field label="Unix milliseconds" value={String(date.getTime())} />
            <Field label="ISO 8601 (UTC)" value={date.toISOString()} />
            <Field label="Relative" value={formatRelative(date.getTime() - now)} />
          </div>

          <div className="flex flex-col gap-2">
            <div className="text-sm font-medium">Time zones</div>
            <div className="grid gap-2 rounded-lg border border-border bg-card p-3">
              {TIMEZONES.map((tz) => (
                <div key={tz} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-muted-foreground">{tz}</span>
                  <span className="font-mono">{formatInTz(date, tz)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <CopyButton value={value} label="" />
      </div>
      <div className="break-all font-mono text-sm">{value}</div>
    </div>
  );
}

function formatRelative(deltaMs: number): string {
  const abs = Math.abs(deltaMs);
  const future = deltaMs > 0;
  const units: [number, string][] = [
    [1000 * 60 * 60 * 24 * 365, "year"],
    [1000 * 60 * 60 * 24 * 30, "month"],
    [1000 * 60 * 60 * 24, "day"],
    [1000 * 60 * 60, "hour"],
    [1000 * 60, "minute"],
    [1000, "second"],
  ];
  for (const [ms, label] of units) {
    if (abs >= ms) {
      const n = Math.floor(abs / ms);
      const plural = n === 1 ? label : `${label}s`;
      return future ? `in ${n} ${plural}` : `${n} ${plural} ago`;
    }
  }
  return "just now";
}
