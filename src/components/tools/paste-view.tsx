import { useEffect, useState } from "react";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor, type CodeLang } from "@/components/tools/code-editor";

interface PasteData {
  content: string;
  language: CodeLang;
  createdAt: string;
}

const LANGUAGE_LABELS: Record<string, string> = {
  plain: "Plain Text",
  json: "JSON",
  javascript: "JavaScript",
  typescript: "TypeScript",
  html: "HTML",
  css: "CSS",
  sql: "SQL",
  yaml: "YAML",
};

type Status = "loading" | "success" | "error" | "no-id";

export default function PasteView() {
  const [status, setStatus] = useState<Status>("loading");
  const [paste, setPaste] = useState<PasteData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
      setStatus("no-id");
      return;
    }

    fetch(`/api/paste/${id}`)
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Paste not found or expired.");
        }
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">{langLabel}</span>
        <span className="text-xs text-muted-foreground">Created {createdDate}</span>
        <div className="ml-auto">
          <CopyButton value={paste.content} label="Copy content" />
        </div>
      </div>

      <CodeEditor
        value={paste.content}
        language={paste.language}
        readOnly
        minHeight="320px"
      />
    </div>
  );
}
