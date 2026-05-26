import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";

const SECRET_DEFAULT = "JBSWY3DPEHPK3PXP";

function base32ToBytes(input: string): Uint8Array {
  const cleaned = input.toUpperCase().replace(/=+$/g, "").replace(/\s+/g, "");
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes: number[] = [];
  let bits = 0;
  let value = 0;
  for (const ch of cleaned) {
    const idx = alphabet.indexOf(ch);
    if (idx === -1) throw new Error(`Invalid base32 char: ${ch}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((value >> bits) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

async function totp(secret: string, period = 30, digits = 6, algorithm: "SHA-1" | "SHA-256" | "SHA-512" = "SHA-1"): Promise<string> {
  const key = base32ToBytes(secret);
  const counter = Math.floor(Date.now() / 1000 / period);
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setBigUint64(0, BigInt(counter));
  const cryptoKey = await crypto.subtle.importKey("raw", key.buffer as ArrayBuffer, { name: "HMAC", hash: algorithm }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, buf));
  const offset = sig[sig.length - 1] & 0x0f;
  const code =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);
  return (code % 10 ** digits).toString().padStart(digits, "0");
}

export default function TotpTool() {
  const [secret, setSecret] = useState(SECRET_DEFAULT);
  const [code, setCode] = useState("------");
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 250);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!secret.trim()) {
      setCode("------");
      setError(null);
      return;
    }
    let alive = true;
    totp(secret)
      .then((c) => alive && (setCode(c), setError(null)))
      .catch((err) => alive && (setCode("------"), setError(err.message)));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secret, Math.floor(now / 30)]);

  const remaining = useMemo(() => 30 - (now % 30), [now]);
  const pct = (remaining / 30) * 100;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="totp-secret">
          Base32 secret
        </label>
        <Input
          id="totp-secret"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder="JBSWY3DPEHPK3PXP"
          className="font-mono uppercase"
          spellCheck={false}
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>

      <div className="flex flex-col items-center gap-3 rounded-md border border-border bg-card p-6">
        <div className="font-mono text-5xl tracking-[0.5em] tabular-nums">{code}</div>
        <div className="flex w-full max-w-xs items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-brand transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="font-mono text-xs text-muted-foreground">{remaining}s</span>
        </div>
        <CopyButton value={code === "------" ? "" : code} label="Copy code" />
      </div>

      <p className="text-xs text-muted-foreground">
        RFC 6238 · SHA-1 · 30s window · 6 digits. Computed locally; secret never leaves your device.
      </p>
    </div>
  );
}
