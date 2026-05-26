import { useEffect, useRef, useState } from "react";

let initialized = false;

async function ensureMermaid() {
  const mod = await import("mermaid");
  const mermaid = mod.default;
  if (!initialized) {
    const dark = document.documentElement.classList.contains("dark");
    mermaid.initialize({
      startOnLoad: false,
      theme: dark ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    });
    initialized = true;
  }
  return mermaid;
}

interface Props {
  source: string;
  className?: string;
  onSvg?: (svg: string) => void;
  onError?: (err: string | null) => void;
}

export default function MermaidView({ source, className, onSvg, onError }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const idRef = useRef(`mmd-${Math.random().toString(36).slice(2)}`);

  useEffect(() => {
    let cancelled = false;
    if (!source.trim()) {
      if (ref.current) ref.current.innerHTML = "";
      setError(null);
      onError?.(null);
      onSvg?.("");
      return;
    }
    (async () => {
      try {
        const mermaid = await ensureMermaid();
        const { svg } = await mermaid.render(idRef.current, source);
        if (cancelled) return;
        if (ref.current) ref.current.innerHTML = svg;
        setError(null);
        onError?.(null);
        onSvg?.(svg);
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Failed to render";
        setError(msg);
        onError?.(msg);
        onSvg?.("");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [source, onSvg, onError]);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center rounded-md border border-destructive/40 bg-destructive/5 p-4 text-xs text-destructive">
        {error}
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className={`flex items-center justify-center overflow-auto ${className ?? ""} [&>svg]:max-w-full [&>svg]:max-h-full [&>svg]:h-auto`}
    />
  );
}
