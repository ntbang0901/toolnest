import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type" | "size"> {
  label?: React.ReactNode;
  hint?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, Props>(
  ({ label, hint, className, id, checked, ...props }, ref) => {
    const reactId = React.useId();
    const inputId = id ?? reactId;
    return (
      <label htmlFor={inputId} className={cn("inline-flex cursor-pointer items-center gap-2 select-none", className)}>
        <span className="relative inline-flex h-4 w-4 shrink-0">
          <input
            id={inputId}
            ref={ref}
            type="checkbox"
            checked={checked}
            className="peer absolute inset-0 cursor-pointer appearance-none rounded border border-input bg-background transition-colors checked:border-brand checked:bg-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            {...props}
          />
          <Check
            className="pointer-events-none absolute left-0 top-0 h-4 w-4 scale-90 stroke-[3] text-primary-foreground opacity-0 transition-opacity peer-checked:opacity-100"
            aria-hidden
          />
        </span>
        {label && (
          <span className="flex flex-col leading-tight">
            <span className="text-sm">{label}</span>
            {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
          </span>
        )}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
