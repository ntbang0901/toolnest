import type { LintIssue } from "../lint/lint";
import { AlertTriangle, Info, AlertCircle } from "lucide-react";

interface Props {
  issues: LintIssue[];
  onJump?: (table: string) => void;
}

const ICONS = {
  warn: AlertTriangle,
  info: Info,
  error: AlertCircle,
};

const COLOR = {
  warn: "text-amber-500",
  info: "text-muted-foreground",
  error: "text-destructive",
};

export function LintPanel({ issues, onJump }: Props) {
  if (!issues.length) {
    return (
      <div className="rounded-md border border-border bg-muted/10 p-3 text-xs text-muted-foreground">
        No lint issues. Schema looks clean.
      </div>
    );
  }
  return (
    <div className="rounded-md border border-border bg-card">
      <div className="border-b border-border px-3 py-2 text-xs font-medium">
        {issues.length} lint issue{issues.length === 1 ? "" : "s"}
      </div>
      <ul className="max-h-48 divide-y divide-border overflow-y-auto">
        {issues.map((i, idx) => {
          const Icon = ICONS[i.level];
          return (
            <li key={idx} className="flex items-start gap-2 px-3 py-1.5 text-xs">
              <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${COLOR[i.level]}`} />
              <div className="flex-1">
                <span className="text-foreground">{i.message}</span>
                <span className="ml-2 text-[10px] text-muted-foreground">{i.rule}</span>
              </div>
              {i.table && onJump && (
                <button
                  type="button"
                  onClick={() => onJump(i.table!)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                >
                  jump
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
