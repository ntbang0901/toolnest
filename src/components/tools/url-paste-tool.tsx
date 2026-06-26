import { useEffect, useRef, useState } from "react";
import { Check, Copy, Link, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CodeEditor, type CodeLang } from "@/components/tools/code-editor";
import { LANGUAGES } from "@/lib/paste-languages";
import { encodePaste, estimateCompressedSize } from "@/lib/url-paste-codec";

type Status = "idle" | "encoding" | "success" | "copying" | "copied" | "error";

// Size thresholds for the compressed payload (bytes). The meter colors and
// guidance text key off these. Real-world URL sharing breaks well before the
// browser's ~2MB fragment ceiling, so the buckets are deliberately small.
const SIZE_GREEN = 2 * 1024; // safe to share anywhere
const SIZE_AMBER = 8 * 1024; // browsers fine; some chat apps truncate
const SIZE_ORANGE = 32 * 1024; // pushing it; use sparingly
// beyond SIZE_ORANGE → red: too large to share via URL

type SizeTier = "empty" | "green" | "amber" | "orange" | "red";

function tierForSize(bytes: number): SizeTier {
  if (bytes === 0) return "empty";
  if (bytes < SIZE_GREEN) return "green";
  if (bytes < SIZE_AMBER) return "amber";
  if (bytes < SIZE_ORANGE) return "orange";
  return "red";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

const TIER_STYLES: Record<SizeTier, { bar: string; text: string }> = {
  empty: { bar: "bg-muted", text: "text-muted-foreground" },
  green: { bar: "bg-green-500", text: "text-green-600 dark:text-green-400" },
  amber: { bar: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" },
  orange: { bar: "bg-orange-500", text: "text-orange-600 dark:text-orange-400" },
  red: { bar: "bg-destructive", text: "text-destructive" },
};

export default function UrlPasteTool() {
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState<CodeLang>("plain");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [shareUrl, setShareUrl] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // Live size estimate of the compressed payload.
  const [compressedSize, setCompressedSize] = useState(0);
  const shareUrlRef = useRef<HTMLDivElement>(null);

  // On load, hydrate from a fragment if present (so "Edit a copy" links work).
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    let cancelled = false;
    import("@/lib/url-paste-codec").then(async ({ decodePaste, inspectPaste }) => {
      try {
        const info = inspectPaste(hash);
        // Encrypted forks can't be pre-filled without the password; skip.
        if (info.encrypted) return;
        const result = await decodePaste(hash);
        if (cancelled) return;
        setContent(result.content);
        setLanguage(result.language);
        // Clear the fragment so a later "Generate" doesn't look pre-shared.
        history.replaceState(null, "", window.location.pathname + window.location.search);
      } catch {
        // ignore malformed incoming fragment
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Recompute compressed size when content changes (debounced).
  useEffect(() => {
    if (!content) {
      setCompressedSize(0);
      return;
    }
    let cancelled = false;
    const t = setTimeout(() => {
      estimateCompressedSize(content)
        .then((size) => {
          if (!cancelled) setCompressedSize(size);
        })
        .catch(() => {});
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [content]);

  useEffect(() => {
    if (status === "copied") {
      const t = setTimeout(() => setStatus("success"), 1500);
      return () => clearTimeout(t);
    }
  }, [status]);

  const tier = tierForSize(compressedSize);
  const tooLarge = tier === "red";

  const handleGenerate = async () => {
    if (!content.trim() || tooLarge) return;

    if (isSuccess && shareUrl) {
      handleCopy();
      return;
    }

    setStatus("encoding");
    setErrorMsg("");
    try {
      const fragment = await encodePaste({
        content,
        language,
        password: password || undefined,
      });
      const url = `${window.location.origin}/u#${fragment}`;
      setShareUrl(url);
      setStatus("copying");
      await navigator.clipboard.writeText(url).catch(() => {});
      setStatus("copied");
      requestAnimationFrame(() => {
        shareUrlRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Failed to build link");
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
    setStatus("idle");
    setShareUrl("");
    setErrorMsg("");
  };

  const isSuccess = status === "success" || status === "copied" || status === "copying";

  const buttonLabel =
    status === "encoding" ? "Building link…"
    : status === "copying" ? "Copying…"
    : status === "copied" ? "Copied!"
    : isSuccess ? "Copy link again"
    : "Generate link";

  const ButtonIcon = status === "copied" ? Check : isSuccess ? Copy : Link;

  // Meter fill proportion against the red threshold.
  const fillPct = Math.min(100, (compressedSize / SIZE_ORANGE) * 100);
  const urlLength = shareUrl.length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Compresses your content into the link itself — nothing is sent to any server.
        The whole paste lives in the URL fragment, so it works offline and stays private.
        For very large content, use the server-backed{" "}
        <a href="/tools/paste-share" className="font-medium text-foreground underline underline-offset-2">
          Paste &amp; Share
        </a>{" "}
        instead.
      </p>

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
            onClick={handleGenerate}
            disabled={!content.trim() || tooLarge || status === "encoding" || status === "copying"}
            variant={status === "copied" ? "outline" : "default"}
          >
            <ButtonIcon className="h-4 w-4" />
            {buttonLabel}
          </Button>
        </div>
      </div>

      {/* Password option */}
      <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 px-4 py-3">
        <div className="flex flex-col gap-1.5 max-w-xs">
          <label htmlFor="paste-password" className="flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <Lock className="h-3 w-3" />
            Password <span className="font-normal">(optional)</span>
          </label>
          <div className="relative flex items-center">
            <input
              id="paste-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (isSuccess) handleReset();
              }}
              placeholder="Encrypt before sharing"
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
          <p className="text-xs text-muted-foreground">
            Encrypted client-side (AES-GCM). The password is never stored in the link.
          </p>
        </div>
      </div>

      {/* Editor */}
      <CodeEditor
        value={content}
        onChange={setContent}
        language={language}
        placeholder="Paste your content here..."
        minHeight="320px"
      />

      {/* Size meter */}
      <div className="flex flex-col gap-1.5 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="font-medium">Compressed size</span>
          <span className={`font-mono ${TIER_STYLES[tier].text}`}>
            {formatBytes(compressedSize)}
            {shareUrl ? ` · URL ${formatBytes(urlLength)}` : ""}
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${TIER_STYLES[tier].bar}`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
        <p className={TIER_STYLES[tier].text}>
          {tier === "empty" && "Type or paste content to see how large the link will be."}
          {tier === "green" && "Safe to share anywhere — links, chat, email."}
          {tier === "amber" && "Fine in browsers; some chat apps may truncate very long links."}
          {tier === "orange" && "Large link — works in browsers but risky for chat/email. Consider trimming."}
          {tier === "red" && (
            <>
              Too large to share reliably via URL. Use the server-backed{" "}
              <a href="/tools/paste-share" className="font-medium underline underline-offset-2">
                Paste &amp; Share
              </a>{" "}
              for content this size.
            </>
          )}
        </p>
      </div>

      {/* Share URL */}
      {isSuccess && shareUrl && (
        <div ref={shareUrlRef} className="flex flex-col gap-2 rounded-lg border border-border bg-muted/20 px-4 py-3 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium">Link:</span>
            <span className="text-muted-foreground break-all flex-1">{shareUrl}</span>
            {password && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
                <Lock className="h-2.5 w-2.5" /> encrypted
              </span>
            )}
          </div>
          <p className="text-muted-foreground">
            The content lives entirely in the link — anyone with it can open the paste.
          </p>
        </div>
      )}

      {status === "error" && errorMsg && (
        <p className="text-sm text-destructive">{errorMsg}</p>
      )}
    </div>
  );
}
