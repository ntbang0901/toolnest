import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { Search } from "lucide-react";
import { categories, type ToolCategory } from "@/lib/tools-registry";

type IndexedTool = {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  keywords: string[];
};

interface Props {
  tools: IndexedTool[];
}

const CAT_LABEL: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.id, c.label]),
);

export default function CommandPaletteTrigger({ tools }: Props) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const grouped = tools.reduce<Record<string, IndexedTool[]>>((acc, tool) => {
    (acc[tool.category] ??= []).push(tool);
    return acc;
  }, {});

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Search tools"
        className="inline-flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground transition-all hover:bg-accent hover:text-foreground hover:border-foreground/20 sm:w-72"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">
          <span className="hidden sm:inline">Search tools…</span>
          <span className="sm:hidden">Search</span>
        </span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] sm:inline-block">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 p-4 pt-[12vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Command label="Tool search" loop>
              <div className="flex items-center border-b border-border px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  autoFocus
                  placeholder="Search tools…"
                  className="h-12 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No tools found.
                </Command.Empty>
                {Object.entries(grouped).map(([category, items]) => (
                  <Command.Group
                    key={category}
                    heading={CAT_LABEL[category] ?? category}
                    className="text-xs uppercase tracking-wide text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5"
                  >
                    {items.map((tool) => (
                      <Command.Item
                        key={tool.slug}
                        value={`${tool.name} ${tool.keywords.join(" ")}`}
                        onSelect={() => {
                          window.location.href = `/tools/${tool.slug}`;
                        }}
                        className="flex cursor-pointer flex-col rounded-md px-3 py-2 aria-selected:bg-accent aria-selected:text-accent-foreground"
                      >
                        <span className="text-sm font-medium text-foreground">{tool.name}</span>
                        <span className="text-xs text-muted-foreground">{tool.description}</span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>
            </Command>
          </div>
        </div>
      )}
    </>
  );
}
