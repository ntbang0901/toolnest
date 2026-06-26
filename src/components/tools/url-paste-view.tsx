import { useEffect, useState } from "react";
import { Eye, EyeOff, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";
import { type CodeLang } from "@/components/tools/code-editor";
import { MarkdownView } from "@/components/tools/markdown-view";
import { LANGUAGE_LABELS } from "@/lib/paste-languages";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  decodePaste,
  inspectPaste,
  BadPasswordError,
  NeedsPasswordError,
  CorruptError,
} from "@/lib/url-paste-codec";

type ViewStatus = "loading" | "ready" | "locked" | "empty" | "error";

interface Decoded {
  content: string;
  language: CodeLang;
}

function PasswordGate({
  fragment,
  onUnlocked,
}: {
  fragment: string;
  onUnlocked: (data: Decoded) => void;
}) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    setError("");
    try {
      const result = await decodePaste(fragment, password);
      onUnlocked({ content: result.content, language: result.language });
    } catch (err) {
      if (err instanceof BadPasswordError) {
        setError("Incorrect password.");
      } else if (err instanceof CorruptError) {
        setError("This link is corrupt or incomplete.");
      } else {
        setError("Failed to unlock.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16">
      <p className="text-sm font-medium">This paste is password protected.</p>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3 w-full max-w-xs">
        <div className="relative flex items-center">
          <input
            type={show ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
            autoFocus
            className="h-9 w-full rounded-lg border border-input bg-background pl-3 pr-9 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            className="absolute right-2.5 text-muted-foreground hover:text-foreground focus-visible:outline-none"
            aria-label={show ? "Hide password" : "Show password"}
          >
            {show ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <Button type="submit" size="sm" disabled={!password || loading}>
          {loading ? "Unlocking…" : "Unlock"}
        </Button>
      </form>
    </div>
  );
}

export default function UrlPasteView() {
  const [status, setStatus] = useState<ViewStatus>("loading");
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const [fragment, setFragment] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [mdMode, setMdMode] = useState<"rendered" | "raw">("rendered");

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      setStatus("empty");
      return;
    }
    setFragment(hash);
    try {
      const info = inspectPaste(hash);
      if (info.encrypted) {
        setStatus("locked");
        return;
      }
    } catch {
      setStatus("error");
      setErrorMsg("This link is corrupt or incomplete.");
      return;
    }

    let cancelled = false;
    decodePaste(hash)
      .then((result) => {
        if (cancelled) return;
        setDecoded({ content: result.content, language: result.language });
        setStatus("ready");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof NeedsPasswordError) {
          setStatus("locked");
        } else {
          setStatus("error");
          setErrorMsg(
            err instanceof CorruptError
              ? "This link is corrupt or incomplete."
              : "Failed to decode this link."
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleEditCopy = () => {
    if (!fragment) return;
    window.location.href = `/tools/url-paste#${fragment}`;
  };

  if (status === "loading") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center text-sm text-muted-foreground">
        Decoding…
      </div>
    );
  }

  if (status === "empty") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">
          No paste in this link.{" "}
          <a href="/tools/url-paste" className="font-medium text-foreground underline underline-offset-2">
            Create one
          </a>
          .
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-16 text-center">
        <p className="text-sm text-destructive">{errorMsg}</p>
      </div>
    );
  }

  if (status === "locked") {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8">
        <PasswordGate
          fragment={fragment}
          onUnlocked={(data) => {
            setDecoded(data);
            setStatus("ready");
          }}
        />
      </div>
    );
  }

  // ready
  const content = decoded?.content ?? "";
  const language = decoded?.language ?? "plain";
  const isMarkdown = language === "markdown";

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">
          {LANGUAGE_LABELS[language] ?? "Plain Text"}
        </span>
        {isMarkdown && (
          <SegmentedControl
            ariaLabel="View"
            value={mdMode}
            onChange={(v) => setMdMode(v as "rendered" | "raw")}
            options={[
              { value: "rendered", label: "Rendered" },
              { value: "raw", label: "Raw" },
            ]}
          />
        )}
        <div className="ml-auto flex gap-2">
          <CopyButton value={content} />
          <Button variant="outline" size="sm" onClick={handleEditCopy}>
            <Pencil className="h-4 w-4" />
            Edit a copy
          </Button>
        </div>
      </div>

      {isMarkdown && mdMode === "rendered" ? (
        <MarkdownView content={content} />
      ) : (
        <pre className="min-h-[320px] overflow-auto rounded-md border border-border bg-muted/20 p-4 text-sm">
          <code className="font-mono whitespace-pre">{content}</code>
        </pre>
      )}
    </div>
  );
}
