import { useState, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import cronstrue from "cronstrue";

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldMode = "every" | "specific" | "range" | "interval";

interface CronField {
  mode: FieldMode;
  specific: string; // comma-separated values, e.g. "1,3,5"
  rangeFrom: string;
  rangeTo: string;
  interval: string; // the N in */N
}

interface CronState {
  minute: CronField;
  hour: CronField;
  dayOfMonth: CronField;
  month: CronField;
  dayOfWeek: CronField;
}

type FieldKey = keyof CronState;

// ─── Constants ────────────────────────────────────────────────────────────────

const FIELD_META: Record<
  FieldKey,
  { label: string; min: number; max: number; names?: string[] }
> = {
  minute:     { label: "Minute",       min: 0,  max: 59 },
  hour:       { label: "Hour",         min: 0,  max: 23 },
  dayOfMonth: { label: "Day of Month", min: 1,  max: 31 },
  month: {
    label: "Month", min: 1, max: 12,
    names: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
  },
  dayOfWeek: {
    label: "Day of Week", min: 0, max: 6,
    names: ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],
  },
};

const FIELD_ORDER: FieldKey[] = ["minute", "hour", "dayOfMonth", "month", "dayOfWeek"];

const MODE_OPTIONS = [
  { value: "every",    label: "Every" },
  { value: "specific", label: "Specific" },
  { value: "range",    label: "Range" },
  { value: "interval", label: "Interval" },
] as const;

const DEFAULT_FIELD: CronField = {
  mode: "every",
  specific: "",
  rangeFrom: "",
  rangeTo: "",
  interval: "2",
};

const DEFAULT_STATE: CronState = {
  minute:     { ...DEFAULT_FIELD },
  hour:       { ...DEFAULT_FIELD },
  dayOfMonth: { ...DEFAULT_FIELD },
  month:      { ...DEFAULT_FIELD },
  dayOfWeek:  { ...DEFAULT_FIELD },
};

// ─── Field → expression segment ──────────────────────────────────────────────

function fieldToSegment(field: CronField): string {
  switch (field.mode) {
    case "every":
      return "*";
    case "specific":
      return field.specific.trim() || "*";
    case "range": {
      const from = field.rangeFrom.trim();
      const to = field.rangeTo.trim();
      if (from && to) return `${from}-${to}`;
      if (from) return from;
      return "*";
    }
    case "interval": {
      const n = parseInt(field.interval, 10);
      if (!isNaN(n) && n > 1) return `*/${n}`;
      return "*";
    }
  }
}

function stateToExpression(state: CronState): string {
  return FIELD_ORDER.map((k) => fieldToSegment(state[k])).join(" ");
}

// ─── Expression → state (bidirectional) ──────────────────────────────────────

function segmentToField(seg: string): CronField {
  const field: CronField = { ...DEFAULT_FIELD };
  seg = seg.trim();
  if (seg === "*") {
    field.mode = "every";
    return field;
  }
  if (/^\*\/\d+$/.test(seg)) {
    field.mode = "interval";
    field.interval = seg.slice(2);
    return field;
  }
  if (/^\d+-\d+$/.test(seg)) {
    const [from, to] = seg.split("-");
    field.mode = "range";
    field.rangeFrom = from;
    field.rangeTo = to;
    return field;
  }
  field.mode = "specific";
  field.specific = seg;
  return field;
}

function expressionToState(expr: string): CronState | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;
  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;
  return {
    minute:     segmentToField(minute),
    hour:       segmentToField(hour),
    dayOfMonth: segmentToField(dayOfMonth),
    month:      segmentToField(month),
    dayOfWeek:  segmentToField(dayOfWeek),
  };
}

// ─── Next run time calculation ────────────────────────────────────────────────

function parseSegment(seg: string, min: number, max: number): Set<number> {
  const result = new Set<number>();
  if (seg === "*") {
    for (let i = min; i <= max; i++) result.add(i);
    return result;
  }
  for (const part of seg.split(",")) {
    const t = part.trim();
    if (/^\*\/\d+$/.test(t)) {
      const step = parseInt(t.slice(2), 10);
      if (step > 0) {
        for (let i = min; i <= max; i += step) result.add(i);
      }
    } else if (/^\d+-\d+$/.test(t)) {
      const [a, b] = t.split("-").map(Number);
      for (let i = a; i <= b && i <= max; i++) result.add(i);
    } else if (/^\d+$/.test(t)) {
      const v = parseInt(t, 10);
      if (v >= min && v <= max) result.add(v);
    }
  }
  return result;
}

function getNextRuns(expression: string, count = 5): Date[] {
  const parts = expression.trim().split(/\s+/);
  if (parts.length !== 5) return [];
  const [mSeg, hSeg, domSeg, monSeg, dowSeg] = parts;

  const minutes    = parseSegment(mSeg,   0, 59);
  const hours      = parseSegment(hSeg,   0, 23);
  const daysOfMon  = parseSegment(domSeg, 1, 31);
  const months     = parseSegment(monSeg, 1, 12);
  const daysOfWeek = parseSegment(dowSeg, 0, 6);

  const results: Date[] = [];
  // Start one minute after now
  const start = new Date();
  start.setSeconds(0, 0);
  start.setMinutes(start.getMinutes() + 1);

  let current = new Date(start);
  const limit = new Date(start);
  limit.setFullYear(limit.getFullYear() + 4); // search up to 4 years ahead

  while (results.length < count && current < limit) {
    const m  = current.getMonth() + 1; // 1-indexed
    const d  = current.getDate();
    const dw = current.getDay();
    const h  = current.getHours();
    const mn = current.getMinutes();

    if (!months.has(m)) {
      // Jump to 1st of next valid month
      current.setDate(1);
      current.setHours(0, 0, 0, 0);
      current.setMonth(current.getMonth() + 1);
      continue;
    }
    if (!daysOfMon.has(d) || !daysOfWeek.has(dw)) {
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }
    if (!hours.has(h)) {
      current.setHours(current.getHours() + 1, 0, 0, 0);
      continue;
    }
    if (!minutes.has(mn)) {
      current.setMinutes(current.getMinutes() + 1, 0, 0);
      continue;
    }
    results.push(new Date(current));
    current.setMinutes(current.getMinutes() + 1, 0, 0);
  }
  return results;
}

// ─── Presets ──────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Every minute",    expr: "* * * * *" },
  { label: "Every hour",      expr: "0 * * * *" },
  { label: "Every day 8am",   expr: "0 8 * * *" },
  { label: "Weekdays 9am",    expr: "0 9 * * 1-5" },
  { label: "Every Sunday",    expr: "0 0 * * 0" },
  { label: "Every 15 min",    expr: "*/15 * * * *" },
  { label: "1st of month",    expr: "0 0 1 * *" },
  { label: "Every quarter",   expr: "0 0 1 1,4,7,10 *" },
];

// ─── Field editor sub-component ──────────────────────────────────────────────

function FieldEditor({
  fieldKey,
  field,
  onChange,
}: {
  fieldKey: FieldKey;
  field: CronField;
  onChange: (key: FieldKey, patch: Partial<CronField>) => void;
}) {
  const meta = FIELD_META[fieldKey];

  const rangeOptions = useMemo(() => {
    const opts = [];
    for (let i = meta.min; i <= meta.max; i++) {
      const name = meta.names ? meta.names[i - meta.min] : String(i);
      opts.push({ value: String(i), label: `${i}${meta.names ? ` – ${name}` : ""}` });
    }
    return opts;
  }, [meta]);

  const numericInput = (
    placeholder: string,
    value: string,
    key: "rangeFrom" | "rangeTo" | "interval" | "specific",
  ) => (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(fieldKey, { [key]: e.target.value })}
      placeholder={placeholder}
      className="flex h-8 w-24 rounded-md border border-input bg-transparent px-2 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    />
  );

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {meta.label}
      </span>
      <SegmentedControl
        options={MODE_OPTIONS as unknown as { value: FieldMode; label: string }[]}
        value={field.mode}
        onChange={(mode) => onChange(fieldKey, { mode: mode as FieldMode })}
        size="sm"
        ariaLabel={`${meta.label} mode`}
      />
      <div className="min-h-[2rem] flex items-center">
        {field.mode === "every" && (
          <span className="text-sm text-muted-foreground">Matches every {meta.label.toLowerCase()}</span>
        )}
        {field.mode === "specific" && (
          <div className="flex flex-col gap-1 w-full">
            {meta.names ? (
              <div className="flex flex-wrap gap-1">
                {rangeOptions.map((opt) => {
                  const isActive = field.specific.split(",").map((s) => s.trim()).includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const current = field.specific
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean);
                        const next = isActive
                          ? current.filter((v) => v !== opt.value)
                          : [...current, opt.value].sort((a, b) => Number(a) - Number(b));
                        onChange(fieldKey, { specific: next.join(",") });
                      }}
                      className={`rounded px-2 py-0.5 text-xs font-medium transition-colors ${
                        isActive
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      {meta.names![Number(opt.value) - meta.min]}
                    </button>
                  );
                })}
              </div>
            ) : (
              numericInput(`e.g. 1,3,5 (${meta.min}–${meta.max})`, field.specific, "specific")
            )}
            <span className="text-xs text-muted-foreground">
              Range: {meta.min}–{meta.max}
            </span>
          </div>
        )}
        {field.mode === "range" && (
          <div className="flex items-center gap-2">
            {numericInput(String(meta.min), field.rangeFrom, "rangeFrom")}
            <span className="text-sm text-muted-foreground">to</span>
            {numericInput(String(meta.max), field.rangeTo, "rangeTo")}
            <span className="text-xs text-muted-foreground">({meta.min}–{meta.max})</span>
          </div>
        )}
        {field.mode === "interval" && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Every</span>
            {numericInput("N", field.interval, "interval")}
            <span className="text-sm text-muted-foreground">{meta.label.toLowerCase()}(s)</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CronBuilderTool() {
  const [fields, setFields] = useState<CronState>(DEFAULT_STATE);
  const [rawExpr, setRawExpr] = useState("* * * * *");
  const [rawEditing, setRawEditing] = useState(false);
  const [rawError, setRawError] = useState("");

  // Derived expression from visual fields (used when not in raw-edit mode)
  const visualExpression = useMemo(() => stateToExpression(fields), [fields]);

  // The "authoritative" expression depends on whether the user is raw-editing
  const expression = rawEditing ? rawExpr : visualExpression;

  const description = useMemo(() => {
    try {
      return cronstrue.toString(expression, { verbose: true });
    } catch {
      return null;
    }
  }, [expression]);

  const nextRuns = useMemo(() => getNextRuns(expression, 5), [expression]);

  const handleFieldChange = useCallback(
    (key: FieldKey, patch: Partial<CronField>) => {
      setRawEditing(false);
      setFields((prev) => ({
        ...prev,
        [key]: { ...prev[key], ...patch },
      }));
    },
    [],
  );

  const handleRawChange = (value: string) => {
    setRawExpr(value);
    setRawEditing(true);
    const parsed = expressionToState(value);
    if (parsed) {
      setFields(parsed);
      setRawError("");
    } else {
      setRawError("Invalid cron expression — expected 5 space-separated fields.");
    }
  };

  const applyPreset = (expr: string) => {
    setRawExpr(expr);
    setRawEditing(false);
    const parsed = expressionToState(expr);
    if (parsed) setFields(parsed);
    setRawError("");
  };

  const formatRunDate = (d: Date) =>
    new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month:   "short",
      day:     "numeric",
      year:    "numeric",
      hour:    "2-digit",
      minute:  "2-digit",
      second:  "2-digit",
      hour12:  false,
    }).format(d);

  return (
    <div className="flex flex-col gap-6">

      {/* Raw expression bar */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Cron Expression</label>
          <CopyButton value={expression} label="Copy" />
        </div>
        <Input
          value={rawEditing ? rawExpr : visualExpression}
          onChange={(e) => handleRawChange(e.target.value)}
          onFocus={() => {
            if (!rawEditing) setRawExpr(visualExpression);
            setRawEditing(true);
          }}
          className="font-mono text-base"
          aria-label="Cron expression"
          placeholder="* * * * *"
        />
        {rawError && (
          <p className="text-xs text-destructive">{rawError}</p>
        )}
        {!rawError && description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>

      {/* Presets */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Presets</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(({ label, expr }) => (
            <Button
              key={expr}
              variant="outline"
              size="sm"
              onClick={() => applyPreset(expr)}
              className={expression === expr ? "border-primary text-primary" : ""}
            >
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Visual field editors */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Visual Builder</span>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {FIELD_ORDER.map((key) => (
            <FieldEditor
              key={key}
              fieldKey={key}
              field={fields[key]}
              onChange={handleFieldChange}
            />
          ))}
        </div>
      </div>

      {/* Next runs */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Next 5 Run Times</span>
        <div className="rounded-lg border border-border bg-card divide-y divide-border">
          {nextRuns.length === 0 ? (
            <p className="px-4 py-3 text-sm text-muted-foreground">
              No upcoming runs found (check expression validity).
            </p>
          ) : (
            nextRuns.map((d, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-2 text-sm"
              >
                <span className="text-muted-foreground tabular-nums">{i + 1}.</span>
                <span className="font-mono">{formatRunDate(d)}</span>
                <CopyButton value={formatRunDate(d)} label="" />
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}
