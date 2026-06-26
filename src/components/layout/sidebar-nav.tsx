import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  Star,
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { categories, tools, type ToolCategory } from "@/lib/tools-registry";
import { useCurrentPath } from "@/lib/use-current-path";

interface Props {
  currentPath: string;
}

const STORAGE_KEYS = {
  collapsed: "sidebar-collapsed",
  favorites: "favorite-tools",
  categoryState: "sidebar-categories",
  width: "sidebar-width",
} as const;

const DEFAULT_WIDTH = 240;
const MIN_WIDTH = 200;
const MAX_WIDTH = 360;
const COLLAPSED_WIDTH = 56;

function useLocalStorage<T>(key: string, defaultValue: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      return stored ? JSON.parse(stored) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);

  return [value, setValue];
}

export default function SidebarNav({ currentPath: currentPathProp }: Props) {
  const currentPath = useCurrentPath(currentPathProp);
  const [collapsed, setCollapsed] = useLocalStorage(STORAGE_KEYS.collapsed, false);
  const [favorites, setFavorites] = useLocalStorage<string[]>(STORAGE_KEYS.favorites, []);
  const [categoryState, setCategoryState] = useLocalStorage<Record<string, boolean>>(
    STORAGE_KEYS.categoryState,
    {}
  );
  const [sidebarWidth, setSidebarWidth] = useLocalStorage(STORAGE_KEYS.width, DEFAULT_WIDTH);
  const [isResizing, setIsResizing] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const sidebarRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const activeToolRef = useRef<HTMLAnchorElement>(null);
  const resizeStartX = useRef(0);
  const resizeStartWidth = useRef(0);

  useEffect(() => {
    setHydrated(true);
  }, []);

  // Scroll active tool into view once on initial mount only — never on client-side
  // navigation. The sidebar island persists across page swaps (transition:persist),
  // so on a click the active item is already in view; re-scrolling it on every
  // currentPath change is what makes the sidebar visibly jump. We only need this on
  // first load / refresh / deep-link, where the active tool may be below the fold.
  useEffect(() => {
    const el = activeToolRef.current;
    const nav = navRef.current;
    if (!el || !nav) return;
    const elRect = el.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    if (elRect.top < navRect.top + 4) {
      nav.scrollTop += elRect.top - navRect.top - 8;
    } else if (elRect.bottom > navRect.bottom - 4) {
      nav.scrollTop += elRect.bottom - navRect.bottom + 8;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Preserve the sidebar's internal scroll across view-transition navigations.
  // Even with transition:persist, Astro detaches and reattaches the persisted
  // island during a swap, which resets the scroll container's scrollTop to 0 —
  // that reset is the visible "jump" on every click. We snapshot scrollTop right
  // before the swap and restore it right after the new DOM is in place.
  useEffect(() => {
    const KEY = "sidebar-scroll";
    const save = () => {
      if (navRef.current) sessionStorage.setItem(KEY, String(navRef.current.scrollTop));
    };
    const restore = () => {
      const saved = sessionStorage.getItem(KEY);
      if (navRef.current && saved != null) navRef.current.scrollTop = parseInt(saved, 10);
    };
    document.addEventListener("astro:before-swap", save);
    document.addEventListener("astro:after-swap", restore);
    return () => {
      document.removeEventListener("astro:before-swap", save);
      document.removeEventListener("astro:after-swap", restore);
    };
  }, []);

  // Listen for sidebar-toggle custom event (from header button)
  useEffect(() => {
    const handler = () => setCollapsed((prev) => !prev);
    window.addEventListener("sidebar-toggle", handler);
    return () => window.removeEventListener("sidebar-toggle", handler);
  }, [setCollapsed]);

  // Keyboard shortcut: [ to toggle, ] to expand
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement ||
        (active instanceof HTMLElement && !!active.closest('[contenteditable]')) ||
        !!document.querySelector('.cm-editor:focus-within')
      ) {
        return;
      }

      if (e.key === "[" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setCollapsed((prev) => !prev);
      } else if (e.key === "]" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setCollapsed(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [setCollapsed]);

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      if (collapsed) return;
      e.preventDefault();
      setIsResizing(true);
      resizeStartX.current = e.clientX;
      resizeStartWidth.current = sidebarWidth;
    },
    [collapsed, sidebarWidth]
  );

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - resizeStartX.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, resizeStartWidth.current + delta));
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  const handleResizeDoubleClick = useCallback(() => {
    setSidebarWidth(DEFAULT_WIDTH);
  }, [setSidebarWidth]);

  // Toggle favorite
  const toggleFavorite = useCallback(
    (slug: string) => {
      setFavorites((prev) =>
        prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
      );
    },
    [setFavorites]
  );

  // Toggle category
  const toggleCategory = useCallback(
    (id: string) => {
      setCategoryState((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    [setCategoryState]
  );

  const isCategoryCollapsed = (id: string) => categoryState[id] ?? false;

  // Group tools by category
  const grouped = categories
    .map((cat) => ({ ...cat, items: tools.filter((t) => t.category === cat.id) }))
    .filter((c) => c.items.length > 0);

  // Favorite tools (resolved)
  const favoriteTools = favorites
    .map((slug) => tools.find((t) => t.slug === slug))
    .filter(Boolean) as typeof tools;

  const width = collapsed ? COLLAPSED_WIDTH : sidebarWidth;

  return (
    <aside
      ref={sidebarRef}
      data-sidebar-wrapper=""
      className={cn(
        "hidden lg:flex shrink-0 relative group/sidebar",
        hydrated && "transition-[width] duration-200 ease-[cubic-bezier(0.4,0,0.2,1)]"
      )}
      style={{ width: hydrated ? width : undefined }}
    >
      <div
        className="flex flex-col h-[calc(100vh-3rem)] sticky top-12 w-full border-r border-border bg-background overflow-hidden"
      >
        {/* Toggle button */}
        <div className={cn("flex items-center border-b border-border shrink-0", collapsed ? "justify-center h-11" : "justify-between h-11 px-3")}>
          {!collapsed && (
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground/60 truncate">
              Tools
            </span>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="flex items-center justify-center h-7 w-7 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            title={collapsed ? "Expand sidebar (])" : "Collapse sidebar ([)"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Scrollable content */}
        <nav ref={navRef} className="flex-1 overflow-y-auto overflow-x-hidden py-2 sidebar-nav" style={{scrollbarWidth: 'none', msOverflowStyle: 'none'}}>
          {/* Favorites */}
          {favoriteTools.length > 0 && (
            <Section title="Favorites" collapsed={collapsed}>
              {favoriteTools.map((tool) => (
                <ToolLink
                  key={tool.slug}
                  tool={tool}
                  currentPath={currentPath}
                  collapsed={collapsed}
                  isFavorite
                  onToggleFavorite={toggleFavorite}
                  activeRef={activeToolRef}
                />
              ))}
            </Section>
          )}

          {/* Categories */}
          {grouped.map((cat) => (
            <CategorySection
              key={cat.id}
              category={cat}
              collapsed={collapsed}
              isCategoryCollapsed={isCategoryCollapsed(cat.id)}
              onToggleCategory={() => toggleCategory(cat.id)}
              currentPath={currentPath}
              favorites={favorites}
              onToggleFavorite={toggleFavorite}
              activeRef={activeToolRef}
            />
          ))}
        </nav>
      </div>

      {/* Resize handle */}
      {!collapsed && (
        <div
          className={cn(
            "absolute top-0 right-0 w-1 h-full cursor-col-resize z-10 transition-colors duration-75",
            isResizing
              ? "bg-border"
              : "bg-transparent hover:bg-border"
          )}
          onMouseDown={handleResizeStart}
          onDoubleClick={handleResizeDoubleClick}
          title="Drag to resize. Double-click to reset."
        />
      )}
    </aside>
  );
}

// Section wrapper with title
function Section({
  title,
  collapsed,
  children,
}: {
  title: string;
  collapsed: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mb-2">
      {!collapsed && (
        <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
          {title}
        </div>
      )}
      <ul className={cn("flex flex-col", collapsed ? "items-center gap-0.5 px-1" : "gap-0.5 px-2")}>
        {children}
      </ul>
      <div className="mx-3 mt-2 border-b border-border/50" />
    </div>
  );
}

// Category accordion section
function CategorySection({
  category,
  collapsed,
  isCategoryCollapsed,
  onToggleCategory,
  currentPath,
  favorites,
  onToggleFavorite,
  activeRef,
}: {
  category: { id: ToolCategory; label: string; items: typeof tools };
  collapsed: boolean;
  isCategoryCollapsed: boolean;
  onToggleCategory: () => void;
  currentPath: string;
  favorites: string[];
  onToggleFavorite: (slug: string) => void;
  activeRef: React.RefObject<HTMLAnchorElement | null>;
}) {
  const hasActiveTool = category.items.some((t) => currentPath === `/tools/${t.slug}`);

  if (collapsed) {
    // Collapsed: show first tool's icon as category representation with count badge
    const CatIcon = category.items[0]?.icon;
    return (
      <div className="flex flex-col items-center my-1 relative group/cat">
        <button
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-md transition-colors relative",
            hasActiveTool
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title={`${category.label} (${category.items.length})`}
          aria-label={category.label}
        >
          {CatIcon && <CatIcon className="h-4 w-4" />}
          <span className="absolute -top-0.5 -right-0.5 text-[9px] font-medium bg-muted text-muted-foreground rounded-full h-3.5 min-w-3.5 flex items-center justify-center px-0.5">
            {category.items.length}
          </span>
        </button>

        {/* Flyout menu on hover */}
        <div className="absolute left-full top-0 ml-1 hidden group-hover/cat:block z-50 animate-in fade-in slide-in-from-left-1 duration-100">
          <div className="bg-popover border border-border rounded-lg shadow-lg p-2 min-w-[180px]">
            <div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
              {category.label}
            </div>
            {category.items.map((tool) => {
              const href = `/tools/${tool.slug}`;
              const active = currentPath === href;
              const Icon = tool.icon;
              return (
                <a
                  key={tool.slug}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{tool.name}</span>
                </a>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-1">
      <button
        onClick={onToggleCategory}
        className="flex items-center w-full px-3 py-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50 hover:text-muted-foreground transition-colors"
        aria-expanded={!isCategoryCollapsed}
      >
        <ChevronDown
          className={cn(
            "h-3 w-3 mr-1 transition-transform duration-150",
            isCategoryCollapsed && "-rotate-90"
          )}
        />
        <span className="truncate">{category.label}</span>
        <span className="ml-auto text-[9px] bg-muted/60 text-muted-foreground/70 rounded-full px-1.5 py-0.5 font-medium">
          {category.items.length}
        </span>
      </button>

      <div
        className={cn(
          "overflow-hidden transition-all duration-150 ease-out",
          isCategoryCollapsed ? "max-h-0 opacity-0" : "max-h-[2000px] opacity-100"
        )}
      >
        <ul className="flex flex-col gap-0.5 px-2">
          {category.items.map((tool) => (
            <ToolLink
              key={tool.slug}
              tool={tool}
              currentPath={currentPath}
              collapsed={collapsed}
              isFavorite={favorites.includes(tool.slug)}
              onToggleFavorite={onToggleFavorite}
              activeRef={activeRef}
            />
          ))}
        </ul>
      </div>
    </div>
  );
}

// Individual tool link
function ToolLink({
  tool,
  currentPath,
  collapsed,
  isFavorite,
  onToggleFavorite,
  activeRef,
}: {
  tool: (typeof tools)[number];
  currentPath: string;
  collapsed: boolean;
  isFavorite: boolean;
  onToggleFavorite: (slug: string) => void;
  activeRef: React.RefObject<HTMLAnchorElement | null>;
}) {
  const href = `/tools/${tool.slug}`;
  const active = currentPath === href;
  const Icon = tool.icon;

  if (collapsed) {
    return (
      <li>
        <a
          ref={active ? activeRef : undefined}
          href={href}
          className={cn(
            "flex items-center justify-center h-9 w-9 rounded-md transition-colors relative",
            active
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
          title={tool.name}
          aria-label={tool.name}
          aria-current={active ? "page" : undefined}
        >
          <Icon className="h-4 w-4" />
          {active && (
            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full animate-in slide-in-from-left duration-120" />
          )}
        </a>
      </li>
    );
  }

  return (
    <li className="relative group/tool">
      <a
        ref={active ? activeRef : undefined}
        href={href}
        className={cn(
          "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm transition-all relative",
          active
            ? "bg-primary/10 text-primary font-medium"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
        aria-current={active ? "page" : undefined}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full animate-in slide-in-from-left duration-120" />
        )}
        <Icon className="h-4 w-4 shrink-0" />
        <span className="truncate">{tool.name}</span>
      </a>

      {/* Favorite star button - visible on hover */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleFavorite(tool.slug);
        }}
        className={cn(
          "absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-md transition-all",
          isFavorite
            ? "text-favorite opacity-100"
            : "text-muted-foreground/40 opacity-0 group-hover/tool:opacity-100 hover:text-favorite"
        )}
        title={isFavorite ? "Remove from favorites" : "Add to favorites"}
        aria-label={isFavorite ? `Remove ${tool.name} from favorites` : `Add ${tool.name} to favorites`}
      >
        <Star
          className={cn("h-3.5 w-3.5 transition-transform", isFavorite && "fill-current scale-110")}
        />
      </button>
    </li>
  );
}
