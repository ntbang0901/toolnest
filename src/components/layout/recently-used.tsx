import { useEffect, useState } from "react";
import { tools } from "@/lib/tools-registry";

const STORAGE_KEY = "toolnest:recent";
const MAX = 6;

const ICON_MAP = Object.fromEntries(tools.map((t) => [t.slug, t]));

export default function RecentlyUsed() {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRecent(parsed.filter((s): s is string => typeof s === "string" && s in ICON_MAP).slice(0, MAX));
      }
    } catch {
      // ignore
    }
  }, []);

  if (recent.length === 0) return null;

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-xs font-medium text-muted-foreground">Recent</h2>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {recent.map((slug) => {
          const tool = ICON_MAP[slug];
          if (!tool) return null;
          const Icon = tool.icon;
          return (
            <a
              key={slug}
              href={`/tools/${slug}`}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-all hover:border-foreground/20 hover:shadow-sm hover:-translate-y-px"
            >
              <Icon className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{tool.name}</div>
                <div className="truncate text-xs text-muted-foreground leading-relaxed">{tool.description}</div>
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
