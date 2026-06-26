import type { NodeColor } from "./theme";
import { THEME } from "./theme";
import { escapeXml, measureText, measureTextHeight } from "./text";

export type ShapeType = "rect" | "diamond" | "rounded" | "circle" | "stadium" | "cylinder";

interface ShapeOptions {
  x: number;
  y: number;
  width: number;
  height: number;
  color: NodeColor;
  label: string;
  shape: ShapeType;
}

/**
 * Render multiline text as SVG <text> with <tspan> elements.
 */
function renderText(x: number, y: number, label: string, color: string, fontSize = THEME.fontSize, fontWeight = THEME.fontWeight): string {
  const lines = label.split("\n");
  const lineHeight = measureTextHeight(fontSize);

  if (lines.length === 1) {
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" fill="${color}" font-family="${THEME.font}" font-size="${fontSize}" font-weight="${fontWeight}">${escapeXml(label)}</text>`;
  }

  // Multiline: position first line so block is vertically centered
  const totalHeight = lines.length * lineHeight;
  const startY = y - totalHeight / 2 + lineHeight / 2;

  const tspans = lines.map((line, i) => {
    const ly = startY + i * lineHeight;
    // First line bold (header), rest normal
    const weight = i === 0 ? "600" : "400";
    const size = i === 0 ? fontSize + 1 : fontSize - 1;
    return `<tspan x="${x}" y="${ly}" font-weight="${weight}" font-size="${size}">${escapeXml(line)}</tspan>`;
  }).join("");

  return `<text text-anchor="middle" dominant-baseline="central" fill="${color}" font-family="${THEME.font}">${tspans}</text>`;
}

/**
 * Generate SVG for a node shape with label text.
 * x,y is the center of the node.
 */
export function renderShape(opts: ShapeOptions): string {
  const { x, y, width, height, color, label, shape } = opts;
  const halfW = width / 2;
  const halfH = height / 2;

  let shapeSvg: string;

  switch (shape) {
    case "diamond": {
      const points = `${x},${y - halfH} ${x + halfW},${y} ${x},${y + halfH} ${x - halfW},${y}`;
      shapeSvg = `<polygon points="${points}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="${THEME.nodeStrokeWidth}" />`;
      break;
    }

    case "circle": {
      const r = Math.max(halfW, halfH);
      shapeSvg = `<circle cx="${x}" cy="${y}" r="${r}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="${THEME.nodeStrokeWidth}" />`;
      break;
    }

    case "stadium":
      shapeSvg = `<rect x="${x - halfW}" y="${y - halfH}" width="${width}" height="${height}" rx="${halfH}" ry="${halfH}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="${THEME.nodeStrokeWidth}" />`;
      break;

    case "cylinder": {
      const ry = Math.min(8, height * 0.15);
      const top = y - halfH;
      const bottom = y + halfH;
      shapeSvg = [
        `<path d="M${x - halfW},${top + ry} Q${x - halfW},${top} ${x},${top} Q${x + halfW},${top} ${x + halfW},${top + ry} L${x + halfW},${bottom - ry} Q${x + halfW},${bottom} ${x},${bottom} Q${x - halfW},${bottom} ${x - halfW},${bottom - ry} Z" fill="${color.fill}" stroke="${color.stroke}" stroke-width="${THEME.nodeStrokeWidth}" />`,
        `<path d="M${x - halfW},${top + ry} Q${x - halfW},${top + ry * 2} ${x},${top + ry * 2} Q${x + halfW},${top + ry * 2} ${x + halfW},${top + ry}" fill="none" stroke="${color.stroke}" stroke-width="${THEME.nodeStrokeWidth * 0.7}" opacity="0.5" />`,
      ].join("");
      break;
    }

    case "rounded":
      shapeSvg = `<rect x="${x - halfW}" y="${y - halfH}" width="${width}" height="${height}" rx="${THEME.nodeRadius * 2}" ry="${THEME.nodeRadius * 2}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="${THEME.nodeStrokeWidth}" />`;
      break;

    case "rect":
    default:
      shapeSvg = `<rect x="${x - halfW}" y="${y - halfH}" width="${width}" height="${height}" rx="${THEME.nodeRadius}" ry="${THEME.nodeRadius}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="${THEME.nodeStrokeWidth}" />`;
      break;
  }

  const textSvg = renderText(x, y, label, color.text);

  return `<g class="node">${shapeSvg}${textSvg}</g>`;
}
