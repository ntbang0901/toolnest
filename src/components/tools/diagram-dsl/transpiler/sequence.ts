import type { TranspileResult } from "./types";
import { THEME, PALETTE, DARK_PALETTE } from "../renderer/theme";
import { measureText, escapeXml } from "../renderer/text";

/**
 * Sequence diagram DSL → direct SVG (custom swimlane renderer)
 *
 *   sequence
 *
 *   participant U as User
 *   participant S as Server
 *
 *   User -> Server: Login request
 *   Server --> User: 200 OK
 *   note over Server: Validates JWT
 */

interface Participant {
  id: string;
  alias: string;
  x: number;
  colorIndex: number;
}

interface Message {
  from: string;
  to: string;
  text: string;
  dashed: boolean;
}

interface Note {
  position: "over" | "left" | "right";
  target: string;
  text: string;
}

type SeqItem = { kind: "message"; msg: Message } | { kind: "note"; note: Note };

const SEQ_THEME = {
  participantWidth: 100,
  participantHeight: 36,
  participantGap: 60,
  messageGap: 50,
  topMargin: 20,
  bottomMargin: 40,
  sideMargin: 40,
  noteWidth: 140,
  noteHeight: 28,
  lifeline: "#CBD5E1",
  lifelineDark: "#475569",
};

export function transpileSequence(lines: string[]): TranspileResult {
  const participants: Participant[] = [];
  const participantIndex = new Map<string, number>();
  const items: SeqItem[] = [];
  let colorCounter = 0;

  function ensureParticipant(name: string) {
    if (participantIndex.has(name)) return;
    const idx = participants.length;
    participantIndex.set(name, idx);
    participants.push({ id: name, alias: name, x: 0, colorIndex: colorCounter++ });
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    // participant/actor
    const partMatch = line.match(/^(participant|actor)\s+(.+?)(?:\s+as\s+(.+))?$/i);
    if (partMatch) {
      const id = partMatch[2].trim();
      const alias = partMatch[3]?.trim() || id;
      if (!participantIndex.has(id)) {
        const idx = participants.length;
        participantIndex.set(id, idx);
        participants.push({ id, alias, x: 0, colorIndex: colorCounter++ });
      } else {
        const p = participants[participantIndex.get(id)!];
        p.alias = alias;
      }
      continue;
    }

    // note
    const noteMatch = line.match(/^note\s+(over|left of|right of)\s+(.+?):\s*(.+)$/i);
    if (noteMatch) {
      const position = noteMatch[1].toLowerCase().startsWith("over") ? "over"
        : noteMatch[1].toLowerCase().startsWith("left") ? "left" : "right";
      const target = noteMatch[2].trim();
      ensureParticipant(target);
      items.push({ kind: "note", note: { position, target, text: noteMatch[3] } });
      continue;
    }

    // Control flow keywords — skip for now
    const controlMatch = line.match(/^(alt|else|end|loop|opt|par|and|critical|break)(?:\s+(.+))?$/i);
    if (controlMatch) continue;

    // activate/deactivate — skip for now
    const activateMatch = line.match(/^(activate|deactivate)\s+(.+)$/i);
    if (activateMatch) continue;

    // Message: From -> To: text
    const msgMatch = line.match(/^(.+?)\s*(-->|->|->>|-->>)\s*(.+?):\s*(.+)$/);
    if (msgMatch) {
      const from = msgMatch[1].trim();
      const dashed = msgMatch[2].startsWith("--");
      const to = msgMatch[3].trim();
      const text = msgMatch[4].trim();
      ensureParticipant(from);
      ensureParticipant(to);
      items.push({ kind: "message", msg: { from, to, text, dashed } });
      continue;
    }

    // Message without text
    const msgNoText = line.match(/^(.+?)\s*(-->|->|->>|-->>)\s*(.+)$/);
    if (msgNoText) {
      const from = msgNoText[1].trim();
      const dashed = msgNoText[2].startsWith("--");
      const to = msgNoText[3].trim();
      ensureParticipant(from);
      ensureParticipant(to);
      items.push({ kind: "message", msg: { from, to, text: "", dashed } });
      continue;
    }

    return { ok: false, error: `Invalid syntax: "${line}"`, line: i + 1 };
  }

  if (participants.length === 0) {
    return { ok: false, error: "Empty diagram — add participants and messages" };
  }

  // Calculate participant widths based on alias text
  const pWidths = participants.map((p) => {
    const w = measureText(p.alias, THEME.fontSize, THEME.fontWeight);
    return Math.max(w + THEME.nodePadding.x * 2, SEQ_THEME.participantWidth);
  });

  // Layout participants horizontally
  let xCursor = SEQ_THEME.sideMargin;
  for (let p = 0; p < participants.length; p++) {
    participants[p].x = xCursor + pWidths[p] / 2;
    xCursor += pWidths[p] + SEQ_THEME.participantGap;
  }
  const totalWidth = xCursor - SEQ_THEME.participantGap + SEQ_THEME.sideMargin;

  // Vertical positions
  const headerY = SEQ_THEME.topMargin;
  const bodyStart = headerY + SEQ_THEME.participantHeight + 30;
  let currentY = bodyStart;

  // Generate SVG
  const svgParts: string[] = [];

  // Lifelines
  const totalItems = items.length;
  const lifelineEnd = bodyStart + totalItems * SEQ_THEME.messageGap + 30;

  for (const p of participants) {
    svgParts.push(`<line x1="${p.x}" y1="${headerY + SEQ_THEME.participantHeight}" x2="${p.x}" y2="${lifelineEnd}" stroke="${SEQ_THEME.lifeline}" stroke-width="1" stroke-dasharray="4 3" />`);
  }

  // Participant boxes (top)
  for (let p = 0; p < participants.length; p++) {
    const part = participants[p];
    const color = PALETTE[part.colorIndex % PALETTE.length];
    const w = pWidths[p];
    const h = SEQ_THEME.participantHeight;
    svgParts.push(`<rect x="${part.x - w / 2}" y="${headerY}" width="${w}" height="${h}" rx="${THEME.nodeRadius}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="${THEME.nodeStrokeWidth}" />`);
    svgParts.push(`<text x="${part.x}" y="${headerY + h / 2}" text-anchor="middle" dominant-baseline="central" fill="${color.text}" font-family="${THEME.font}" font-size="${THEME.fontSize}" font-weight="${THEME.fontWeight}">${escapeXml(part.alias)}</text>`);
  }

  // Messages and notes
  for (const item of items) {
    if (item.kind === "message") {
      const { from, to, text, dashed } = item.msg;
      const fromP = participants[participantIndex.get(from)!];
      const toP = participants[participantIndex.get(to)!];
      const y = currentY;
      const dash = dashed ? `stroke-dasharray="${THEME.edgeDash}"` : "";

      // Self-message
      if (from === to) {
        const loopW = 30;
        svgParts.push(`<path d="M${fromP.x},${y} L${fromP.x + loopW},${y} L${fromP.x + loopW},${y + 20} L${fromP.x},${y + 20}" fill="none" stroke="${THEME.edgeColor}" stroke-width="${THEME.edgeWidth}" ${dash} />`);
        // Arrow
        svgParts.push(`<polygon points="${fromP.x},${y + 20} ${fromP.x + 6},${y + 16} ${fromP.x + 6},${y + 24}" fill="${THEME.edgeColor}" />`);
        // Label
        if (text) {
          svgParts.push(`<text x="${fromP.x + loopW + 6}" y="${y + 10}" text-anchor="start" dominant-baseline="central" fill="${THEME.edgeColor}" font-family="${THEME.font}" font-size="${THEME.edgeLabelSize}">${escapeXml(text)}</text>`);
        }
        currentY += SEQ_THEME.messageGap;
        continue;
      }

      const leftToRight = fromP.x < toP.x;
      const startX = fromP.x;
      const endX = toP.x;

      // Line
      svgParts.push(`<line x1="${startX}" y1="${y}" x2="${endX}" y2="${y}" stroke="${THEME.edgeColor}" stroke-width="${THEME.edgeWidth}" ${dash} />`);

      // Arrowhead
      const arrowDir = leftToRight ? -1 : 1;
      const ax = endX;
      svgParts.push(`<polygon points="${ax},${y} ${ax + arrowDir * THEME.arrowSize},${y - 4} ${ax + arrowDir * THEME.arrowSize},${y + 4}" fill="${THEME.edgeColor}" />`);

      // Label
      if (text) {
        const midX = (startX + endX) / 2;
        svgParts.push(`<text x="${midX}" y="${y - 8}" text-anchor="middle" fill="${THEME.edgeColor}" font-family="${THEME.font}" font-size="${THEME.edgeLabelSize}">${escapeXml(text)}</text>`);
      }
    } else {
      // Note
      const { target, text } = item.note;
      const targetP = participants[participantIndex.get(target)!];
      const noteW = Math.max(measureText(text, THEME.edgeLabelSize) + 16, SEQ_THEME.noteWidth);
      const noteH = SEQ_THEME.noteHeight;
      const nx = targetP.x - noteW / 2;
      const ny = currentY - noteH / 2;
      svgParts.push(`<rect x="${nx}" y="${ny}" width="${noteW}" height="${noteH}" rx="4" fill="#FEF9C3" stroke="#FACC15" stroke-width="1" />`);
      svgParts.push(`<text x="${targetP.x}" y="${currentY}" text-anchor="middle" dominant-baseline="central" fill="#854D0E" font-family="${THEME.font}" font-size="${THEME.edgeLabelSize}">${escapeXml(text)}</text>`);
    }
    currentY += SEQ_THEME.messageGap;
  }

  // Bottom participant boxes
  for (let p = 0; p < participants.length; p++) {
    const part = participants[p];
    const color = PALETTE[part.colorIndex % PALETTE.length];
    const w = pWidths[p];
    const h = SEQ_THEME.participantHeight;
    const y = lifelineEnd;
    svgParts.push(`<rect x="${part.x - w / 2}" y="${y}" width="${w}" height="${h}" rx="${THEME.nodeRadius}" fill="${color.fill}" stroke="${color.stroke}" stroke-width="${THEME.nodeStrokeWidth}" />`);
    svgParts.push(`<text x="${part.x}" y="${y + h / 2}" text-anchor="middle" dominant-baseline="central" fill="${color.text}" font-family="${THEME.font}" font-size="${THEME.fontSize}" font-weight="${THEME.fontWeight}">${escapeXml(part.alias)}</text>`);
  }

  const totalHeight = lifelineEnd + SEQ_THEME.participantHeight + SEQ_THEME.bottomMargin;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="${totalHeight}" viewBox="0 0 ${totalWidth} ${totalHeight}" style="font-family: ${THEME.font}">\n${svgParts.join("\n")}\n</svg>`;

  return { ok: true, svg, type: "sequence" };
}
