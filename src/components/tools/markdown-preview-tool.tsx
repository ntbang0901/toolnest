import { useEffect, useMemo, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

const SAMPLE = `# Toolnest

> Local-first developer tools.

## Features

- **Free** forever, no account
- Runs entirely in your browser
- Markdown via [marked](https://marked.js.org/)

\`\`\`ts
function hello(name: string) {
  return \`Hi, \${name}!\`;
}
\`\`\`

| Tool | Status |
| ---- | ------ |
| JSON | done |
| QR   | done |
`;

marked.setOptions({ gfm: true, breaks: false });

export default function MarkdownPreviewTool() {
  const [input, setInput] = useState("");
  const [view, setView] = useState<"rendered" | "html">("rendered");

  const html = useMemo(() => {
    if (!input) return "";
    const raw = marked.parse(input, { async: false }) as string;
    return DOMPurify.sanitize(raw);
  }, [input]);

  const previewRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (previewRef.current) previewRef.current.innerHTML = html;
  }, [html]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          ariaLabel="View"
          value={view}
          onChange={(v) => setView(v as "rendered" | "html")}
          options={[
            { value: "rendered", label: "Preview" },
            { value: "html", label: "HTML" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
          Sample
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
        <CopyButton value={html} label="Copy HTML" className="ml-auto" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <CodeEditor
          value={input}
          onChange={setInput}
          language="plain"
          placeholder="Type or paste Markdown…"
          minHeight="280px"
          className="lg:min-h-[480px]"
        />
        {view === "rendered" ? (
          <div
            ref={previewRef}
            className="prose-toolnest min-h-[280px] overflow-auto rounded-md border border-border bg-muted/20 p-4 text-sm lg:min-h-[480px]"
          />
        ) : (
          <CodeEditor
            value={html}
            language="html"
            readOnly
            minHeight="280px"
            className="lg:min-h-[480px]"
          />
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Rendered by marked, sanitized with DOMPurify. No remote requests.
      </p>
    </div>
  );
}
