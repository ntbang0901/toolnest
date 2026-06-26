import { useEffect, useState, useCallback } from "react";
import { Command } from "cmdk";
import {
  Boxes,
  Search,
  PanelLeft,
  Star,
  Sun,
  Moon,
  ChevronRight,
  Keyboard,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, type ToolCategory } from "@/lib/tools-registry";
import { useCurrentPath } from "@/lib/use-current-path";

type IndexedTool = {
  slug: string;
  name: string;
  description: string;
  category: ToolCategory;
  keywords: string[];
};

interface HeaderBarProps {
  tools: IndexedTool[];
  currentPath: string;
  currentTool?: { slug: string; name: string; category: ToolCategory } | null;
}

const CAT_LABEL: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c.id, c.label]),
);

const RECENT_KEY = "toolnest:recent-searches";
const FAVORITES_KEY = "favorite-tools";

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").slice(0, 5);
  } catch {
    return [];
  }
}

function addRecentSearch(slug: string) {
  const recent = getRecentSearches().filter((s) => s !== slug);
  recent.unshift(slug);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, 5)));
}

function getFavorites(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

function toggleFavorite(slug: string): string[] {
  const favs = getFavorites();
  const next = favs.includes(slug)
    ? favs.filter((f) => f !== slug)
    : [...favs, slug];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
  return next;
}

export default function HeaderBar({
  tools,
  currentPath: currentPathProp,
  currentTool,
}: HeaderBarProps) {
  const currentPath = useCurrentPath(currentPathProp);
  const [scrolled, setScrolled] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isFavorite, setIsFavorite] = useState(false);
  const [recentSlugs, setRecentSlugs] = useState<string[]>([]);

  // Scroll detection for border appearance
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 2);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Theme init
  useEffect(() => {
    const stored = localStorage.getItem("theme") as "light" | "dark" | null;
    const prefersDark = window.matchMedia(
      "(prefers-color-scheme: dark)",
    ).matches;
    setTheme(stored ?? (prefersDark ? "dark" : "light"));
  }, []);

  // Favorites init — derive the active slug from the live path so it stays
  // correct across persisted page swaps (currentTool prop goes stale)
  useEffect(() => {
    const slug = currentPath.startsWith("/tools/")
      ? currentPath.slice("/tools/".length)
      : null;
    setIsFavorite(slug ? getFavorites().includes(slug) : false);
  }, [currentPath]);

  // Recent searches — refresh on each page swap
  useEffect(() => {
    const loadRecent = () => setRecentSlugs(getRecentSearches());
    loadRecent();
    document.addEventListener("astro:page-load", loadRecent);
    return () => document.removeEventListener("astro:page-load", loadRecent);
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileSearchOpen(false);
      }
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        const active = document.activeElement;
        const isInput =
          active?.tagName === "INPUT" ||
          active?.tagName === "TEXTAREA" ||
          (active as HTMLElement)?.isContentEditable;
        if (!isInput) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("show-shortcuts"));
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Listen for open-search / open-command-palette events from other islands
  useEffect(() => {
    const openSearch = () => setSearchOpen(true);
    window.addEventListener("open-search", openSearch);
    window.addEventListener("open-command-palette", openSearch);
    return () => {
      window.removeEventListener("open-search", openSearch);
      window.removeEventListener("open-command-palette", openSearch);
    };
  }, []);

  // Lock body scroll when search modal opens
  useEffect(() => {
    if (searchOpen) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [searchOpen]);

  const handleThemeToggle = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.classList.toggle("dark", next === "dark");
    localStorage.setItem("theme", next);
  }, [theme]);

  const handleSidebarToggle = useCallback(() => {
    window.dispatchEvent(new CustomEvent("sidebar-toggle"));
  }, []);

  const handleFavoriteToggle = useCallback(() => {
    const slug = currentPath.startsWith("/tools/")
      ? currentPath.slice("/tools/".length)
      : null;
    if (!slug) return;
    const next = toggleFavorite(slug);
    setIsFavorite(next.includes(slug));
  }, [currentPath]);

  const handleToolSelect = useCallback((slug: string) => {
    addRecentSearch(slug);
    window.location.href = `/tools/${slug}`;
  }, []);

  // Group tools for command palette
  const grouped = tools.reduce<Record<string, IndexedTool[]>>((acc, tool) => {
    (acc[tool.category] ??= []).push(tool);
    return acc;
  }, {});

  const recentTools = recentSlugs
    .map((slug) => tools.find((t) => t.slug === slug))
    .filter(Boolean) as IndexedTool[];

  // Resolve the active tool from the live path so the breadcrumb stays in sync
  // across persisted page swaps (the currentTool prop goes stale)
  const activeSlug = currentPath.startsWith("/tools/")
    ? currentPath.slice("/tools/".length)
    : null;
  const activeTool =
    (activeSlug ? tools.find((t) => t.slug === activeSlug) : null) ??
    (currentTool && currentTool.slug === activeSlug ? currentTool : null);

  const isToolPage = !!activeTool;

  return (
    <>
      <header
        className={`sticky top-0 z-30 h-12 bg-background/80 backdrop-blur-md transition-[border-color,box-shadow] duration-200 ${
          scrolled
            ? "border-b border-border/60 shadow-[0_1px_3px_0_rgb(0_0_0/0.05)]"
            : "border-b border-transparent"
        }`}
      >
        <div className="mx-auto flex h-full w-full max-w-[1400px] items-center gap-2 px-4">
          {/* Sidebar toggle */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle sidebar"
            onClick={handleSidebarToggle}
            className="hidden lg:inline-flex h-8 w-8"
          >
            <PanelLeft className="h-4 w-4" />
          </Button>

          {/* Logo — icon+wordmark when sidebar collapsed, icon-only otherwise adaptable via CSS */}
          <a
            href="/"
            className="flex items-center gap-2 text-sm font-semibold tracking-tight hover:opacity-80 transition-opacity"
          >
            <Boxes className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="hidden sm:inline">toolnest</span>
          </a>

          {/* Breadcrumb (desktop, tool pages only) */}
          {isToolPage && (
            <nav
              aria-label="Breadcrumb"
              className="hidden md:flex items-center gap-1 text-sm text-muted-foreground ml-2"
            >
              <ChevronRight className="h-3 w-3" />
              <span className="text-muted-foreground/70">
                {CAT_LABEL[activeTool.category] ?? activeTool.category}
              </span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">
                {activeTool.name}
              </span>
            </nav>
          )}

          {/* Mobile: back + tool name */}
          {isToolPage && (
            <div className="flex md:hidden items-center gap-1 text-sm ml-1 min-w-0">
              <button
                onClick={() => window.history.back()}
                className="text-muted-foreground hover:text-foreground p-0.5"
                aria-label="Go back"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </button>
              <span className="truncate text-foreground font-medium max-w-[120px]">
                {activeTool.name}
              </span>
            </div>
          )}

          {/* Favorite toggle (tool pages) */}
          {isToolPage && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              aria-pressed={isFavorite}
              onClick={handleFavoriteToggle}
              className="h-7 w-7 hidden sm:inline-flex"
            >
              <Star
                className={`h-3.5 w-3.5 transition-colors ${
                  isFavorite
                    ? "fill-favorite text-favorite"
                    : "text-muted-foreground"
                }`}
              />
            </Button>
          )}

          <div className="flex-1" />

          {/* Search trigger (desktop) */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search tools"
            className="hidden sm:inline-flex h-9 w-full max-w-sm items-center gap-2 rounded-lg border border-input bg-background px-3 text-sm text-muted-foreground transition-all hover:bg-muted hover:text-foreground hover:border-foreground/20 focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left">Search tools...</span>
            <kbd className="kbd">⌘K</kbd>
          </button>

          {/* Search trigger (mobile — icon only) */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Search tools"
            onClick={() => setMobileSearchOpen(true)}
            className="sm:hidden h-8 w-8"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={handleThemeToggle}
            className="h-8 w-8"
          >
            <span className="relative h-4 w-4">
              {theme === "dark" ? (
                <Sun className="h-4 w-4 transition-transform duration-300 rotate-0" />
              ) : (
                <Moon className="h-4 w-4 transition-transform duration-300 rotate-0" />
              )}
            </span>
          </Button>

          {/* Keyboard shortcuts button (desktop) */}
          <Button
            variant="ghost"
            size="icon"
            aria-label="Keyboard shortcuts"
            onClick={() => window.dispatchEvent(new CustomEvent("show-shortcuts"))}
            className="hidden sm:inline-flex h-8 w-8"
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Command Palette Modal */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-background/60 p-4 pt-[12vh] backdrop-blur-sm animate-in fade-in duration-150"
          onClick={() => setSearchOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-2xl animate-in slide-in-from-top-2 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <Command label="Tool search" loop>
              <div className="flex items-center border-b border-border px-3">
                <Search className="h-4 w-4 text-muted-foreground" />
                <Command.Input
                  autoFocus
                  placeholder="Search tools..."
                  className="h-12 flex-1 bg-transparent px-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
              <Command.List className="max-h-[60vh] overflow-y-auto p-2">
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No tools found.
                </Command.Empty>

                {/* Recent searches */}
                {recentTools.length > 0 && (
                  <Command.Group
                    heading="Recent"
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {recentTools.map((tool) => (
                      <Command.Item
                        key={`recent-${tool.slug}`}
                        value={`${tool.name} ${tool.keywords.join(" ")}`}
                        onSelect={() => handleToolSelect(tool.slug)}
                        className="flex cursor-pointer flex-col rounded-md px-3 py-2 aria-selected:bg-muted aria-selected:text-foreground"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {tool.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tool.description}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                )}

                {Object.entries(grouped).map(([category, items]) => (
                  <Command.Group
                    key={category}
                    heading={CAT_LABEL[category] ?? category}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {items.map((tool) => (
                      <Command.Item
                        key={tool.slug}
                        value={`${tool.name} ${tool.keywords.join(" ")}`}
                        onSelect={() => handleToolSelect(tool.slug)}
                        className="flex cursor-pointer flex-col rounded-md px-3 py-2 aria-selected:bg-muted aria-selected:text-foreground"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {tool.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tool.description}
                        </span>
                      </Command.Item>
                    ))}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Shortcut hints at bottom */}
              <div className="flex items-center justify-between border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                  <span>
                    <kbd className="kbd">↑↓</kbd>{" "}
                    navigate
                  </span>
                  <span>
                    <kbd className="kbd">↵</kbd>{" "}
                    open
                  </span>
                </div>
                <span>
                  <kbd className="kbd">esc</kbd>{" "}
                  close
                </span>
              </div>
            </Command>
          </div>
        </div>
      )}

      {/* Mobile search overlay */}
      {mobileSearchOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-background sm:hidden animate-in fade-in duration-150"
        >
          <div className="flex h-12 items-center gap-2 border-b border-border px-3">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close search"
              onClick={() => setMobileSearchOpen(false)}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Command label="Tool search" className="flex-1" loop>
              <Command.Input
                autoFocus
                placeholder="Search tools..."
                className="h-10 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <Command.List className="absolute top-12 left-0 right-0 bottom-0 overflow-y-auto p-2 bg-background">
                <Command.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                  No tools found.
                </Command.Empty>
                {Object.entries(grouped).map(([category, items]) => (
                  <Command.Group
                    key={category}
                    heading={CAT_LABEL[category] ?? category}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wide [&_[cmdk-group-heading]]:text-muted-foreground"
                  >
                    {items.map((tool) => (
                      <Command.Item
                        key={tool.slug}
                        value={`${tool.name} ${tool.keywords.join(" ")}`}
                        onSelect={() => handleToolSelect(tool.slug)}
                        className="flex cursor-pointer flex-col rounded-md px-3 py-2 aria-selected:bg-muted aria-selected:text-foreground"
                      >
                        <span className="text-sm font-medium text-foreground">
                          {tool.name}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {tool.description}
                        </span>
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
