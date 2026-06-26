import { useEffect, useRef } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

let mermaidInitialized = false;
async function getMermaid() {
  const mod = await import("mermaid");
  const mermaid = mod.default;
  if (!mermaidInitialized) {
    const dark = document.documentElement.classList.contains("dark");
    mermaid.initialize({
      startOnLoad: false,
      theme: dark ? "dark" : "default",
      securityLevel: "loose",
      fontFamily: "ui-sans-serif, system-ui, sans-serif",
    });
    mermaidInitialized = true;
  }
  return mermaid;
}

marked.setOptions({ gfm: true, breaks: false });

/**
 * Renders Markdown to sanitized HTML and turns ```mermaid fenced blocks into
 * inline SVG diagrams. Shared by the server-backed paste viewer and the local
 * URL paste viewer.
 */
export function MarkdownView({ content }: { content: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raw = marked.parse(content, { async: false }) as string;
    el.innerHTML = DOMPurify.sanitize(raw);

    const blocks = el.querySelectorAll<HTMLElement>("code.language-mermaid");
    if (!blocks.length) return;

    let cancelled = false;
    getMermaid().then((mermaid) => {
      if (cancelled) return;
      blocks.forEach((block, i) => {
        const source = block.textContent ?? "";
        const id = `pv-mmd-${Date.now()}-${i}`;
        mermaid
          .render(id, source)
          .then(({ svg }) => {
            if (cancelled) return;
            const wrapper = block.closest("pre") ?? block;
            const div = document.createElement("div");
            div.className = "flex justify-center overflow-auto my-4";
            div.innerHTML = svg;
            wrapper.replaceWith(div);
          })
          .catch(() => {});
      });
    });

    return () => {
      cancelled = true;
    };
  }, [content]);

  return (
    <div
      ref={ref}
      className="prose-toolnest min-h-[320px] overflow-auto rounded-md border border-border bg-muted/20 p-4 text-sm"
    />
  );
}
