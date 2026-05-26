import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  hint?: string;
}

interface Props<T extends string = string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: "sm" | "md";
  ariaLabel: string;
  className?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onChange,
  size = "md",
  ariaLabel,
  className,
}: Props<T>) {
  const padX = size === "sm" ? "px-2" : "px-3";
  const padY = size === "sm" ? "py-1" : "py-1.5";
  const text = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={cn(
        "inline-flex rounded-lg border border-input bg-muted/60 p-0.5",
        text,
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            title={opt.hint}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              padX,
              padY,
              active
                ? "bg-background text-foreground shadow-sm font-medium"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
