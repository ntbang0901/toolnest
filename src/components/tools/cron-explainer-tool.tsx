import { useMemo, useState } from "react";
import cronstrue from "cronstrue";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";

const PRESETS: Array<{ label: string; cron: string }> = [
  { label: "Every minute", cron: "* * * * *" },
  { label: "Every 5 min", cron: "*/5 * * * *" },
  { label: "Every hour", cron: "0 * * * *" },
  { label: "Daily 9am", cron: "0 9 * * *" },
  { label: "Weekdays 9am", cron: "0 9 * * 1-5" },
  { label: "Mondays 8am", cron: "0 8 * * 1" },
  { label: "1st of month", cron: "0 0 1 * *" },
  { label: "Every Sun mid", cron: "0 0 * * 0" },
];

function describe(expr: string): { ok: true; text: string } | { ok: false; error: string } {
  try {
    const text = cronstrue.toString(expr.trim(), { use24HourTimeFormat: true, throwExceptionOnParseError: true });
    return { ok: true, text };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid cron expression" };
  }
}

export default function CronExplainerTool() {
  const [input, setInput] = useState("0 9 * * 1-5");

  const result = useMemo(() => describe(input), [input]);

  const fields = input.trim().split(/\s+/);
  const fieldLabels = ["Minute", "Hour", "Day of month", "Month", "Day of week"];
  if (fields.length === 6) fieldLabels.unshift("Second");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="cron-input">
          Crontab expression
        </label>
        <Input
          id="cron-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="font-mono"
          spellCheck={false}
        />
      </div>

      {result.ok ? (
        <div className="rounded-md border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground">Plain English</div>
          <p className="mt-1 text-base">{result.text}</p>
        </div>
      ) : (
        <p className="text-xs text-destructive">{result.error}</p>
      )}

      {fields.length >= 5 && fields.length <= 6 && (
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {fields.map((f, i) => (
            <div key={i} className="rounded-md border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground">{fieldLabels[i] ?? `Field ${i}`}</div>
              <div className="mt-0.5 font-mono text-sm">{f}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-xs font-medium text-muted-foreground">Presets</span>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((p) => (
            <Button key={p.cron} variant="outline" size="sm" onClick={() => setInput(p.cron)}>
              {p.label}
              <span className="ml-2 font-mono text-xs text-muted-foreground">{p.cron}</span>
            </Button>
          ))}
        </div>
      </div>

      <div className="flex justify-end">
        <CopyButton value={input} label="Copy expression" />
      </div>
    </div>
  );
}
