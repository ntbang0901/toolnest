import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, tools, type ToolCategory } from "@/lib/tools-registry";

interface Props {
  currentPath: string;
}

export default function MobileNavTrigger({ currentPath }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const grouped = categories
    .map((cat) => ({ ...cat, items: tools.filter((t) => t.category === cat.id) }))
    .filter((c) => c.items.length > 0);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation"
        aria-expanded={open}
        onClick={() => setOpen(true)}
        className="lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Site navigation"
        >
          <div
            className="absolute inset-0 bg-background/70 backdrop-blur-sm animate-in fade-in"
            onClick={() => setOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[85%] max-w-sm flex-col border-r border-border bg-card shadow-2xl animate-in slide-in-from-left">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <span className="font-semibold tracking-tight">Browse tools</span>
              <Button variant="ghost" size="icon" aria-label="Close" onClick={() => setOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3">
              <ul className="flex flex-col gap-4 text-sm">
                {grouped.map((cat) => (
                  <li key={cat.id}>
                    <CategoryGroup
                      cat={cat}
                      currentPath={currentPath}
                      onSelect={() => setOpen(false)}
                    />
                  </li>
                ))}
              </ul>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}

function CategoryGroup({
  cat,
  currentPath,
  onSelect,
}: {
  cat: { id: ToolCategory; label: string; items: typeof tools };
  currentPath: string;
  onSelect: () => void;
}) {
  return (
    <>
      <div className="mb-1.5 px-2.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
        {cat.label}
      </div>
      <ul className="flex flex-col">
        {cat.items.map((tool) => {
          const href = `/tools/${tool.slug}`;
          const active = currentPath === href;
          const Icon = tool.icon;
          return (
            <li key={tool.slug}>
              <a
                href={href}
                onClick={onSelect}
                className={`flex items-center gap-2 rounded-lg px-2.5 py-2 transition-all ${
                  active
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{tool.name}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}
