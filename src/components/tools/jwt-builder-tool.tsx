import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

// Web Crypto based HMAC-SHA256 JWT builder — runs entirely in the browser

async function base64url(data: ArrayBuffer | string): Promise<string> {
  let bytes: Uint8Array;
  if (typeof data === "string") {
    bytes = new TextEncoder().encode(data);
  } else {
    bytes = new Uint8Array(data);
  }
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

async function signHS256(header: string, payload: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const keyData = enc.encode(secret);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const headerB64 = await base64url(header);
  const payloadB64 = await base64url(payload);
  const signingInput = `${headerB64}.${payloadB64}`;
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(signingInput));
  const sigB64 = await base64url(sig);
  return `${signingInput}.${sigB64}`;
}

const DEFAULT_PAYLOAD = JSON.stringify(
  { sub: "1234567890", name: "Alice", iat: Math.floor(Date.now() / 1000) },
  null,
  2
);

export default function JwtBuilderTool() {
  const [algorithm] = useState("HS256");
  const [secret, setSecret] = useState("your-256-bit-secret");
  const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD);
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [building, setBuilding] = useState(false);

  const payloadError = useMemo(() => {
    try { JSON.parse(payloadText); return ""; }
    catch (e) { return (e as Error).message; }
  }, [payloadText]);

  async function build() {
    setError("");
    if (payloadError) { setError("Fix payload JSON first."); return; }
    setBuilding(true);
    try {
      const header = JSON.stringify({ alg: algorithm, typ: "JWT" });
      const jwt = await signHS256(header, payloadText.trim(), secret);
      setToken(jwt);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBuilding(false);
    }
  }

  function addClaim(key: string, value: unknown) {
    try {
      const obj = JSON.parse(payloadText);
      obj[key] = value;
      setPayloadText(JSON.stringify(obj, null, 2));
    } catch {}
  }

  const parts = token.split(".");

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Algorithm</label>
          <div className="flex h-9 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
            HS256 (HMAC-SHA256)
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Secret</label>
          <input
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Payload (JSON)</label>
          <div className="flex gap-1.5">
            {[
              ["exp", Math.floor(Date.now() / 1000) + 3600, "exp +1h"],
              ["iat", Math.floor(Date.now() / 1000), "iat now"],
              ["jti", crypto.randomUUID(), "jti"],
            ].map(([k, v, label]) => (
              <Button key={String(k)} variant="ghost" size="sm" onClick={() => addClaim(String(k), v)}>
                + {label}
              </Button>
            ))}
          </div>
        </div>
        <CodeEditor
          value={payloadText}
          onChange={setPayloadText}
          language="json"
          minHeight="160px"
        />
        {payloadError && <p className="text-xs text-destructive">{payloadError}</p>}
      </div>

      <Button onClick={build} disabled={building || !!payloadError} size="lg" className="self-start">
        {building ? "Signing…" : "Build JWT"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {token && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Token</span>
            <CopyButton value={token} label="" />
          </div>
          <div className="rounded-md border border-border bg-card p-3 font-mono text-xs break-all leading-relaxed">
            <span className="text-red-500">{parts[0]}</span>
            <span className="text-muted-foreground">.</span>
            <span className="text-purple-500">{parts[1]}</span>
            <span className="text-muted-foreground">.</span>
            <span className="text-cyan-500">{parts[2]}</span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 text-xs">
            {[["Header", parts[0], "text-red-500"], ["Payload", parts[1], "text-purple-500"], ["Signature", parts[2], "text-cyan-500"]].map(
              ([label, val, color]) => (
                <div key={label} className="rounded-md border border-border bg-card p-2">
                  <div className={`font-medium mb-1 ${color}`}>{label}</div>
                  <div className="font-mono break-all text-muted-foreground">{val}</div>
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
