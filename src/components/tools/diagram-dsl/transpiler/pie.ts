import type { TranspileResult } from "./types";
import { THEME, PALETTE } from "../renderer/theme";
import { measureText, escapeXml } from "../renderer/text";

/**
 * Pie chart DSL → direct SVG
 *
 *   pie
 *
 *   title Browser Market Share
 *   Chrome: 65
 *   Firefox: 12
 *   Safari: 18
 *   Edge: 5
 */

interface Slice {
  label: string;
  value: number;
}

export function transpilePie(lines: string[]): TranspileResult {
  let title = "";
  const slices: Slice[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    const titleMatch = line.match(/^title\s+(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1];
      continue;
    }

    if (line.toLowerCase() === "showdata") continue;

    const sliceMatch = line.match(/^(.+?)\s*:\s*(\d+(?:\.\d+)?)$/);
    if (sliceMatch) {
      slices.push({ label: sliceMatch[1].trim(), value: parseFloat(sliceMatch[2]) });
      continue;
    }

    return { ok: false, error: `Invalid syntax: "${line}" — expected "Label: number"`, line: i + 1 };
  }

  if (slices.length === 0) {
    return { ok: false, error: "Empty diagram — add slices as \"Label: number\"" };
  }

  // Render pie chart SVG
  const cx = 160;
  const cy = 160;
  const r = 120;
  const legendX = cx + r + 50;
  const total = slices.reduce((s, sl) => s + sl.value, 0);

  const svgParts: string[] = [];

  // Title
  const titleY = title ? 28 : 0;
  if (title) {
    svgParts.push(`<text x="${cx}" y="${titleY}" text-anchor="middle" fill="currentColor" font-family="${THEME.font}" font-size="${THEME.fontSize + 2}" font-weight="600">${escapeXml(title)}</text>`);
  }

  const offsetY = title ? 20 : 0;

  // Draw slices
  let startAngle = -Math.PI / 2;
  for (let s = 0; s < slices.length; s++) {
    const slice = slices[s];
    const color = PALETTE[s % PALETTE.length];
    const angle = (slice.value / total) * Math.PI * 2;
    const endAngle = startAngle + angle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle) + offsetY;
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle) + offsetY;
    const largeArc = angle > Math.PI ? 1 : 0;

    if (slices.length === 1) {
      // Full circle
      svgParts.push(`<circle cx="${cx}" cy="${cy + offsetY}" r="${r}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="2" />`);
    } else {
      svgParts.push(`<path d="M${cx},${cy + offsetY} L${x1},${y1} A${r},${r} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color.fill}" stroke="white" stroke-width="2" />`);
    }

    // Percentage label inside slice (for larger slices)
    const pct = Math.round((slice.value / total) * 100);
    if (pct >= 8) {
      const midAngle = startAngle + angle / 2;
      const labelR = r * 0.65;
      const lx = cx + labelR * Math.cos(midAngle);
      const ly = cy + labelR * Math.sin(midAngle) + offsetY;
      svgParts.push(`<text x="${lx}" y="${ly}" text-anchor="middle" dominant-baseline="central" fill="${color.text}" font-family="${THEME.font}" font-size="${THEME.edgeLabelSize}" font-weight="600">${pct}%</text>`);
    }

    startAngle = endAngle;
  }

  // Legend
  const legendStartY = offsetY + 40;
  for (let s = 0; s < slices.length; s++) {
    const slice = slices[s];
    const color = PALETTE[s % PALETTE.length];
    const ly = legendStartY + s * 24;
    const pct = Math.round((slice.value / total) * 100);
    svgParts.push(`<rect x="${legendX}" y="${ly}" width="14" height="14" rx="3" fill="${color.fill}" stroke="${color.stroke}" stroke-width="1" />`);
    svgParts.push(`<text x="${legendX + 22}" y="${ly + 7}" dominant-baseline="central" fill="currentColor" font-family="${THEME.font}" font-size="${THEME.edgeLabelSize}">${escapeXml(slice.label)} (${pct}%)</text>`);
  }

  // Compute dimensions
  const maxLegendLabel = slices.reduce(
    (max, sl) => Math.max(max, measureText(`${sl.label} (100%)`, THEME.edgeLabelSize)),
    0
  );
  const svgWidth = legendX + 22 + maxLegendLabel + 30;
  const svgHeight = Math.max(cy * 2 + offsetY + 30, legendStartY + slices.length * 24 + 20);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="font-family: ${THEME.font}">\n${svgParts.join("\n")}\n</svg>`;

  return { ok: true, svg, type: "pie" };
}
