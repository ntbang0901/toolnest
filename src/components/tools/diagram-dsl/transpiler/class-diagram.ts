import type { LayoutGraph, LayoutNode, LayoutEdge, TranspileResult } from "./types";
import { measureText } from "../renderer/text";
import { THEME } from "../renderer/theme";

/**
 * Class diagram DSL → LayoutGraph
 *
 *   class
 *
 *   Animal {
 *     +name: string
 *     +age: int
 *     +makeSound()
 *   }
 *
 *   Dog extends Animal {
 *     +breed: string
 *     +fetch()
 *   }
 *
 *   Owner "1" -- "*" Animal: owns
 */

interface ClassInfo {
  name: string;
  members: string[];
  relType?: string;
  parent?: string;
}

function calcClassNodeSize(name: string, members: string[]): { width: number; height: number } {
  const headerWidth = measureText(name, THEME.fontSize + 1, 600);
  let maxMemberWidth = 0;
  for (const m of members) {
    const w = measureText(m, THEME.fontSize - 1, 400);
    if (w > maxMemberWidth) maxMemberWidth = w;
  }
  const contentWidth = Math.max(headerWidth, maxMemberWidth);
  const width = contentWidth + THEME.nodePadding.x * 2;
  const headerHeight = THEME.fontSize + THEME.nodePadding.y * 2;
  const membersHeight = members.length > 0 ? members.length * (THEME.fontSize + 4) + THEME.nodePadding.y : 0;
  const height = headerHeight + membersHeight;
  return { width: Math.max(width, 120), height: Math.max(height, 40) };
}

function relationToEdgeStyle(rel: string): "solid" | "dashed" {
  if (rel === "implements" || rel === "..>") return "dashed";
  return "solid";
}

export function transpileClass(lines: string[]): TranspileResult {
  const nodesMap = new Map<string, LayoutNode>();
  const edges: LayoutEdge[] = [];
  let colorCounter = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();
    if (!line || line.startsWith("//") || line.startsWith("#")) {
      i++;
      continue;
    }

    // Annotation: <<interface>> ClassName — just note it
    const annotMatch = line.match(/^<<(\w+)>>\s+(\w+)$/);
    if (annotMatch) {
      const className = annotMatch[2];
      const annotation = `<<${annotMatch[1]}>>`;
      if (!nodesMap.has(className)) {
        const size = calcClassNodeSize(className, [annotation]);
        nodesMap.set(className, {
          id: className,
          label: `${annotation}\n${className}`,
          shape: "rect",
          ...size,
          colorIndex: colorCounter++,
        });
      }
      i++;
      continue;
    }

    // Class definition: ClassName extends Parent {
    const classMatch = line.match(
      /^(\w+)(?:\s+(extends|implements)\s+(\w+))?\s*\{?\s*$/
    );

    if (classMatch && (line.endsWith("{") || lines.slice(i + 1).findIndex((l) => l.trim() === "}") !== -1)) {
      const className = classMatch[1];
      const relType = classMatch[2];
      const parent = classMatch[3];

      // Parse body
      const members: string[] = [];
      if (line.endsWith("{")) {
        i++;
        while (i < lines.length) {
          const member = lines[i].trim();
          if (member === "}") {
            i++;
            break;
          }
          if (member && !member.startsWith("//") && !member.startsWith("#")) {
            members.push(member);
          }
          i++;
        }
      } else {
        i++;
      }

      // Create node with class name + members as multiline label
      const labelParts = [className, ...members.map((m) => `  ${m}`)];
      const size = calcClassNodeSize(className, members);
      nodesMap.set(className, {
        id: className,
        label: labelParts.join("\n"),
        shape: "rect",
        ...size,
        colorIndex: colorCounter++,
      });

      // Ensure parent exists and add edge
      if (relType && parent) {
        if (!nodesMap.has(parent)) {
          const pSize = calcClassNodeSize(parent, []);
          nodesMap.set(parent, {
            id: parent,
            label: parent,
            shape: "rect",
            ...pSize,
            colorIndex: colorCounter++,
          });
        }
        edges.push({
          from: parent,
          to: className,
          label: relType,
          style: relationToEdgeStyle(relType),
        });
      }
      continue;
    }

    // Relationship: ClassA "1" -- "*" ClassB: label
    const relMatch = line.match(
      /^(\w+)(?:\s+"([^"]*)")?\s*(--|-->|\.\.>|--\*|--o)\s*(?:"([^"]*)"\s*)?(\w+)(?:\s*:\s*(.+))?$/
    );
    if (relMatch) {
      const from = relMatch[1];
      const fromCard = relMatch[2] || "";
      const rel = relMatch[3];
      const toCard = relMatch[4] || "";
      const to = relMatch[5];
      const label = relMatch[6] || "";

      // Ensure nodes exist
      for (const name of [from, to]) {
        if (!nodesMap.has(name)) {
          const size = calcClassNodeSize(name, []);
          nodesMap.set(name, {
            id: name,
            label: name,
            shape: "rect",
            ...size,
            colorIndex: colorCounter++,
          });
        }
      }

      const edgeLabel = [fromCard, label, toCard].filter(Boolean).join(" ");
      edges.push({
        from,
        to,
        label: edgeLabel || undefined,
        style: relationToEdgeStyle(rel),
      });
      i++;
      continue;
    }

    return { ok: false, error: `Invalid syntax: "${line}"`, line: i + 1 };
  }

  if (nodesMap.size === 0) {
    return { ok: false, error: "Empty diagram — define some classes" };
  }

  const graph: LayoutGraph = {
    nodes: Array.from(nodesMap.values()),
    edges,
    direction: "TB",
    type: "class",
  };

  return { ok: true, graph };
}
