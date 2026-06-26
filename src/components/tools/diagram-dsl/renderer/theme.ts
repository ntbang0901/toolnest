/**
 * Eraser.io-inspired theme for diagram rendering.
 * Soft pastels, clean lines, modern sans-serif.
 */

export interface NodeColor {
  fill: string;
  stroke: string;
  text: string;
}

export const PALETTE: NodeColor[] = [
  { fill: "#E8F0FE", stroke: "#4285F4", text: "#1A73E8" }, // blue
  { fill: "#E6F4EA", stroke: "#34A853", text: "#137333" }, // green
  { fill: "#F3E8FD", stroke: "#A142F4", text: "#7627BB" }, // purple
  { fill: "#FEF3E8", stroke: "#FA7B17", text: "#C5510C" }, // orange
  { fill: "#FCE8EC", stroke: "#EA4335", text: "#C5221F" }, // pink
  { fill: "#E8F5E9", stroke: "#2E7D32", text: "#1B5E20" }, // forest
  { fill: "#FFF3E0", stroke: "#F57C00", text: "#E65100" }, // amber
  { fill: "#E3F2FD", stroke: "#1976D2", text: "#0D47A1" }, // navy
];

export const DARK_PALETTE: NodeColor[] = [
  { fill: "#1E3A5F", stroke: "#64B5F6", text: "#90CAF9" },
  { fill: "#1B3D2F", stroke: "#66BB6A", text: "#A5D6A7" },
  { fill: "#2E1A47", stroke: "#AB47BC", text: "#CE93D8" },
  { fill: "#3E2723", stroke: "#FF8A65", text: "#FFAB91" },
  { fill: "#3C1A1A", stroke: "#EF5350", text: "#EF9A9A" },
  { fill: "#1B3D2F", stroke: "#4CAF50", text: "#81C784" },
  { fill: "#3E2C1A", stroke: "#FFA726", text: "#FFCC80" },
  { fill: "#1A2E4A", stroke: "#42A5F5", text: "#90CAF9" },
];

export const THEME = {
  font: "Inter, ui-sans-serif, system-ui, sans-serif",
  fontSize: 13,
  fontWeight: 500,
  edgeLabelSize: 11,
  nodePadding: { x: 20, y: 12 },
  nodeRadius: 8,
  nodeStrokeWidth: 1.5,
  edgeColor: "#94A3B8",
  edgeColorDark: "#64748B",
  edgeWidth: 1.5,
  edgeDash: "6 4",
  arrowSize: 7,
  nodesep: 50,
  ranksep: 80,
  svgPadding: 40,
} as const;

/** Special color for terminal/start/end nodes */
const TERMINAL_COLOR: NodeColor = { fill: "#334155", stroke: "#1E293B", text: "#FFFFFF" };
const TERMINAL_COLOR_DARK: NodeColor = { fill: "#CBD5E1", stroke: "#94A3B8", text: "#0F172A" };

export function getNodeColor(index: number, dark = false): NodeColor {
  if (index < 0) return dark ? TERMINAL_COLOR_DARK : TERMINAL_COLOR;
  const palette = dark ? DARK_PALETTE : PALETTE;
  return palette[index % palette.length];
}
