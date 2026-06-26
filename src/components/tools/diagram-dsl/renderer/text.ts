import { THEME } from "./theme";

/**
 * Text measurement using canvas 2D context.
 * Falls back to character-width estimation if canvas unavailable (SSR).
 */

let measureCtx: CanvasRenderingContext2D | null = null;

function getContext(): CanvasRenderingContext2D | null {
  if (measureCtx) return measureCtx;
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  measureCtx = canvas.getContext("2d");
  return measureCtx;
}

export function measureText(text: string, fontSize = THEME.fontSize, fontWeight = THEME.fontWeight): number {
  const ctx = getContext();
  if (ctx) {
    ctx.font = `${fontWeight} ${fontSize}px ${THEME.font}`;
    return ctx.measureText(text).width;
  }
  // Fallback: average char width ~7px at 13px font
  return text.length * fontSize * 0.55;
}

export function measureTextHeight(fontSize = THEME.fontSize): number {
  return fontSize * 1.4;
}

/**
 * Wrap text to fit within maxWidth. Returns array of lines.
 */
export function wrapText(text: string, maxWidth: number, fontSize = THEME.fontSize): string[] {
  const words = text.split(/\s+/);
  if (words.length === 0) return [""];

  const lines: string[] = [];
  let currentLine = words[0];

  for (let i = 1; i < words.length; i++) {
    const test = currentLine + " " + words[i];
    if (measureText(test, fontSize) <= maxWidth) {
      currentLine = test;
    } else {
      lines.push(currentLine);
      currentLine = words[i];
    }
  }
  lines.push(currentLine);
  return lines;
}

/**
 * Escape special XML characters for safe SVG text content.
 */
export function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
