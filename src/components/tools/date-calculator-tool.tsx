import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

// Date arithmetic — pure JS, no deps

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000);
}

function addDuration(date: Date, years: number, months: number, days: number): Date {
  const d = new Date(date);
  d.setFullYear(d.getFullYear() + years);
  d.setMonth(d.getMonth() + months);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
}

function toInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function workdaysBetween(a: Date, b: Date): number {
  const [start, end] = a <= b ? [a, b] : [b, a];
  let count = 0;
  const cur = new Date(start);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return a <= b ? count : -count;
}

function addWorkdays(date: Date, n: number): Date {
  const d = new Date(date);
  const step = n > 0 ? 1 : -1;
  let remaining = Math.abs(n);
  while (remaining > 0) {
    d.setDate(d.getDate() + step);
    if (d.getDay() !== 0 && d.getDay() !== 6) remaining--;
  }
  return d;
}

const today = new Date();
today.setHours(0, 0, 0, 0);

export default function DateCalculatorTool() {
  // Tab: diff | add | workdays
  const [tab, setTab] = useState<"diff" | "add" | "workdays">("diff");

  // Diff
  const [dateA, setDateA] = useState(toInputValue(today));
  const [dateB, setDateB] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 30);
    return toInputValue(d);
  });

  // Add/subtract
  const [baseDate, setBaseDate] = useState(toInputValue(today));
  const [addYears, setAddYears] = useState(0);
  const [addMonths, setAddMonths] = useState(0);
  const [addDays, setAddDays] = useState(30);

  // Workdays
  const [wdDateA, setWdDateA] = useState(toInputValue(today));
  const [wdDateB, setWdDateB] = useState(() => {
    const d = new Date(today);
    d.setDate(d.getDate() + 14);
    return toInputValue(d);
  });
  const [wdAdd, setWdAdd] = useState(10);

  const diffResult = useMemo(() => {
    const a = new Date(dateA);
    const b = new Date(dateB);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    const totalDays = daysBetween(a, b);
    const abs = Math.abs(totalDays);
    const years = Math.floor(abs / 365);
    const months = Math.floor((abs % 365) / 30);
    const days = abs % 30;
    return { totalDays, abs, years, months, days, weeks: Math.floor(abs / 7), a, b };
  }, [dateA, dateB]);

  const addResult = useMemo(() => {
    const base = new Date(baseDate);
    if (isNaN(base.getTime())) return null;
    return addDuration(base, addYears, addMonths, addDays);
  }, [baseDate, addYears, addMonths, addDays]);

  const wdResult = useMemo(() => {
    const a = new Date(wdDateA);
    const b = new Date(wdDateB);
    if (isNaN(a.getTime()) || isNaN(b.getTime())) return null;
    const diff = workdaysBetween(a, b);
    const added = addWorkdays(a, wdAdd);
    return { diff, added };
  }, [wdDateA, wdDateB, wdAdd]);

  const tabs = [
    { id: "diff" as const, label: "Date Difference" },
    { id: "add" as const, label: "Add / Subtract" },
    { id: "workdays" as const, label: "Workdays" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-1 rounded-lg border border-border bg-muted p-1 w-fit">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === t.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "diff" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-4 items-end">
            <DateField label="Start date" value={dateA} onChange={setDateA} />
            <DateField label="End date" value={dateB} onChange={setDateB} />
            <Button variant="outline" size="sm" onClick={() => { setDateA(dateB); setDateB(dateA); }}>
              Swap
            </Button>
          </div>
          {diffResult && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <ResultCard label="Total days" value={String(diffResult.totalDays)} note={diffResult.totalDays >= 0 ? "ahead" : "behind"} />
              <ResultCard label="Weeks" value={String(diffResult.weeks)} note={`${diffResult.abs % 7} days remainder`} />
              <ResultCard label="Approx." value={`${diffResult.years}y ${diffResult.months}m ${diffResult.days}d`} />
              <ResultCard label="Direction" value={diffResult.totalDays >= 0 ? "Future →" : "← Past"} />
            </div>
          )}
        </div>
      )}

      {tab === "add" && (
        <div className="flex flex-col gap-4">
          <DateField label="Base date" value={baseDate} onChange={setBaseDate} />
          <div className="flex flex-wrap gap-3">
            <NumberField label="Years" value={addYears} onChange={setAddYears} />
            <NumberField label="Months" value={addMonths} onChange={setAddMonths} />
            <NumberField label="Days" value={addDays} onChange={setAddDays} />
          </div>
          {addResult && (
            <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-4">
              <span className="text-xs text-muted-foreground">Result</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{formatDate(addResult)}</span>
                <CopyButton value={toInputValue(addResult)} label="" />
              </div>
              <span className="font-mono text-sm text-muted-foreground">{toInputValue(addResult)}</span>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {[
              [0, 0, 7, "+7 days"],
              [0, 0, 30, "+30 days"],
              [0, 0, 90, "+90 days"],
              [0, 1, 0, "+1 month"],
              [1, 0, 0, "+1 year"],
              [0, 0, -7, "-7 days"],
            ].map(([y, m, d, label]) => (
              <Button key={String(label)} variant="outline" size="sm"
                onClick={() => { setAddYears(Number(y)); setAddMonths(Number(m)); setAddDays(Number(d)); }}>
                {label}
              </Button>
            ))}
          </div>
        </div>
      )}

      {tab === "workdays" && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Workdays between two dates</span>
            <div className="flex flex-wrap gap-4 items-end">
              <DateField label="Start" value={wdDateA} onChange={setWdDateA} />
              <DateField label="End" value={wdDateB} onChange={setWdDateB} />
            </div>
            {wdResult && (
              <ResultCard label="Workdays" value={String(wdResult.diff)} note="Mon–Fri, excl. weekends" />
            )}
          </div>
          <div className="flex flex-col gap-3">
            <span className="text-sm font-medium">Add workdays to a date</span>
            <div className="flex flex-wrap gap-3 items-end">
              <DateField label="Start date" value={wdDateA} onChange={setWdDateA} />
              <NumberField label="Workdays to add" value={wdAdd} onChange={setWdAdd} />
            </div>
            {wdResult && (
              <div className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3">
                <span className="text-sm font-semibold">{formatDate(wdResult.added)}</span>
                <CopyButton value={toInputValue(wdResult.added)} label="" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DateField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex h-9 w-28 rounded-md border border-input bg-transparent px-3 py-1 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
    </div>
  );
}

function ResultCard({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-xl font-semibold font-mono">{value}</span>
      {note && <span className="text-xs text-muted-foreground">{note}</span>}
    </div>
  );
}
