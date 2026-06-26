import { useEffect, useRef, useState } from "react";
import { Check, Copy, Eye, EyeOff, Link, Lock, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor, type CodeLang } from "@/components/tools/code-editor";
import { LANGUAGES } from "@/lib/paste-languages";

type ExpiryTier = "free" | "pro" | "team";

interface ExpiryOption {
  value: string;
  label: string;
  tier: ExpiryTier;
}

const EXPIRY_OPTIONS: ExpiryOption[] = [
  { value: "1h", label: "1 hour", tier: "free" },
  { value: "24h", label: "24 hours", tier: "free" },
  { value: "7d", label: "7 days", tier: "free" },
  { value: "30d", label: "30 days", tier: "pro" },
  { value: "never", label: "Never expires", tier: "team" },
];

const TIER_LABELS: Record<ExpiryTier, string> = { free: "", pro: "Pro", team: "Team" };

// Current user tier — wire to auth system when available
const CURRENT_TIER: ExpiryTier = "free";

const TIER_ORDER: Record<ExpiryTier, number> = { free: 0, pro: 1, team: 2 };

function isTierAllowed(optionTier: ExpiryTier): boolean {
  return TIER_ORDER[CURRENT_TIER] >= TIER_ORDER[optionTier];
}

type Mode = "create" | "edit";
type Status = "idle" | "loading" | "success" | "copying" | "copied" | "error";

export default function PasteShareTool() {
  const [mode, setMode] = useState<Mode>("create");

  // create state
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState<CodeLang>("plain");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [expiresIn, setExpiresIn] = useState("7d");
  const [status, setStatus] = useState<Status>("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [editToken, setEditToken] = useState("");
  const [showEditToken, setShowEditToken] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const shareUrlRef = useRef<HTMLDivElement>(null);

  // edit state
  const [editPasteId, setEditPasteId] = useState("");
  const [editTokenInput, setEditTokenInput] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editLanguage, setEditLanguage] = useState<CodeLang>("plain");
  const [editStatus, setEditStatus] = useState<Status>("idle");
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  useEffect(() => {
    if (status === "copied") {
      const t = setTimeout(() => setStatus("success"), 1500);
      return () => clearTimeout(t);
    }
  }, [status]);

  const handleShare = async () => {
    if (!content.trim()) return;

    if (isSuccess && shareUrl) {
      handleCopy();
      return;
    }

    setStatus("loading");
    setErrorMsg("");

    try {
      const body: Record<string, string> = { content, language, expiresIn };
      if (password) body.password = password;

      const res = await fetch("/api/paste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
      }

      const data = (await res.json()) as { id: string; editToken: string };
      const url = `${window.location.origin}/paste?id=${data.id}`;
      setShareUrl(url);
      setEditToken(data.editToken);
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
    setPassword("");
    setExpiresIn("7d");
    setStatus("idle");
    setShareUrl("");
    setEditToken("");
    setShowEditToken(false);
    setErrorMsg("");
  };

  const handleExpiryChange = (value: string) => {
    const opt = EXPIRY_OPTIONS.find((o) => o.value === value);
    if (opt && !isTierAllowed(opt.tier)) return;
    setExpiresIn(value);
    if (isSuccess) handleReset();
  };

  const handleUpdate = async () => {
    if (!editPasteId.trim() || !editTokenInput.trim() || !editContent.trim()) return;
    setEditStatus("loading");
    setEditError("");
    setEditSuccess(false);

    try {
      const res = await fetch(`/api/paste/${encodeURIComponent(editPasteId.trim())}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          editToken: editTokenInput.trim(),
          content: editContent,
          language: editLanguage,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
      }

      setEditSuccess(true);
      setEditStatus("success");
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update paste");
      setEditStatus("error");
    }
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
      {/* Mode tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/30 p-1 w-fit">
        <button
          onClick={() => setMode("create")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "create"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Link className="h-3.5 w-3.5" />
          New paste
        </button>
        <button
          onClick={() => setMode("edit")}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
            mode === "edit"
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit paste
        </button>
      </div>

      {mode === "create" ? (
        <>
          {/* Top toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="lang-select" className="text-sm font-medium">Language</label>
            <select
              id="lang-select"
              value={language}
              onChange={(e) => {
                setLanguage(e.target.value as CodeLang);
                if (isSuccess) handleReset();
              }}
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:border-ring"
            >
              {LANGUAGES.map((l) => (
                <option key={l.value} value={l.value}>{l.label}</option>
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

          {/* Options row — shown above editor */}
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
            <div className="flex items-end gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="expiry-select" className="text-xs font-medium text-muted-foreground">Expires</label>
                <select
                  id="expiry-select"
                  value={expiresIn}
                  onChange={(e) => handleExpiryChange(e.target.value)}
                  className="h-8 rounded-md border border-input bg-background px-2.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {EXPIRY_OPTIONS.map((opt) => {
                    const allowed = isTierAllowed(opt.tier);
                    const badge = TIER_LABELS[opt.tier];
                    return (
                      <option key={opt.value} value={opt.value} disabled={!allowed}>
                        {opt.label}{badge ? ` (${badge})` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="flex flex-col gap-1.5 flex-1 min-w-[160px] max-w-xs">
                <label htmlFor="paste-password" className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Lock className="h-3 w-3" />
                  Password <span className="font-normal">(optional)</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    id="paste-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Leave blank for public"
                    autoComplete="new-password"
                    className="h-8 w-full rounded-md border border-input bg-background pl-2.5 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2 text-muted-foreground hover:text-foreground focus-visible:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {CURRENT_TIER === "free" && (
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Pro</span> unlocks 30-day expiry.{" "}
                <span className="font-medium text-foreground">Team</span> unlocks permanent pastes.
              </p>
            )}
          </div>

          {/* Editor */}
          <CodeEditor
            value={content}
            onChange={setContent}
            language={language}
            placeholder="Paste your content here..."
            minHeight="320px"
          />

          {/* Share URL + edit token */}
          {isSuccess && shareUrl && (
            <div ref={shareUrlRef} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium">Link:</span>
                <span className="text-muted-foreground break-all flex-1">{shareUrl}</span>
                {password && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                    <Lock className="h-2.5 w-2.5" /> password protected
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap border-t border-border pt-2">
                <span className="font-medium text-muted-foreground">Edit token:</span>
                <span className={`font-mono flex-1 break-all ${showEditToken ? "text-foreground" : "blur-sm select-none text-muted-foreground"}`}>
                  {editToken}
                </span>
                <button
                  type="button"
                  onClick={() => setShowEditToken((v) => !v)}
                  className="text-muted-foreground hover:text-foreground focus-visible:outline-none shrink-0"
                  aria-label={showEditToken ? "Hide edit token" : "Show edit token"}
                >
                  {showEditToken ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
                <button
                  type="button"
                  onClick={() => navigator.clipboard.writeText(editToken).catch(() => {})}
                  className="text-muted-foreground hover:text-foreground focus-visible:outline-none shrink-0"
                  aria-label="Copy edit token"
                >
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-muted-foreground">Save your edit token — it won't be shown again.</p>
            </div>
          )}

          {status === "error" && errorMsg && (
            <p className="text-sm text-destructive">{errorMsg}</p>
          )}
        </>
      ) : (
        /* Edit mode */
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-3">
            <div className="flex flex-col gap-1.5 flex-1 min-w-[140px]">
              <label htmlFor="edit-paste-id" className="text-xs font-medium text-muted-foreground">Paste ID</label>
              <input
                id="edit-paste-id"
                type="text"
                value={editPasteId}
                onChange={(e) => setEditPasteId(e.target.value)}
                placeholder="e.g. aB3xKj9M"
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label htmlFor="edit-token-input" className="text-xs font-medium text-muted-foreground">Edit token</label>
              <input
                id="edit-token-input"
                type="text"
                value={editTokenInput}
                onChange={(e) => setEditTokenInput(e.target.value)}
                placeholder="Paste your edit token"
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm font-mono placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-lang-select" className="text-xs font-medium text-muted-foreground">Language</label>
              <select
                id="edit-lang-select"
                value={editLanguage}
                onChange={(e) => setEditLanguage(e.target.value as CodeLang)}
                className="h-9 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <CodeEditor
            value={editContent}
            onChange={setEditContent}
            language={editLanguage}
            placeholder="Paste the updated content here..."
            minHeight="320px"
          />

          <div className="flex items-center justify-between gap-3">
            {editSuccess ? (
              <p className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <Check className="h-4 w-4" /> Paste updated successfully.
              </p>
            ) : editError ? (
              <p className="text-sm text-destructive">{editError}</p>
            ) : (
              <span />
            )}
            <Button
              size="sm"
              onClick={handleUpdate}
              disabled={
                !editPasteId.trim() ||
                !editTokenInput.trim() ||
                !editContent.trim() ||
                editStatus === "loading"
              }
            >
              {editStatus === "loading" ? "Saving…" : "Save changes"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
