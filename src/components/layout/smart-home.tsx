import { useEffect, useState, useMemo } from "react";
import { Clock, Star, ArrowRight, TrendingUp } from "lucide-react";
import { categories, getFeaturedTools, tools } from "@/lib/tools-registry";
import { cn } from "@/lib/utils";

const RECENT_KEY = "recent-tools";
const FAVORITES_KEY = "favorite-tools";
const USAGE_KEY = "tool-usage-stats";

type UsageStats = Record<string, { count: number; lastUsed: number; days: number[] }>;

function getStoredSlugs(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getUsageStats(): UsageStats {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SmartHome() {
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);
  const [favoriteSlugs, setFavoriteSlugs] = useState<string[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStats>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setRecentSlugs(getStoredSlugs(RECENT_KEY).slice(0, 6));
    setFavoriteSlugs(getStoredSlugs(FAVORITES_KEY));
    setUsageStats(getUsageStats());
    setMounted(true);
  }, []);

  const featured = getFeaturedTools();

  const recentTools = useMemo(
    () =>
      recentSlugs
        .map((slug) => tools.find((t) => t.slug === slug))
        .filter(Boolean) as typeof tools,
    [recentSlugs],
  );

  const favoriteTools = useMemo(
    () =>
      favoriteSlugs
        .map((slug) => tools.find((t) => t.slug === slug))
        .filter(Boolean) as typeof tools,
    [favoriteSlugs],
  );

  const topUsed = useMemo(() => {
    const entries = Object.entries(usageStats)
      .filter(([, stats]) => stats.count > 1)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 6);
    return entries
      .map(([slug, stats]) => {
        const tool = tools.find((t) => t.slug === slug);
        if (!tool) return null;
        return { ...tool, count: stats.count, lastUsed: stats.lastUsed };
      })
      .filter(Boolean) as (typeof tools[number] & { count: number; lastUsed: number })[];
  }, [usageStats]);

  const continueItem = useMemo(() => {
    if (!recentSlugs.length) return null;
    const slug = recentSlugs[0];
    const tool = tools.find((t) => t.slug === slug);
    if (!tool) return null;
    const stats = usageStats[slug];
    return { tool, lastUsed: stats?.lastUsed ?? Date.now() };
  }, [recentSlugs, usageStats]);

  const grouped = useMemo(
    () =>
      categories
        .map((cat) => ({
          ...cat,
          items: tools.filter((tool) => tool.category === cat.id),
        }))
        .filter((cat) => cat.items.length > 0),
    [],
  );

  return (
    <div className="space-y-10">
      {/* Hero — honest, functional */}
      <section>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
          toolnest
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {tools.length} utilities. No account, no upload, runs in your browser.{" "}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("open-search"))}
            className="inline-flex items-center gap-1 text-foreground/80 hover:text-foreground transition-colors"
          >
            Press <kbd className="kbd">⌘K</kbd> to search.
          </button>
        </p>
      </section>

      {/* Continue — the only elevated card on the page */}
      {continueItem && mounted && (
        <section>
          <a
            href={`/tools/${continueItem.tool.slug}`}
            className="glass group flex items-center gap-4 rounded-lg p-4 transition-colors hover:border-foreground/20"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted/60 shrink-0">
              <continueItem.tool.icon className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-muted-foreground font-mono">
                {timeAgo(continueItem.lastUsed)}
              </div>
              <div className="text-sm font-medium">{continueItem.tool.name}</div>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors flex items-center gap-1">
              Continue <ArrowRight className="h-3 w-3" />
            </span>
          </a>
        </section>
      )}

      {/* Favorites — compact grid, no glass */}
      {favoriteTools.length > 0 && (
        <section>
          <SectionLabel label="Pinned" />
          <div className="grid gap-1.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {favoriteTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group flex items-center gap-2.5 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/15 hover:bg-card/80"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate">
                    {tool.name}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Most Used — only if data exists */}
      {topUsed.length > 0 && (
        <section>
          <SectionLabel label="Most used" />
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {topUsed.map((tool) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:border-foreground/15"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate flex-1">
                    {tool.name}
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground/60">
                    {tool.count}×
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Recent */}
      {recentTools.length > 0 && !continueItem && (
        <section>
          <SectionLabel label="Recent" />
          <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
            {recentTools.map((tool) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group flex items-center gap-2.5 rounded-md px-2.5 py-2 transition-all hover:bg-muted hover:translate-x-0.5"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60 group-hover:text-muted-foreground transition-colors" />
                  <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors truncate">
                    {tool.name}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* Featured — opaque cards, no shimmer */}
      {featured.length > 0 && (
        <section>
          <SectionLabel label="Featured" />
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((tool) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3.5 transition-colors hover:border-foreground/15 hover:bg-card/80"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/60 shrink-0 mt-0.5">
                    <Icon className="h-4 w-4 text-foreground" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium">{tool.name}</div>
                    <div className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {tool.description}
                    </div>
                  </div>
                </a>
              );
            })}
          </div>
        </section>
      )}

      {/* All Tools by Category — the densest, most functional section */}
      {grouped.map((cat) => (
        <section key={cat.id}>
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              {cat.label}
            </h2>
            <span className="font-mono text-[10px] text-muted-foreground/40">
              {cat.items.length}
            </span>
          </div>
          <div className="grid gap-x-6 gap-y-0.5 sm:grid-cols-2 lg:grid-cols-3">
            {cat.items.map((tool) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className="group flex items-center gap-2.5 rounded-md px-2.5 py-1.5 transition-all hover:bg-muted hover:translate-x-0.5"
                >
                  <Icon
                    className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors"
                    aria-hidden="true"
                  />
                  <span className="truncate text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                    {tool.name}
                  </span>
                </a>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

/** Tier-1 section label — for user-data sections (personal context) */
function SectionLabel({ label }: { label: string }) {
  return (
    <h2 className="mb-2 text-xs font-medium text-foreground/70">
      {label}
    </h2>
  );
}
