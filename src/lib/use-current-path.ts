import { useEffect, useState } from "react";

/**
 * Reactive current pathname for persisted islands.
 *
 * With Astro's ClientRouter + `transition:persist`, layout islands keep their
 * original props across page swaps, so a static `currentPath` prop goes stale.
 * This hook reads the live path from `window.location` and re-syncs on every
 * `astro:page-load` (fired after each swap and on the initial load).
 */
export function useCurrentPath(initial: string) {
  const [path, setPath] = useState(initial);

  useEffect(() => {
    const sync = () => setPath(window.location.pathname);
    sync(); // sync immediately after hydrate
    document.addEventListener("astro:page-load", sync);
    return () => document.removeEventListener("astro:page-load", sync);
  }, []);

  return path;
}
