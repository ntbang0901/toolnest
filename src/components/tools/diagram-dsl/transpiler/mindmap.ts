import type { LayoutGraph, LayoutNode, TranspileResult } from "./types";
import { measureText } from "../renderer/text";
import { THEME } from "../renderer/theme";

/**
 * Mindmap DSL → LayoutGraph (tree layout via dagre TB)
 *
 *   mindmap
 *
 *   Software Architecture
 *     Frontend
 *       React
 *       Next.js
 *     Backend
 *       Node.js
 *       PostgreSQL
 */

interface TreeNode {
  id: string;
  label: string;
  level: number;
  children: TreeNode[];
}

function calcMindmapNodeSize(label: string, isRoot: boolean): { width: number; height: number } {
  const fontSize = isRoot ? THEME.fontSize + 2 : THEME.fontSize;
  const textWidth = measureText(label, fontSize, isRoot ? 600 : THEME.fontWeight);
  const padX = isRoot ? THEME.nodePadding.x * 1.5 : THEME.nodePadding.x;
  const padY = isRoot ? THEME.nodePadding.y * 1.5 : THEME.nodePadding.y;
  return {
    width: Math.max(textWidth + padX * 2, 60),
    height: fontSize + padY * 2,
  };
}

export function transpileMindmap(lines: string[]): TranspileResult {
  const nodes: LayoutNode[] = [];
  const edges: { from: string; to: string }[] = [];
  let colorCounter = 0;
  let nodeCounter = 0;

  // Stack to track parent at each indentation level
  const stack: { id: string; level: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith("//") || line.trim().startsWith("#")) continue;

    // Calculate indentation level (2 spaces = 1 level)
    const leadingSpaces = line.match(/^(\s*)/)?.[1].length ?? 0;
    const level = Math.floor(leadingSpaces / 2);
    const text = line.trim();

    // Strip shape wrappers if any
    let label = text;
    let shape: LayoutNode["shape"] = "rounded";
    const circleMatch = text.match(/^\(\((.+)\)\)$/);
    const squareMatch = text.match(/^\[(.+)\]$/);
    const roundedMatch = text.match(/^\((.+)\)$/);
    if (circleMatch) {
      label = circleMatch[1];
      shape = "circle";
    } else if (squareMatch) {
      label = squareMatch[1];
      shape = "rect";
    } else if (roundedMatch) {
      label = roundedMatch[1];
      shape = "rounded";
    }

    const isRoot = level === 0;
    if (isRoot) shape = "stadium";

    const id = `mm_${nodeCounter++}`;
    const size = calcMindmapNodeSize(label, isRoot);

    nodes.push({
      id,
      label,
      shape,
      ...size,
      colorIndex: colorCounter++,
    });

    // Find parent: last node in stack with level < current
    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length > 0) {
      edges.push({ from: stack[stack.length - 1].id, to: id });
    }

    stack.push({ id, level });
  }

  if (nodes.length === 0) {
    return { ok: false, error: "Empty diagram — add a root node and children with indentation" };
  }

  const graph: LayoutGraph = {
    nodes,
    edges: edges.map((e) => ({ ...e, style: "solid" as const })),
    direction: "TB",
    type: "mindmap",
  };

  return { ok: true, graph };
}
