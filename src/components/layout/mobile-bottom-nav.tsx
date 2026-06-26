import { useCallback, useEffect, useRef, useState } from "react";
import {
  Grid3X3,
  Search,
  Star,
  Clock,
  MoreHorizontal,
  X,
} from "lucide-react";
import { tools, type Tool } from "@/lib/tools-registry";
import { cn } from "@/lib/utils";
import { useCurrentPath } from "@/lib/use-current-path";

interface Props {
  currentPath: string;
}

type Tab = "home" | "search" | "favorites" | "recent" | "more";

const FAVORITES_KEY = "favorite-tools";
const RECENTS_KEY = "recent-tools";

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

function resolveTools(slugs: string[]): Tool[] {
  return slugs
    .map((slug) => tools.find((t) => t.slug === slug))
    .filter((t): t is Tool => !!t);
}

export default function MobileBottomNav({ currentPath: currentPathProp }: Props) {
  const currentPath = useCurrentPath(currentPathProp);
  const [activeTab, setActiveTab] = useState<Tab | null>(null);
  const [visible, setVisible] = useState(true);
  const [favorites, setFavorites] = useState<Tool[]>([]);
  const [recents, setRecents] = useState<Tool[]>([]);
  const lastScrollY = useRef(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef<number | null>(null);

  // Determine current section for active highlight
  const currentSection: Tab | null =
    currentPath === "/" || currentPath === "" ? "home" : null;

  // Load favorites and recents from localStorage, refreshing on each page swap
  useEffect(() => {
    const load = () => {
      setFavorites(resolveTools(getStoredSlugs(FAVORITES_KEY)));
      setRecents(resolveTools(getStoredSlugs(RECENTS_KEY)));
    };
    load();

    const onStorage = (e: StorageEvent) => {
      if (e.key === FAVORITES_KEY) setFavorites(resolveTools(getStoredSlugs(FAVORITES_KEY)));
      if (e.key === RECENTS_KEY) setRecents(resolveTools(getStoredSlugs(RECENTS_KEY)));
    };
    window.addEventListener("storage", onStorage);
    document.addEventListener("astro:page-load", load);
    return () => {
      window.removeEventListener("storage", onStorage);
      document.removeEventListener("astro:page-load", load);
    };
  }, []);

  // Hide on scroll down, show on scroll up
  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastScrollY.current;
        if (delta > 8 && currentY > 80) {
          setVisible(false);
          setActiveTab(null);
        } else if (delta < -4) {
          setVisible(true);
        }
        lastScrollY.current = currentY;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Swipe up on bar to reveal recents
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (touchStartY.current === null) return;
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (deltaY > 40) {
        setActiveTab("recent");
      }
      touchStartY.current = null;
    },
    [],
  );

  // Close panel on outside click
  useEffect(() => {
    if (!activeTab) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setActiveTab(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activeTab]);

  // Close panel on Escape
  useEffect(() => {
    if (!activeTab) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveTab(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTab]);

  const handleTabPress = (tab: Tab) => {
    if (tab === "home") {
      window.location.href = "/";
      return;
    }
    if (tab === "search") {
      // Dispatch custom event that command palette listens for
      window.dispatchEvent(new CustomEvent("open-command-palette"));
      setActiveTab(null);
      return;
    }
    if (tab === "more") {
      window.dispatchEvent(new CustomEvent("open-mobile-nav"));
      setActiveTab(null);
      return;
    }
    // Toggle panel for favorites/recent
    setActiveTab((prev) => (prev === tab ? null : tab));
    // Haptic feedback
    if (navigator.vibrate) navigator.vibrate(10);
  };

  const tabItems: { id: Tab; icon: typeof Grid3X3; label: string }[] = [
    { id: "home", icon: Grid3X3, label: "Home" },
    { id: "search", icon: Search, label: "Search" },
    { id: "favorites", icon: Star, label: "Favorites" },
    { id: "recent", icon: Clock, label: "Recent" },
    { id: "more", icon: MoreHorizontal, label: "More" },
  ];

  const panelTools = activeTab === "favorites" ? favorites : activeTab === "recent" ? recents : [];
  const panelTitle = activeTab === "favorites" ? "Favorites" : "Recent tools";
  const showPanel = (activeTab === "favorites" || activeTab === "recent") && panelTools.length > 0;

  return (
    <div
      ref={panelRef}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 lg:hidden transition-transform duration-300 ease-out",
        visible ? "translate-y-0" : "translate-y-full",
      )}
    >
      {/* Popup panel */}
      {showPanel && (
        <div className="mx-2 mb-1 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {panelTitle}
            </span>
            <button
              onClick={() => setActiveTab(null)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1 px-3 pb-3">
            {panelTools.slice(0, 8).map((tool) => {
              const Icon = tool.icon;
              return (
                <a
                  key={tool.slug}
                  href={`/tools/${tool.slug}`}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-lg px-1 py-2 text-center transition-all",
                    "hover:bg-muted active:scale-95",
                    currentPath === `/tools/${tool.slug}`
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span className="text-[10px] leading-tight line-clamp-2">{tool.name}</span>
                </a>
              );
            })}
          </div>
          {panelTools.length === 0 && (
            <p className="px-4 pb-3 text-xs text-muted-foreground">
              {activeTab === "favorites" ? "No favorites yet. Long-press a tool to add it." : "No recent tools."}
            </p>
          )}
        </div>
      )}

      {/* Empty state for panel with no tools */}
      {(activeTab === "favorites" || activeTab === "recent") && panelTools.length === 0 && (
        <div className="mx-2 mb-1 rounded-xl border border-border bg-card/95 backdrop-blur-xl shadow-xl animate-in slide-in-from-bottom-2 fade-in duration-200">
          <div className="flex items-center justify-between px-4 pt-3 pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {panelTitle}
            </span>
            <button
              onClick={() => setActiveTab(null)}
              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Close panel"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="px-4 pb-3 text-xs text-muted-foreground">
            {activeTab === "favorites"
              ? "No favorites yet. Long-press a tool to add it."
              : "No recent tools yet."}
          </p>
        </div>
      )}

      {/* Bottom navigation bar */}
      <nav
        className="flex items-center justify-around border-t border-border bg-card/80 backdrop-blur-xl"
        style={{
          height: "56px",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
        aria-label="Mobile navigation"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {tabItems.map(({ id, icon: Icon, label }) => {
          const isActive = activeTab === id || (id === "home" && !activeTab && currentSection !== null);
          return (
            <button
              key={id}
              onClick={() => handleTabPress(id)}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-1.5 transition-all duration-150",
                "active:scale-90",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-all duration-150",
                  isActive && "fill-primary/20",
                )}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span className={cn("text-[10px] leading-none", isActive && "font-semibold")}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
