import type { DiagramType, TranspileResult } from "./types";
import { transpileFlowchart } from "./flowchart";
import { transpileSequence } from "./sequence";
import { transpileClass } from "./class-diagram";
import { transpileErd } from "./erd";
import { transpileGantt } from "./gantt";
import { transpileState } from "./state";
import { transpilePie } from "./pie";
import { transpileMindmap } from "./mindmap";

const TYPE_KEYWORDS: Record<string, DiagramType> = {
  flowchart: "flowchart",
  flow: "flowchart",
  sequence: "sequence",
  seq: "sequence",
  class: "class",
  erd: "erd",
  er: "erd",
  gantt: "gantt",
  state: "state",
  pie: "pie",
  mindmap: "mindmap",
  mind: "mindmap",
};

const transpilers: Record<DiagramType, (lines: string[]) => TranspileResult> = {
  flowchart: transpileFlowchart,
  sequence: transpileSequence,
  class: transpileClass,
  erd: transpileErd,
  gantt: transpileGantt,
  state: transpileState,
  pie: transpilePie,
  mindmap: transpileMindmap,
};

/**
 * Main transpile function.
 * Detects diagram type from the first non-empty line, then delegates to
 * the appropriate transpiler.
 *
 * Returns either a LayoutGraph (for custom rendering) or a mermaid string (fallback).
 */
export function transpile(dsl: string): TranspileResult {
  const lines = dsl.split("\n");

  // Find the first non-empty, non-comment line to detect type
  let typeLineIndex = -1;
  let detectedType: DiagramType | null = null;

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim().toLowerCase();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) continue;

    const keyword = trimmed.split(/\s+/)[0];
    if (keyword && TYPE_KEYWORDS[keyword]) {
      detectedType = TYPE_KEYWORDS[keyword];
      typeLineIndex = i;
    }
    break;
  }

  if (!detectedType) {
    return {
      ok: false,
      error:
        "First line must declare diagram type: flowchart, sequence, class, erd, gantt, state, pie, or mindmap",
      line: 1,
    };
  }

  // Pass remaining lines (after type declaration) to the transpiler
  const contentLines = lines.slice(typeLineIndex + 1);
  const result = transpilers[detectedType](contentLines);

  // Adjust line numbers to account for the removed type line
  if (!result.ok && result.line) {
    return { ...result, line: result.line + typeLineIndex + 1 };
  }

  return result;
}

export type { DiagramType, TranspileResult };
export type { LayoutGraph, LayoutNode, LayoutEdge } from "./types";
