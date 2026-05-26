import { toPng, toSvg } from "html-to-image";
import type { DiagramSnapshot } from "./persist";

export async function exportImage(
  el: HTMLElement,
  kind: "png" | "svg",
): Promise<void> {
  const opts = {
    backgroundColor: document.documentElement.classList.contains("dark") ? "#0a0a0a" : "#ffffff",
    pixelRatio: 2,
    cacheBust: true,
    filter: (node: HTMLElement) => {
      if (!node.classList) return true;
      if (node.classList.contains("react-flow__minimap")) return false;
      if (node.classList.contains("react-flow__controls")) return false;
      if (node.classList.contains("react-flow__panel")) return false;
      return true;
    },
  };
  const dataUrl = kind === "png" ? await toPng(el, opts) : await toSvg(el, opts);
  triggerDownload(dataUrl, `diagram.${kind}`);
}

export function exportJson(snap: DiagramSnapshot) {
  const payload = {
    version: 1,
    kind: "toolnest-diagram",
    nodes: snap.nodes.map((n) => ({
      id: n.id,
      type: n.type,
      position: n.position,
      width: n.width,
      height: n.height,
      data: n.data,
    })),
    edges: snap.edges.map((e) => ({
      id: e.id,
      type: e.type,
      source: e.source,
      target: e.target,
      sourceHandle: e.sourceHandle,
      targetHandle: e.targetHandle,
      data: e.data,
    })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, "diagram.json");
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

export async function importJson(file: File): Promise<DiagramSnapshot | null> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);
    if (!parsed || !Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) return null;
    return { nodes: parsed.nodes, edges: parsed.edges };
  } catch {
    return null;
  }
}

function triggerDownload(href: string, filename: string) {
  const a = document.createElement("a");
  a.href = href;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}
