import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useKeyboardShortcuts } from "@/lib/use-keyboard-shortcuts";

interface LayoutContextValue {
  sidebarOpen: boolean;
  sidebarWidth: number;
  toggleSidebar: () => void;
  setSidebarWidth: (w: number) => void;
}

const LayoutContext = createContext<LayoutContextValue>({
  sidebarOpen: true,
  sidebarWidth: 240,
  toggleSidebar: () => {},
  setSidebarWidth: () => {},
});

export function useLayout() {
  return useContext(LayoutContext);
}

const SIDEBAR_OPEN_KEY = "sidebar-collapsed";
const SIDEBAR_WIDTH_KEY = "sidebar-width";

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = localStorage.getItem(SIDEBAR_OPEN_KEY);
      // Key stores "collapsed" state, invert for "open"
      return stored ? !JSON.parse(stored) : true;
    } catch {
      return true;
    }
  });

  const [sidebarWidth, setSidebarWidthState] = useState(() => {
    if (typeof window === "undefined") return 240;
    try {
      const stored = localStorage.getItem(SIDEBAR_WIDTH_KEY);
      return stored ? JSON.parse(stored) : 240;
    } catch {
      return 240;
    }
  });

  const toggleSidebar = useCallback(() => {
    setSidebarOpen((prev) => {
      const next = !prev;
      localStorage.setItem(SIDEBAR_OPEN_KEY, JSON.stringify(!next));
      return next;
    });
  }, []);

  const setSidebarWidth = useCallback((w: number) => {
    setSidebarWidthState(w);
    localStorage.setItem(SIDEBAR_WIDTH_KEY, JSON.stringify(w));
  }, []);

  // Listen for sidebar-toggle custom events from header/keyboard shortcuts
  useEffect(() => {
    const handler = () => toggleSidebar();
    window.addEventListener("sidebar-toggle", handler);
    return () => window.removeEventListener("sidebar-toggle", handler);
  }, [toggleSidebar]);

  // Register global keyboard shortcuts
  useKeyboardShortcuts();

  const value: LayoutContextValue = {
    sidebarOpen,
    sidebarWidth,
    toggleSidebar,
    setSidebarWidth,
  };

  return (
    <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
  );
}
