import { useEffect } from "react";

const RECENT_KEY = "recent-tools";
const USAGE_KEY = "tool-usage-stats";
const MAX_RECENT = 12;

interface Props {
  slug: string;
}

interface UsageEntry {
  count: number;
  lastUsed: number;
  days: number[];
}

export default function RecentTracker({ slug }: Props) {
  useEffect(() => {
    try {
      // Update recent tools list
      const raw = localStorage.getItem(RECENT_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const filtered = Array.isArray(list)
        ? list.filter((s): s is string => typeof s === "string" && s !== slug)
        : [];
      filtered.unshift(slug);
      localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, MAX_RECENT)));

      // Update usage stats
      const statsRaw = localStorage.getItem(USAGE_KEY);
      const stats: Record<string, UsageEntry> = statsRaw ? JSON.parse(statsRaw) : {};
      const dayIndex = new Date().getDay(); // 0-6
      const existing = stats[slug] ?? { count: 0, lastUsed: 0, days: [0, 0, 0, 0, 0, 0, 0] };

      existing.count += 1;
      existing.lastUsed = Date.now();
      if (!Array.isArray(existing.days) || existing.days.length !== 7) {
        existing.days = [0, 0, 0, 0, 0, 0, 0];
      }
      existing.days[dayIndex] = (existing.days[dayIndex] ?? 0) + 1;

      stats[slug] = existing;
      localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
    } catch {
      // ignore storage errors
    }
  }, [slug]);

  return null;
}
