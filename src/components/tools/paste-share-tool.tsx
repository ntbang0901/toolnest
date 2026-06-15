import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor, type CodeLang } from "@/components/tools/code-editor";

const LANGUAGES: { value: CodeLang; label: string }[] = [
  { value: "plain", label: "Plain Text" },
  { value: "markdown", label: "Markdown" },
  { value: "json", label: "JSON" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "yaml", label: "YAML" },
];

type Status = "idle" | "loading" | "success" | "error";

export default function PasteShareTool() {
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState<CodeLang>("plain");
  const [status, setStatus] = useState<Status>("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleShare = async () => {
    if (!content.trim()) return;

    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, language }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
      }

      const { id } = (await res.json()) as { id: string };
      const url = `${window.location.origin}/paste?id=${id}`;
      setShareUrl(url);
      setStatus("success");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create paste");
      setStatus("error");
    }
  };

  const handleReset = () => {
    setContent("");
    setLanguage("plain");
    setStatus("idle");
    setShareUrl("");
    setErrorMsg("");
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="lang-select" className="text-sm font-medium">
          Language
        </label>
        <select
          id="lang-select"
          value={language}
          onChange={(e) => setLanguage(e.target.value as CodeLang)}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {LANGUAGES.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </select>
        <div className="ml-auto flex gap-2">
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={!content && status === "idle"}>
            Clear
          </Button>
          <Button size="sm" onClick={handleShare} disabled={!content.trim() || status === "loading"}>
            {status === "loading" ? "Sharing..." : "Share"}
          </Button>
        </div>
      </div>

      <CodeEditor
        value={content}
        onChange={setContent}
        language={language}
        placeholder="Paste your content here..."
        minHeight="320px"
      />

      {status === "success" && shareUrl && (
        <div className="flex items-center gap-2">
          <Input value={shareUrl} readOnly className="flex-1 font-mono text-xs" />
          <CopyButton value={shareUrl} label="Copy link" />
        </div>
      )}

      {status === "error" && errorMsg && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
