import type { LayoutGraph, LayoutEdge, LayoutNode, TranspileResult } from "./types";
import { measureText } from "../renderer/text";
import { THEME } from "../renderer/theme";

/**
 * State diagram DSL → LayoutGraph
 *
 *   state
 *
 *   [*] -> Idle
 *   Idle -> Loading: fetch
 *   Loading -> Success: done
 *   Loading -> Error: fail
 *   Error -> Idle: retry
 *   Success -> [*]
 */

function calcNodeSize(label: string, isTerminal: boolean): { width: number; height: number } {
  if (isTerminal) {
    return { width: 28, height: 28 };
  }
  const textWidth = measureText(label, THEME.fontSize, THEME.fontWeight);
  const w = Math.max(textWidth + THEME.nodePadding.x * 2, 80);
  const h = THEME.fontSize + THEME.nodePadding.y * 2;
  return { width: w, height: h };
}

export function transpileState(lines: string[]): TranspileResult {
  const nodesMap = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  let colorCounter = 0;
  let hasContent = false;

  function ensureNode(name: string) {
    if (nodesMap.has(name)) return;
    const isTerminal = name === "[*]";
    const size = calcNodeSize(name, isTerminal);
    nodesMap.set(name, {
      id: name,
      label: isTerminal ? "" : name,
      shape: isTerminal ? "circle" : "stadium",
      ...size,
      colorIndex: isTerminal ? -1 : colorCounter++,
    });
  }

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) {
      i++;
      continue;
    }

    // Skip composite state blocks for now (flatten them)
    const compositeMatch = line.match(/^state\s+(\w+)\s*\{$/);
    if (compositeMatch) {
      // Just skip the block — flatten nested transitions
      i++;
      while (i < lines.length && lines[i].trim() !== "}") {
        const nested = lines[i].trim();
        if (nested && !nested.startsWith("//") && !nested.startsWith("#")) {
          const transMatch = nested.match(/^(.+?)\s*->\s*(.+?)(?:\s*:\s*(.+))?$/);
          if (transMatch) {
            const from = transMatch[1].trim();
            const to = transMatch[2].trim();
            const label = transMatch[3]?.trim();
            ensureNode(from);
            ensureNode(to);
            edges.push({ from, to, label: label || undefined, style: "solid" });
            hasContent = true;
          }
        }
        i++;
      }
      i++; // skip closing }
      continue;
    }

    // State description: StateName: description (not a transition)
    if (!line.includes("->")) {
      const descMatch = line.match(/^(\w+)\s*:\s*(.+)$/);
      if (descMatch) {
        const name = descMatch[1];
        ensureNode(name);
        // Update label to include description
        const node = nodesMap.get(name)!;
        node.label = `${name}\n${descMatch[2]}`;
        const textWidth = measureText(node.label.split("\n")[0], THEME.fontSize, THEME.fontWeight);
        node.width = Math.max(textWidth + THEME.nodePadding.x * 2, node.width);
        hasContent = true;
        i++;
        continue;
      }
    }

    // Transition: State1 -> State2: event
    const transMatch = line.match(/^(.+?)\s*->\s*(.+?)(?:\s*:\s*(.+))?$/);
    if (transMatch) {
      const from = transMatch[1].trim();
      const to = transMatch[2].trim();
      const label = transMatch[3]?.trim();
      ensureNode(from);
      ensureNode(to);
      edges.push({ from, to, label: label || undefined, style: "solid" });
      hasContent = true;
      i++;
      continue;
    }

    // Note (skip for now)
    const noteMatch = line.match(/^note\s+(left of|right of)\s+(\w+)\s*:\s*(.+)$/i);
    if (noteMatch) {
      i++;
      continue;
    }

    return { ok: false, error: `Invalid syntax: "${line}"`, line: i + 1 };
  }

  if (!hasContent) {
    return { ok: false, error: "Empty diagram — add state transitions" };
  }

  // Override terminal node colors (black fill)
  for (const node of nodesMap.values()) {
    if (node.id === "[*]") {
      node.colorIndex = -1; // Special handling in renderer
    }
  }

  const graph: LayoutGraph = {
    nodes: Array.from(nodesMap.values()),
    edges,
    direction: "TB",
    type: "state",
  };

  return { ok: true, graph };
}
