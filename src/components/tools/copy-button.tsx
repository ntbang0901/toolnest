import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

interface CopyButtonProps extends Omit<ButtonProps, "onClick" | "children"> {
  value: string;
  label?: string;
}

export function CopyButton({ value, label = "Copy", ...props }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    if (state === "idle") return;
    const t = setTimeout(() => setState("idle"), 1500);
    return () => clearTimeout(t);
  }, [state]);

  const onCopy = async () => {
    if (!value) return;
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement("textarea");
        ta.value = value;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        // intentional fallback for non-secure contexts
        const ok = (document as Document & { execCommand: (cmd: string) => boolean }).execCommand("copy");
        document.body.removeChild(ta);
        if (!ok) throw new Error("execCommand failed");
      }
      setState("copied");
    } catch {
      setState("failed");
    }
  };

  const text = state === "copied" ? "Copied" : state === "failed" ? "Try again" : label;
  const Icon = state === "copied" ? Check : Copy;

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onCopy}
      disabled={!value}
      aria-live="polite"
      {...props}
    >
      <Icon className="h-4 w-4" />
      {text}
    </Button>
  );
}
