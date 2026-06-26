import type { LayoutGraph, LayoutNode, LayoutEdge, TranspileResult } from "./types";
import type { ShapeType } from "../renderer/shapes";
import { measureText } from "../renderer/text";
import { THEME } from "../renderer/theme";

/**
 * Flowchart DSL → LayoutGraph
 *
 *   flowchart
 *   direction LR
 *
 *   A [Start] -> B [Process] -> C {Decision}
 *   C -> D [Yes Path]: yes
 *   C -> E [No Path]: no
 *   D -> F [End]
 *   E -> F
 */

const NODE_PATTERN = /([A-Za-z_]\w*)(?:\s*\(\((.+?)\)\)|\s*\{(.+?)\}|\s*\((.+?)\)|\s*\[(.+?)\])?/;
const ARROW_PATTERN = /\s*(-->|->|==>)\s*/;
const EDGE_LABEL_PATTERN = /:\s*(.+)$/;

function detectShape(match: RegExpMatchArray): { label: string; shape: ShapeType } {
  if (match[2]) return { label: match[2], shape: "circle" };
  if (match[3]) return { label: match[3], shape: "diamond" };
  if (match[4]) return { label: match[4], shape: "rounded" };
  if (match[5]) return { label: match[5], shape: "rect" };
  return { label: match[1], shape: "rect" };
}

function calcNodeSize(label: string, shape: ShapeType): { width: number; height: number } {
  const textWidth = measureText(label, THEME.fontSize, THEME.fontWeight);
  const baseW = textWidth + THEME.nodePadding.x * 2;
  const baseH = THEME.fontSize + THEME.nodePadding.y * 2;

  if (shape === "diamond") {
    // Diamonds need more space due to 45-degree rotation
    return { width: baseW * 1.4, height: baseH * 1.6 };
  }
  if (shape === "circle") {
    const d = Math.max(baseW, baseH) + 8;
    return { width: d, height: d };
  }
  return { width: Math.max(baseW, 80), height: Math.max(baseH, 36) };
}

function parseNode(raw: string): { id: string; label: string; shape: ShapeType } | null {
  const m = raw.trim().match(NODE_PATTERN);
  if (!m) return null;
  const id = m[1];
  const { label, shape } = detectShape(m);
  return { id, label, shape };
}

function arrowStyle(arrow: string): "solid" | "dashed" {
  if (arrow === "-->") return "dashed";
  return "solid";
}

export function transpileFlowchart(lines: string[]): TranspileResult {
  let direction: "LR" | "TB" = "LR";
  const nodesMap = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  let colorCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) continue;

    // Direction declaration
    const dirMatch = line.match(/^direction\s+(TB|BT|LR|RL|TD)$/i);
    if (dirMatch) {
      const d = dirMatch[1].toUpperCase();
      direction = d === "TB" || d === "TD" || d === "BT" ? "TB" : "LR";
      continue;
    }

    // Split by arrows
    const segments: string[] = [];
    const arrows: string[] = [];
    let remaining = line;

    while (true) {
      const arrowMatch = remaining.match(ARROW_PATTERN);
      if (!arrowMatch || arrowMatch.index === undefined) {
        segments.push(remaining);
        break;
      }
      segments.push(remaining.slice(0, arrowMatch.index));
      arrows.push(arrowMatch[1]);
      remaining = remaining.slice(arrowMatch.index + arrowMatch[0].length);
    }

    if (arrows.length === 0) {
      // Single node declaration
      const node = parseNode(line);
      if (node) {
        if (!nodesMap.has(node.id)) {
          const size = calcNodeSize(node.label, node.shape);
          nodesMap.set(node.id, {
            id: node.id,
            label: node.label,
            shape: node.shape,
            ...size,
            colorIndex: colorCounter++,
          });
        }
      } else {
        return { ok: false, error: `Invalid syntax: "${line}"`, line: i + 1 };
      }
      continue;
    }

    // Check for edge label on last segment
    let edgeLabel = "";
    const lastSeg = segments[segments.length - 1];
    const lastEdgeLabelMatch = lastSeg.match(EDGE_LABEL_PATTERN);
    if (lastEdgeLabelMatch) {
      edgeLabel = lastEdgeLabelMatch[1];
      segments[segments.length - 1] = lastSeg.slice(0, lastEdgeLabelMatch.index).trim();
    }

    // Parse segments into nodes
    const parsedNodes: { id: string; label: string; shape: ShapeType }[] = [];
    for (let s = 0; s < segments.length; s++) {
      const node = parseNode(segments[s]);
      if (!node) {
        return { ok: false, error: `Invalid node: "${segments[s].trim()}"`, line: i + 1 };
      }
      parsedNodes.push(node);
    }

    // Register nodes and create edges
    for (let n = 0; n < parsedNodes.length; n++) {
      const pn = parsedNodes[n];
      if (!nodesMap.has(pn.id)) {
        const size = calcNodeSize(pn.label, pn.shape);
        nodesMap.set(pn.id, {
          id: pn.id,
          label: pn.label,
          shape: pn.shape,
          ...size,
          colorIndex: colorCounter++,
        });
      }
    }

    for (let n = 0; n < parsedNodes.length - 1; n++) {
      const label = n === parsedNodes.length - 2 ? edgeLabel : undefined;
      edges.push({
        from: parsedNodes[n].id,
        to: parsedNodes[n + 1].id,
        label: label || undefined,
        style: arrowStyle(arrows[n]),
      });
    }
  }

  if (nodesMap.size === 0) {
    return { ok: false, error: "Empty diagram — add some nodes and connections" };
  }

  const graph: LayoutGraph = {
    nodes: Array.from(nodesMap.values()),
    edges,
    direction,
    type: "flowchart",
  };

  return { ok: true, graph };
}
