import { useEffect, useCallback } from "react";

export interface KeyboardShortcutsConfig {
  search?: boolean;
  sidebarToggle?: boolean;
  favoriteToggle?: boolean;
  sidebarNavigation?: boolean;
  showShortcuts?: boolean;
  escape?: boolean;
}

const DEFAULT_CONFIG: KeyboardShortcutsConfig = {
  search: true,
  sidebarToggle: true,
  favoriteToggle: true,
  sidebarNavigation: true,
  showShortcuts: true,
  escape: true,
};

function isEditableTarget(target: EventTarget | null): boolean {
  if (!target || !(target instanceof HTMLElement)) return false;
  const tag = target.tagName.toLowerCase();
  if (tag === "input" || tag === "textarea" || tag === "select") return true;
  if (target.isContentEditable) return true;
  return false;
}

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  return /mac|iphone|ipad|ipod/i.test(navigator.userAgent);
}

function getSlugFromPath(): string {
  const path = window.location.pathname;
  const match = path.match(/\/tools\/([^/]+)/);
  return match?.[1] ?? "";
}

export function useKeyboardShortcuts(config: KeyboardShortcutsConfig = {}) {
  const opts = { ...DEFAULT_CONFIG, ...config };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const mod = isMac() ? e.metaKey : e.ctrlKey;
      const editable = isEditableTarget(e.target);

      // Escape: close any open overlay
      if (opts.escape && e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("close-overlay"));
        return;
      }

      // Don't handle other shortcuts when focused on editable elements
      if (editable) return;

      // ⌘K / Ctrl+K: Open search
      if (opts.search && mod && e.key.toLowerCase() === "k") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("open-search"));
        return;
      }

      // ⌘B / Ctrl+B: Toggle sidebar
      if (opts.sidebarToggle && mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("sidebar-toggle"));
        return;
      }

      // ⌘+Shift+F / Ctrl+Shift+F: Toggle favorite
      if (
        opts.favoriteToggle &&
        mod &&
        e.shiftKey &&
        e.key.toLowerCase() === "f"
      ) {
        e.preventDefault();
        const slug = getSlugFromPath();
        if (slug) {
          window.dispatchEvent(
            new CustomEvent("toggle-favorite", { detail: slug }),
          );
        }
        return;
      }

      // [ or ]: Toggle sidebar
      if (opts.sidebarToggle && (e.key === "[" || e.key === "]")) {
        window.dispatchEvent(new CustomEvent("sidebar-toggle"));
        return;
      }

      // ?: Show keyboard shortcuts overlay
      if (opts.showShortcuts && e.key === "?") {
        window.dispatchEvent(new CustomEvent("show-shortcuts"));
        return;
      }

      // Arrow keys: navigate sidebar tools when sidebar is focused
      if (opts.sidebarNavigation) {
        const sidebar = document.querySelector("[data-sidebar]");
        if (!sidebar?.contains(document.activeElement)) return;

        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          const items = sidebar.querySelectorAll<HTMLElement>(
            "[data-tool-link]",
          );
          if (!items.length) return;

          const current = Array.from(items).findIndex(
            (el) => el === document.activeElement,
          );

          let next: number;
          if (e.key === "ArrowDown") {
            next = current < items.length - 1 ? current + 1 : 0;
          } else {
            next = current > 0 ? current - 1 : items.length - 1;
          }

          items[next]?.focus();
          return;
        }

        // Enter: navigate to focused tool
        if (e.key === "Enter") {
          const focused = document.activeElement as HTMLAnchorElement | null;
          if (focused?.dataset.toolLink !== undefined && focused.href) {
            window.location.href = focused.href;
          }
        }
      }
    },
    [opts],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}
