import { useState, useMemo } from "react";
import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { CodeEditor } from "@/components/tools/code-editor";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

type Severity = "error" | "warning" | "info";

interface LintResult {
  line: number;
  rule: string;
  severity: Severity;
  message: string;
}

const SAMPLE_DOCKERFILE = `FROM ubuntu:latest
MAINTAINER dev@example.com

RUN apt-get update && apt-get install -y python3 pip curl wget

RUN apt-get upgrade -y

USER root

WORKDIR relative/path

RUN cd /app && npm install

RUN sudo apt-get install -y git

ADD ./app.tar.gz /app/

RUN pip install requests flask

CMD python3 app.py
`;

// ─── lint rules ──────────────────────────────────────────────────────────────

function lint(content: string): LintResult[] {
  const lines = content.split("\n");
  const results: LintResult[] = [];

  // Track state across lines
  let lastUserLine = -1;
  let lastUserIsRoot = false;
  let hasShellSet = false;
  let hasPipefailCheck = false;

  // Pre-scan for SHELL with pipefail
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^SHELL\s+\[.*pipefail/i.test(trimmed)) {
      hasShellSet = true;
      hasPipefailCheck = true;
    }
  }

  lines.forEach((rawLine, idx) => {
    const lineNum = idx + 1;
    const line = rawLine.trim();

    // Skip comments and empty lines
    if (!line || line.startsWith("#")) return;

    // Extract instruction and rest
    const spaceIdx = line.indexOf(" ");
    const instruction = spaceIdx > -1 ? line.slice(0, spaceIdx).toUpperCase() : line.toUpperCase();
    const rest = spaceIdx > -1 ? line.slice(spaceIdx + 1).trim() : "";

    // DL4000: MAINTAINER is deprecated
    if (instruction === "MAINTAINER") {
      results.push({
        line: lineNum,
        rule: "DL4000",
        severity: "error",
        message: "MAINTAINER is deprecated. Use a LABEL instead.",
      });
    }

    // DL3007: Use specific tag instead of latest
    if (instruction === "FROM") {
      // Handle FROM ... AS alias
      const fromPart = rest.split(/\s+as\s+/i)[0].trim();
      // Skip scratch and images without tags
      if (fromPart !== "scratch" && !fromPart.startsWith("$")) {
        const atIdx = fromPart.indexOf("@");
        const colonIdx = fromPart.indexOf(":");
        if (atIdx === -1) {
          // No digest
          if (colonIdx === -1 || fromPart.slice(colonIdx + 1) === "latest") {
            results.push({
              line: lineNum,
              rule: "DL3007",
              severity: "warning",
              message: `Using latest is prone to errors if the image will ever update. Pin the version explicitly to a release tag.`,
            });
          }
        }
      }
    }

    // DL3000: Use absolute WORKDIR
    if (instruction === "WORKDIR") {
      const dir = rest.replace(/^["']|["']$/g, "");
      if (!dir.startsWith("/") && !dir.startsWith("$")) {
        results.push({
          line: lineNum,
          rule: "DL3000",
          severity: "error",
          message: `Use absolute WORKDIR. Found relative path: "${dir}".`,
        });
      }
    }

    // DL3003: Use WORKDIR to switch directories instead of cd
    if (instruction === "RUN") {
      const runBody = rest;
      // Match cd that changes directory (not cd into subshell expressions)
      if (/(?:^|&&|\|\||;)\s*cd\s+[^\s|&;]/.test(runBody)) {
        results.push({
          line: lineNum,
          rule: "DL3003",
          severity: "warning",
          message: "Use WORKDIR to switch to a directory instead of `cd` in a RUN command.",
        });
      }
    }

    // DL3001: Don't use apt-get upgrade or dist-upgrade
    if (instruction === "RUN") {
      if (/apt-get\s+(upgrade|dist-upgrade)/.test(rest)) {
        results.push({
          line: lineNum,
          rule: "DL3001",
          severity: "warning",
          message: "Do not use `apt-get upgrade` or `dist-upgrade`. Upgrade your base image instead.",
        });
      }
    }

    // DL3004: Don't use sudo
    if (instruction === "RUN") {
      if (/\bsudo\b/.test(rest)) {
        results.push({
          line: lineNum,
          rule: "DL3004",
          severity: "error",
          message: "Do not use sudo — the build runs as root, and sudo in images is a security risk.",
        });
      }
    }

    // DL3006: Use --no-install-recommends with apt-get install
    if (instruction === "RUN") {
      if (/apt-get\s+install\b/.test(rest) && !/--no-install-recommends/.test(rest)) {
        results.push({
          line: lineNum,
          rule: "DL3006",
          severity: "warning",
          message: "Always use `--no-install-recommends` with `apt-get install` to reduce image size.",
        });
      }
    }

    // DL3008: Pin versions in apt-get install
    if (instruction === "RUN") {
      if (/apt-get\s+install\b/.test(rest)) {
        // Extract packages: words after install that don't look like flags
        const pkgSection = rest.replace(/^.*apt-get\s+install\s+/, "");
        // Simple heuristic: look for packages without '=' version pins
        const tokens = pkgSection.split(/\s+/).filter((t) => t && !t.startsWith("-") && !t.startsWith("\\"));
        const unpinned = tokens.filter((t) => !t.includes("=") && /^[a-z]/.test(t));
        if (unpinned.length > 0) {
          results.push({
            line: lineNum,
            rule: "DL3008",
            severity: "warning",
            message: `Pin versions in apt-get install. Unversioned packages: ${unpinned.join(", ")}.`,
          });
        }
      }
    }

    // DL3009: Delete apt lists after install
    if (instruction === "RUN") {
      if (/apt-get\s+install\b/.test(rest) && !/rm\s+-rf\s+\/var\/lib\/apt\/lists/.test(rest)) {
        results.push({
          line: lineNum,
          rule: "DL3009",
          severity: "info",
          message: "Delete the apt-get lists after installing: `rm -rf /var/lib/apt/lists/*`.",
        });
      }
    }

    // DL3015: Avoid additional packages (--no-install-recommends already covers this,
    // but flag if -y is used without --no-install-recommends guard)
    // (covered partly by DL3006; skip duplicate)

    // DL3013: Pin versions in pip install
    if (instruction === "RUN") {
      if (/pip[23]?\s+install\b/.test(rest)) {
        // Look for packages without ==, >=, <=, ~= version specifiers
        const pipSection = rest.replace(/^.*pip[23]?\s+install\s+/, "");
        const pipTokens = pipSection
          .split(/\s+/)
          .filter((t) => t && !t.startsWith("-") && !t.startsWith("\\") && /^[a-zA-Z]/.test(t));
        const unpinnedPip = pipTokens.filter((t) => !/[=<>~!]/.test(t));
        if (unpinnedPip.length > 0) {
          results.push({
            line: lineNum,
            rule: "DL3013",
            severity: "warning",
            message: `Pin versions in pip install. Unversioned packages: ${unpinnedPip.join(", ")}.`,
          });
        }
      }
    }

    // DL3020: Use COPY instead of ADD for files/directories
    if (instruction === "ADD") {
      // ADD is valid for URLs and tar auto-extraction; flag plain file copies
      const src = rest.split(/\s+/)[0];
      const isUrl = /^https?:\/\//.test(src);
      const isTar = /\.(tar|tar\.gz|tgz|tar\.bz2|tar\.xz|tar\.zst)$/.test(src);
      if (!isUrl && !isTar) {
        results.push({
          line: lineNum,
          rule: "DL3020",
          severity: "error",
          message: "Use COPY instead of ADD for files and directories.",
        });
      }
    }

    // DL3025: Use JSON (exec) form for CMD and ENTRYPOINT
    if (instruction === "CMD" || instruction === "ENTRYPOINT") {
      if (!rest.startsWith("[")) {
        results.push({
          line: lineNum,
          rule: "DL3025",
          severity: "warning",
          message: `Use the JSON (exec) array form for ${instruction}: e.g., ${instruction} ["executable", "arg1"].`,
        });
      }
    }

    // Track USER for DL3002
    if (instruction === "USER") {
      lastUserLine = lineNum;
      const user = rest.split(":")[0].trim().toLowerCase();
      lastUserIsRoot = user === "root" || user === "0";
    }

    // DL4006: Set SHELL option for pipefail
    // Check RUN commands that use pipes without pipefail SHELL being set
    if (instruction === "RUN" && !hasShellSet) {
      if (/\|/.test(rest) && !/set\s+-[eo]*\s*pipefail/.test(rest)) {
        hasPipefailCheck = false; // flag below after full scan
        results.push({
          line: lineNum,
          rule: "DL4006",
          severity: "warning",
          message:
            "Use `SHELL [\"/bin/bash\", \"-o\", \"pipefail\", \"-c\"]` before RUN commands with pipes, or add `set -o pipefail` inline.",
        });
      }
    }
  });

  // DL3002: Last USER should not be root (post-scan)
  if (lastUserLine > -1 && lastUserIsRoot) {
    results.push({
      line: lastUserLine,
      rule: "DL3002",
      severity: "warning",
      message: "Last USER should not be root. Add a non-root USER at the end of the Dockerfile.",
    });
  }

  // Sort by line number, then severity
  const severityOrder: Record<Severity, number> = { error: 0, warning: 1, info: 2 };
  return results.sort((a, b) => a.line - b.line || severityOrder[a.severity] - severityOrder[b.severity]);
}

// ─── severity UI helpers ──────────────────────────────────────────────────────

const SEVERITY_CONFIG: Record<
  Severity,
  { icon: React.ComponentType<{ className?: string }>; label: string; colors: string; badge: string }
> = {
  error: {
    icon: AlertCircle,
    label: "Error",
    colors: "border-rose-500/30 bg-rose-500/5 text-rose-600 dark:text-rose-400",
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    colors: "border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400",
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  },
  info: {
    icon: Info,
    label: "Info",
    colors: "border-sky-500/30 bg-sky-500/5 text-sky-600 dark:text-sky-400",
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
  },
};

// ─── component ────────────────────────────────────────────────────────────────

export default function DockerfileLinterTool() {
  const [content, setContent] = useState(SAMPLE_DOCKERFILE);

  const results = useMemo(() => lint(content), [content]);

  const counts = useMemo(
    () => ({
      error: results.filter((r) => r.severity === "error").length,
      warning: results.filter((r) => r.severity === "warning").length,
      info: results.filter((r) => r.severity === "info").length,
    }),
    [results],
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => setContent(SAMPLE_DOCKERFILE)}>
          Sample
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setContent("")} disabled={!content}>
          Clear
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          {results.length === 0 ? "No issues found" : `${results.length} issue${results.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Dockerfile</span>
            <CopyButton value={content} />
          </div>
          <CodeEditor
            value={content}
            onChange={setContent}
            language="plain"
            placeholder="Paste your Dockerfile here…"
            minHeight="400px"
            className="lg:min-h-[520px]"
          />
        </div>

        {/* Results */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Results</span>
            {results.length > 0 && (
              <div className="flex items-center gap-1.5 ml-1">
                {counts.error > 0 && (
                  <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                    {counts.error} error{counts.error !== 1 ? "s" : ""}
                  </span>
                )}
                {counts.warning > 0 && (
                  <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                    {counts.warning} warning{counts.warning !== 1 ? "s" : ""}
                  </span>
                )}
                {counts.info > 0 && (
                  <span className="rounded px-1.5 py-0.5 text-xs font-medium bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                    {counts.info} info
                  </span>
                )}
              </div>
            )}
          </div>

          {results.length === 0 ? (
            <div className="flex min-h-[120px] items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-sm text-emerald-600 dark:text-emerald-400">
              No issues found — looking good!
            </div>
          ) : (
            <ul className="flex flex-col gap-2 overflow-y-auto lg:max-h-[520px]" role="list" aria-label="Lint results">
              {results.map((r, i) => {
                const cfg = SEVERITY_CONFIG[r.severity];
                const Icon = cfg.icon;
                return (
                  <li
                    key={i}
                    className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm ${cfg.colors}`}
                  >
                    <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-medium ${cfg.badge}`}>
                          {r.rule}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">line {r.line}</span>
                      </div>
                      <p className="mt-1 leading-snug">{r.message}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Rules based on{" "}
        <a
          href="https://github.com/hadolint/hadolint"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2 hover:text-foreground"
        >
          hadolint
        </a>{" "}
        best practices. Client-side only — no Dockerfile content is sent to any server.
      </p>
    </div>
  );
}
