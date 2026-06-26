import { useEffect, useState } from "react";
import { Check, ChevronDown, ChevronUp, Eye, EyeOff, Pencil, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor, type CodeLang } from "@/components/tools/code-editor";
import { MarkdownView } from "@/components/tools/markdown-view";
import { LANGUAGES, LANGUAGE_LABELS } from "@/lib/paste-languages";
import { SegmentedControl } from "@/components/ui/segmented-control";

interface PasteData {
  content: string;
  language: CodeLang;
  createdAt: string;
  updatedAt?: string;
}

type FetchStatus = "loading" | "success" | "error" | "no-id" | "locked";

// ---------------------------------------------------------------------------
// Password gate
// ---------------------------------------------------------------------------
function PasswordGate({
  pasteId,
  onUnlocked,
}: {
  pasteId: string;
  onUnlocked: (data: PasteData) => void;
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
      const res = await fetch(`/api/paste/${pasteId}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || "Incorrect password");
      }
      const data = (await res.json()) as PasteData;
      onUnlocked(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unlock");
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

// ---------------------------------------------------------------------------
// Edit / Renew panel
// ---------------------------------------------------------------------------
function EditPanel({
  pasteId,
  paste,
  onUpdated,
}: {
  pasteId: string;
  paste: PasteData;
  onUpdated: (data: PasteData) => void;
}) {
  const [open, setOpen] = useState(false);
  const [editToken, setEditToken] = useState("");
  const [content, setContent] = useState(paste.content);
  const [language, setLanguage] = useState<CodeLang>(paste.language);
  const [saving, setSaving] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [saveOk, setSaveOk] = useState(false);
  const [renewOk, setRenewOk] = useState(false);
  const [error, setError] = useState("");

  // sync if paste prop changes (e.g. after renew)
  useEffect(() => {
    setContent(paste.content);
    setLanguage(paste.language);
  }, [paste]);

  const callPut = async (body: Record<string, unknown>) => {
    const res = await fetch(`/api/paste/${pasteId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ editToken, ...body }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<{ id: string; updatedAt: string }>;
  };

  const handleSave = async () => {
    if (!editToken.trim()) return;
    setSaving(true);
    setError("");
    setSaveOk(false);
    try {
      const result = await callPut({ content, language });
      const updated: PasteData = { ...paste, content, language, updatedAt: result.updatedAt };
      onUpdated(updated);
      setSaveOk(true);
      setTimeout(() => setSaveOk(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleRenew = async () => {
    if (!editToken.trim()) return;
    setRenewing(true);
    setError("");
    setRenewOk(false);
    try {
      const result = await callPut({ renewOnly: true });
      onUpdated({ ...paste, updatedAt: result.updatedAt });
      setRenewOk(true);
      setTimeout(() => setRenewOk(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to renew");
    } finally {
      setRenewing(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-muted/20">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-sm font-medium hover:bg-muted/40 transition-colors"
      >
        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        Edit / Renew this paste
        {open ? (
          <ChevronUp className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
        ) : (
          <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
        )}
      </button>

      {open && (
        <div className="flex flex-col gap-4 border-t border-border px-4 py-4">
          {/* Edit token */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="view-edit-token" className="text-xs font-medium text-muted-foreground">
              Edit token
            </label>
            <input
              id="view-edit-token"
              type="text"
              value={editToken}
              onChange={(e) => setEditToken(e.target.value)}
              placeholder="Paste your edit token"
              className="h-8 rounded-md border border-input bg-background px-3 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {/* Renew */}
          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={handleRenew}
              disabled={!editToken.trim() || renewing || saving}
            >
              {renewOk ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Renewed!
                </>
              ) : (
                <>
                  <RefreshCw className="h-3.5 w-3.5" />
                  {renewing ? "Renewing…" : "Renew 7 days"}
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">Extends expiry by 7 days without changing content.</p>
          </div>

          {/* Language picker */}
          <div className="flex items-center gap-2">
            <label htmlFor="view-lang-select" className="text-xs font-medium text-muted-foreground shrink-0">
              Language
            </label>
            <select
              id="view-lang-select"
              value={language}
              onChange={(e) => setLanguage(e.target.value as CodeLang)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>

          {/* Editor */}
          <CodeEditor
            value={content}
            onChange={setContent}
            language={language}
            minHeight="240px"
          />

          {/* Error / Save */}
          <div className="flex items-center justify-between gap-3">
            {error ? (
              <p className="text-xs text-destructive">{error}</p>
            ) : (
              <span />
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!editToken.trim() || saving || renewing}
            >
              {saveOk ? (
                <>
                  <Check className="h-3.5 w-3.5" /> Saved!
                </>
              ) : saving ? (
                "Saving…"
              ) : (
                "Save changes"
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main view
// ---------------------------------------------------------------------------
export default function PasteView() {
  const [status, setStatus] = useState<FetchStatus>("loading");
  const [paste, setPaste] = useState<PasteData | null>(null);
  const [pasteId, setPasteId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [mdView, setMdView] = useState<"rendered" | "raw">("rendered");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id") ?? "";
    setPasteId(id);

    if (!id) {
      setStatus("no-id");
      return;
    }

    fetch(`/api/paste/${id}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Paste not found or expired.");
        const data = await res.json();
        if ((data as { passwordProtected?: boolean }).passwordProtected) {
          setStatus("locked");
        } else {
          setPaste(data as PasteData);
          setStatus("success");
        }
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

  if (status === "locked") {
    return (
      <PasswordGate
        pasteId={pasteId}
        onUnlocked={(data) => {
          setPaste(data);
          setStatus("success");
        }}
      />
    );
  }

  if (!paste) return null;

  const createdDate = new Date(paste.createdAt).toLocaleString();
  const updatedDate = paste.updatedAt ? new Date(paste.updatedAt).toLocaleString() : null;
  const langLabel = LANGUAGE_LABELS[paste.language] || paste.language;
  const isMarkdown = paste.language === "markdown";

  return (
    <div className="flex flex-col gap-4">
      {/* Header bar */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-md bg-secondary px-2 py-1 text-xs font-medium">{langLabel}</span>
        <span className="text-xs text-muted-foreground">Created {createdDate}</span>
        {updatedDate && (
          <span className="text-xs text-muted-foreground">· Updated {updatedDate}</span>
        )}
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

      {/* Content */}
      {isMarkdown && mdView === "rendered" ? (
        <MarkdownView content={paste.content} />
      ) : (
        <CodeEditor value={paste.content} language={paste.language} readOnly minHeight="320px" />
      )}

      {/* Edit / Renew panel */}
      <EditPanel pasteId={pasteId} paste={paste} onUpdated={setPaste} />
    </div>
  );
}
