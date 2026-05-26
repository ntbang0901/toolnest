import { useEffect } from "react";

const STORAGE_KEY = "toolnest:recent";
const MAX = 6;

interface Props {
  slug: string;
}

export default function RecentTracker({ slug }: Props) {
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      const filtered = Array.isArray(list)
        ? list.filter((s): s is string => typeof s === "string" && s !== slug)
        : [];
      filtered.unshift(slug);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered.slice(0, MAX)));
    } catch {
      // ignore
    }
  }, [slug]);

  return null;
}
