import { createContext } from "react";

export interface HoverColumn {
  tableId: string;
  column: string;
}

export interface HighlightState {
  // tables that should appear "active" (full opacity + outline)
  activeTables: Set<string>;
  // edges that should appear "active"
  activeEdges: Set<string>;
  // per-table column names to highlight (for FK partner hover)
  columnHighlights: Map<string, Set<string>>;
  // any active intent at all? false → render everything normal
  hasFocus: boolean;
}

export const EMPTY_HIGHLIGHT: HighlightState = {
  activeTables: new Set(),
  activeEdges: new Set(),
  columnHighlights: new Map(),
  hasFocus: false,
};

export const HighlightContext = createContext<HighlightState>(EMPTY_HIGHLIGHT);

export interface HoverColumnApi {
  hovered: HoverColumn | null;
  setHovered: (h: HoverColumn | null) => void;
}

export const HoverColumnContext = createContext<HoverColumnApi>({
  hovered: null,
  setHovered: () => {},
});
