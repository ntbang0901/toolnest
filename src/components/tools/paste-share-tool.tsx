import { useEffect, useState } from "react";
import { Check, Copy, Link } from "lucide-react";
import { Button } from "@/components/ui/button";
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

type Status = "idle" | "loading" | "success" | "copying" | "copied" | "error";

export default function PasteShareTool() {
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState<CodeLang>("plain");
  const [status, setStatus] = useState<Status>("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (status === "copied") {
      const t = setTimeout(() => setStatus("success"), 1500);
      return () => clearTimeout(t);
    }
  }, [status]);

  const handleShare = async () => {
    if (!content.trim()) return;

    // If already have a URL, just copy it again
    if (status === "success" && shareUrl) {
      handleCopy();
      return;
    }

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
      setStatus("copying");
      await navigator.clipboard.writeText(url).catch(() => {});
      setStatus("copied");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to create paste");
      setStatus("error");
    }
  };

  const handleCopy = async () => {
    setStatus("copying");
    await navigator.clipboard.writeText(shareUrl).catch(() => {});
    setStatus("copied");
  };

  const handleReset = () => {
    setContent("");
    setLanguage("plain");
    setStatus("idle");
    setShareUrl("");
    setErrorMsg("");
  };

  const isSuccess = status === "success" || status === "copied" || status === "copying";

  const buttonLabel =
    status === "loading" ? "Creating link…"
    : status === "copying" ? "Copying…"
    : status === "copied" ? "Copied!"
    : isSuccess ? "Copy link again"
    : "Share";

  const ButtonIcon = status === "copied" ? Check : isSuccess ? Copy : Link;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor="lang-select" className="text-sm font-medium">
          Language
        </label>
        <select
          id="lang-select"
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value as CodeLang);
            if (isSuccess) handleReset();
          }}
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
          <Button
            size="sm"
            onClick={handleShare}
            disabled={!content.trim() || status === "loading" || status === "copying"}
            variant={status === "copied" ? "outline" : "default"}
          >
            <ButtonIcon className="h-4 w-4" />
            {buttonLabel}
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

      {isSuccess && shareUrl && (
        <p className="text-xs text-muted-foreground break-all">
          <span className="font-medium text-foreground">Link:</span> {shareUrl}
        </p>
      )}

      {status === "error" && errorMsg && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
