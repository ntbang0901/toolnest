import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "favorite-tools";
const MAX_FAVORITES = 12;

function readFavorites(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed.filter((s) => typeof s === "string");
    return [];
  } catch {
    return [];
  }
}

function writeFavorites(favorites: string[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(readFavorites);

  // Sync state to localStorage and dispatch event
  const persist = useCallback((next: string[]) => {
    writeFavorites(next);
    setFavorites(next);
    window.dispatchEvent(new CustomEvent("favorites-changed", { detail: next }));
  }, []);

  const isFavorite = useCallback(
    (slug: string) => favorites.includes(slug),
    [favorites],
  );

  const addFavorite = useCallback(
    (slug: string) => {
      const current = readFavorites();
      if (current.includes(slug)) return;
      let next = [...current, slug];
      // Drop oldest if exceeding max
      if (next.length > MAX_FAVORITES) {
        next = next.slice(next.length - MAX_FAVORITES);
      }
      persist(next);
    },
    [persist],
  );

  const removeFavorite = useCallback(
    (slug: string) => {
      const current = readFavorites();
      if (!current.includes(slug)) return;
      persist(current.filter((s) => s !== slug));
    },
    [persist],
  );

  const toggleFavorite = useCallback(
    (slug: string) => {
      if (readFavorites().includes(slug)) {
        removeFavorite(slug);
      } else {
        addFavorite(slug);
      }
    },
    [addFavorite, removeFavorite],
  );

  // Listen for favorites-changed from other component instances
  useEffect(() => {
    const onFavoritesChanged = (e: Event) => {
      const detail = (e as CustomEvent<string[]>).detail;
      if (Array.isArray(detail)) {
        setFavorites(detail);
      }
    };
    window.addEventListener("favorites-changed", onFavoritesChanged);
    return () =>
      window.removeEventListener("favorites-changed", onFavoritesChanged);
  }, []);

  // Cross-tab sync via storage event
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setFavorites(readFavorites());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Listen for toggle-favorite custom event (from keyboard shortcuts)
  useEffect(() => {
    const onToggle = (e: Event) => {
      const slug = (e as CustomEvent<string>).detail;
      if (typeof slug === "string" && slug) {
        toggleFavorite(slug);
      }
    };
    window.addEventListener("toggle-favorite", onToggle);
    return () => window.removeEventListener("toggle-favorite", onToggle);
  }, [toggleFavorite]);

  return { favorites, isFavorite, toggleFavorite, addFavorite, removeFavorite };
}
