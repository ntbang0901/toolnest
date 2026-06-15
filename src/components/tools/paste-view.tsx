import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor, type CodeLang } from "@/components/tools/code-editor";
import { SegmentedControl } from "@/components/ui/segmented-control";

interface PasteData {
  content: string;
  language: CodeLang;
  createdAt: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  plain: "Plain Text",
  markdown: "Markdown",
  json: "JSON",
  javascript: "JavaScript",
  typescript: "TypeScript",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  yaml: "YAML",
};

let mermaidInitialized = false;
async function getMermaid() {
  const mod = await import("mermaid");
  const mermaid = mod.default;
  if (!mermaidInitialized) {
    const dark = document.documentElement.classList.contains("dark");
    mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "default", securityLevel: "loose", fontFamily: "ui-sans-serif, system-ui, sans-serif" });
    mermaidInitialized = true;
  }
  return mermaid;
}

marked.setOptions({ gfm: true, breaks: false });

type FetchStatus = "loading" | "success" | "error" | "no-id";

function MarkdownView({ content }: { content: string }) {
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
        mermaid.render(id, source).then(({ svg }) => {
          if (cancelled) return;
          const wrapper = block.closest("pre") ?? block;
          const div = document.createElement("div");
          div.className = "flex justify-center overflow-auto my-4";
          div.innerHTML = svg;
          wrapper.replaceWith(div);
        }).catch(() => {});
      });
    });

    return () => { cancelled = true; };
  }, [content]);

  return (
    <div
      ref={ref}
      className="prose-toolnest min-h-[320px] overflow-auto rounded-md border border-border bg-muted/20 p-4 text-sm"
    />
  );
}

export default function PasteView() {
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [paste, setPaste] = useState<PasteData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [mdView, setMdView] = useState<"rendered" | "raw">("rendered");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
      setStatus("no-id");
      return;
    }

    fetch(`/api/paste/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Paste not found or expired.");
        const data = (await res.json()) as PasteData;
        setPaste(data);
        setStatus("success");
      })
      .catch((err) => {
        setErrorMsg(err instanceof Error ? err.message : "Failed to load paste");
        setStatus("error");
      });
  }, []);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (status === "no-id") {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-muted-foreground">No paste ID found.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-destructive">{errorMsg}</p>
      </div>
    );
  }

  if (!paste) return null;

  const createdDate = new Date(paste.createdAt).toLocaleString();
  const langLabel = LANGUAGE_LABELS[paste.language] || paste.language;
  const isMarkdown = paste.language === "markdown";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">{langLabel}</span>
        <span className="text-xs text-muted-foreground">Created {createdDate}</span>
        {isMarkdown && (
          <SegmentedControl
            ariaLabel="View"
            value={mdView}
            onChange={(v) => setMdView(v as "rendered" | "raw")}
            options={[
              { value: "rendered", label: "Preview" },
              { value: "raw", label: "Raw" },
            ]}
          />
        )}
        <div className="ml-auto">
          <CopyButton value={paste.content} label="Copy" />
        </div>
      </div>

      {isMarkdown && mdView === "rendered" ? (
        <MarkdownView content={paste.content} />
      ) : (
        <CodeEditor
          value={paste.content}
          language={paste.language}
          readOnly
          minHeight="320px"
        />
      )}
    </div>
  );
}
