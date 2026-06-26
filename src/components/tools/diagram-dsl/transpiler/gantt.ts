import type { TranspileResult } from "./types";
import { THEME, PALETTE } from "../renderer/theme";
import { measureText, escapeXml } from "../renderer/text";

/**
 * Gantt chart DSL → direct SVG (timeline layout)
 *
 *   gantt
 *
 *   title Project Plan
 *   dateFormat YYYY-MM-DD
 *
 *   section Design
 *     Research: done, 2026-01-01, 14d
 *     Wireframes: active, 2026-01-15, 7d
 *
 *   section Development
 *     Backend: 2026-01-22, 21d
 */

interface GanttTask {
  name: string;
  status: "done" | "active" | "pending";
  start: Date;
  duration: number; // days
  section: string;
}

function parseDate(str: string): Date | null {
  const m = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(parseInt(m[1]), parseInt(m[2]) - 1, parseInt(m[3]));
}

function parseDuration(str: string): number {
  const m = str.match(/^(\d+)d$/);
  if (m) return parseInt(m[1]);
  return 0;
}

function daysBetween(a: Date, b: Date): number {
  return Math.ceil((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

const GANTT_THEME = {
  leftMargin: 40,
  rowHeight: 32,
  barHeight: 20,
  sectionHeight: 28,
  headerHeight: 40,
  dayWidth: 4,
  maxWidth: 800,
  labelWidth: 150,
};

export function transpileGantt(lines: string[]): TranspileResult {
  let title = "";
  let currentSection = "";
  const tasks: GanttTask[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    const titleMatch = line.match(/^title\s+(.+)$/i);
    if (titleMatch) {
      title = titleMatch[1];
      continue;
    }

    // Skip dateFormat, axisFormat, excludes
    if (/^(dateFormat|axisFormat|excludes)\s+/i.test(line)) continue;

    const sectionMatch = line.match(/^section\s+(.+)$/i);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    // Task: Name: [status,] start, duration
    const taskMatch = line.match(/^(.+?)\s*:\s*(.+)$/);
    if (taskMatch) {
      const name = taskMatch[1].trim();
      const parts = taskMatch[2].split(",").map((p) => p.trim());

      let status: "done" | "active" | "pending" = "pending";
      let startStr = "";
      let durationStr = "";

      if (parts.length === 3) {
        if (parts[0] === "done") status = "done";
        else if (parts[0] === "active") status = "active";
        startStr = parts[1];
        durationStr = parts[2];
      } else if (parts.length === 2) {
        startStr = parts[0];
        durationStr = parts[1];
      } else {
        continue; // Skip malformed tasks
      }

      const start = parseDate(startStr);
      const duration = parseDuration(durationStr);
      if (!start || !duration) continue;

      tasks.push({ name, status, start, duration, section: currentSection });
      continue;
    }

    return { ok: false, error: `Invalid syntax: "${line}"`, line: i + 1 };
  }

  if (tasks.length === 0) {
    return { ok: false, error: "Empty diagram — add sections and tasks" };
  }

  // Calculate timeline bounds
  const minDate = new Date(Math.min(...tasks.map((t) => t.start.getTime())));
  const maxDate = new Date(Math.max(...tasks.map((t) => t.start.getTime() + t.duration * 86400000)));
  const totalDays = daysBetween(minDate, maxDate);
  const dayWidth = Math.min(GANTT_THEME.dayWidth, GANTT_THEME.maxWidth / totalDays);
  const chartWidth = totalDays * dayWidth;

  // Layout
  const labelWidth = GANTT_THEME.labelWidth;
  const totalWidth = labelWidth + chartWidth + GANTT_THEME.leftMargin * 2;
  let currentY = title ? GANTT_THEME.headerHeight + 10 : 20;

  const svgParts: string[] = [];

  // Title
  if (title) {
    svgParts.push(`<text x="${totalWidth / 2}" y="24" text-anchor="middle" fill="currentColor" font-family="${THEME.font}" font-size="${THEME.fontSize + 2}" font-weight="600">${escapeXml(title)}</text>`);
  }

  // Group tasks by section
  let lastSection = "";
  let sectionColorIdx = 0;

  for (const task of tasks) {
    // Section header
    if (task.section && task.section !== lastSection) {
      lastSection = task.section;
      currentY += 6;
      svgParts.push(`<text x="${GANTT_THEME.leftMargin}" y="${currentY + GANTT_THEME.sectionHeight / 2}" dominant-baseline="central" fill="currentColor" font-family="${THEME.font}" font-size="${THEME.fontSize}" font-weight="600">${escapeXml(task.section)}</text>`);
      currentY += GANTT_THEME.sectionHeight;
      sectionColorIdx++;
    }

    const color = PALETTE[sectionColorIdx % PALETTE.length];
    const taskStartDay = daysBetween(minDate, task.start);
    const barX = labelWidth + GANTT_THEME.leftMargin + taskStartDay * dayWidth;
    const barW = Math.max(task.duration * dayWidth, 4);
    const barY = currentY + (GANTT_THEME.rowHeight - GANTT_THEME.barHeight) / 2;

    // Task label
    svgParts.push(`<text x="${GANTT_THEME.leftMargin + 12}" y="${currentY + GANTT_THEME.rowHeight / 2}" dominant-baseline="central" fill="currentColor" font-family="${THEME.font}" font-size="${THEME.edgeLabelSize}">${escapeXml(task.name)}</text>`);

    // Bar
    let barFill = color.fill;
    let barStroke = color.stroke;
    let opacity = "1";
    if (task.status === "done") {
      barFill = color.stroke;
      barStroke = color.stroke;
      opacity = "0.7";
    } else if (task.status === "active") {
      // Striped pattern — use solid with higher opacity
      barFill = color.fill;
      opacity = "1";
    }

    svgParts.push(`<rect x="${barX}" y="${barY}" width="${barW}" height="${GANTT_THEME.barHeight}" rx="4" fill="${barFill}" stroke="${barStroke}" stroke-width="1" opacity="${opacity}" />`);

    // Status indicator
    if (task.status === "done") {
      svgParts.push(`<text x="${barX + barW / 2}" y="${barY + GANTT_THEME.barHeight / 2}" text-anchor="middle" dominant-baseline="central" fill="white" font-family="${THEME.font}" font-size="${THEME.edgeLabelSize - 1}" font-weight="500">✓</text>`);
    }

    currentY += GANTT_THEME.rowHeight;
  }

  const svgHeight = currentY + 20;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${svgHeight}" viewBox="0 0 ${totalWidth} ${svgHeight}" style="font-family: ${THEME.font}">\n${svgParts.join("\n")}\n</svg>`;

  return { ok: true, svg, type: "gantt" };
}
