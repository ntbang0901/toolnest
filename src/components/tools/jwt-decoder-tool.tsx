import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

const SAMPLE =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjI1MzM2OTU2MDB9.signature";

const TIME_CLAIMS = new Set(["exp", "iat", "nbf", "auth_time", "updated_at"]);

function b64UrlDecode(seg: string): string {
  const norm = seg.replace(/-/g, "+").replace(/_/g, "/");
  const padded = norm + "===".slice((norm.length + 3) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

type Decoded =
  | { ok: true; header: unknown; payload: unknown; signature: string }
  | { ok: false; error: string };

function decode(token: string): Decoded {
  const parts = token.trim().split(".");
  if (parts.length !== 3) return { ok: false, error: "JWT must have 3 segments separated by '.'" };
  try {
    const header = JSON.parse(b64UrlDecode(parts[0]));
    const payload = JSON.parse(b64UrlDecode(parts[1]));
    return { ok: true, header, payload, signature: parts[2] };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Failed to decode" };
  }
}

function tsToString(s: number): string {
  const ms = s < 1e12 ? s * 1000 : s;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

export default function JwtDecoderTool() {
  const [input, setInput] = useState("");
  const [view, setView] = useState<"hint" | "raw">("hint");

  const decoded = useMemo(() => (input.trim() ? decode(input) : null), [input]);

  const expiry = useMemo(() => {
    if (!decoded || !decoded.ok) return null;
    const p = decoded.payload as Record<string, unknown>;
    const exp = typeof p.exp === "number" ? p.exp : null;
    if (!exp) return null;
    const ms = exp < 1e12 ? exp * 1000 : exp;
    return { expired: Date.now() >= ms, when: tsToString(exp) };
  }, [decoded]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">Token</span>
          <div className="flex items-center gap-2">
            <SegmentedControl
              size="sm"
              ariaLabel="View"
              value={view}
              onChange={(v) => setView(v as "hint" | "raw")}
              options={[
                { value: "hint", label: "Annotated" },
                { value: "raw", label: "Raw JSON" },
              ]}
            />
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
              Sample
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
          </div>
        </div>
        <CodeEditor
          value={input}
          onChange={setInput}
          language="plain"
          placeholder="Paste a JWT (header.payload.signature)…"
          minHeight="120px"
        />
        <p className="text-xs text-muted-foreground">
          Decode only — signature is not verified. Never paste production tokens you don't trust the source of.
        </p>
      </div>

      {decoded && !decoded.ok && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {decoded.error}
        </div>
      )}

      {decoded && decoded.ok && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="Header" data={decoded.header} view={view} />
          <Section title="Payload" data={decoded.payload} view={view} expiry={expiry} />
          <div className="flex flex-col gap-2 lg:col-span-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Signature</span>
              <CopyButton value={decoded.signature} label="" />
            </div>
            <div className="break-all rounded-md border border-border bg-muted/30 p-3 font-mono text-xs">
              {decoded.signature}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  data,
  view,
  expiry,
}: {
  title: string;
  data: unknown;
  view: "hint" | "raw";
  expiry?: { expired: boolean; when: string } | null;
}) {
  const json = JSON.stringify(data, null, 2);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <CopyButton value={json} label="" />
      </div>
      <CodeEditor
        value={view === "hint" ? prettyWithHints(data) : json}
        language="json"
        readOnly
        minHeight="120px"
      />
      {expiry && (
        <div className={`text-xs ${expiry.expired ? "text-destructive" : "text-muted-foreground"}`}>
          {expiry.expired ? "Expired" : "Valid"} · exp {expiry.when}
        </div>
      )}
    </div>
  );
}

function prettyWithHints(data: unknown): string {
  if (data == null || typeof data !== "object") return JSON.stringify(data, null, 2);
  const lines = JSON.stringify(data, null, 2).split("\n");
  return lines
    .map((line) => {
      const m = line.match(/^(\s*)"([^"]+)":\s+(\d+)(,?)$/);
      if (!m) return line;
      const [, ws, key, num, comma] = m;
      if (TIME_CLAIMS.has(key)) {
        const iso = tsToString(Number(num));
        if (iso) return `${ws}"${key}": ${num}${comma}  // ${iso}`;
      }
      return line;
    })
    .join("\n");
}
