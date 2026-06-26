import { useState, useEffect, useCallback, useRef } from "react";
import { RefreshCw, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";
import qrcode from "qrcode-generator";

// Base32 alphabet (RFC 4648, no padding)
const BASE32_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function toBase32(bytes: Uint8Array): string {
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += BASE32_CHARS[(buffer >> bitsLeft) & 0x1f];
    }
  }
  return result;
}

function base32Decode(s: string): Uint8Array {
  const upper = s.toUpperCase().replace(/=+$/, "");
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const char of upper) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) continue;
    buffer = (buffer << 5) | idx;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 0xff);
    }
  }
  return new Uint8Array(bytes);
}

function generateSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return toBase32(bytes);
}

async function computeTotp(secret: string, timeStep = 30): Promise<string> {
  const counter = Math.floor(Date.now() / 1000 / timeStep);
  const keyBytes = base32Decode(secret);
  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = c & 0xff;
    c = Math.floor(c / 256);
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBytes.buffer as ArrayBuffer,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, counterBytes);
  const hash = new Uint8Array(sig);

  const offset = hash[19] & 0x0f;
  const code =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return String(code % 1_000_000).padStart(6, "0");
}

function buildOtpUri(secret: string, issuer: string, account: string): string {
  const label = encodeURIComponent(issuer ? `${issuer}:${account}` : account);
  const params = new URLSearchParams({ secret, issuer: issuer || account });
  return `otpauth://totp/${label}?${params.toString()}`;
}

function generateQrSvg(data: string): string {
  const qr = qrcode(0, "M");
  qr.addData(data);
  qr.make();
  return qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
}

function secondsUntilNextStep(timeStep = 30): number {
  return timeStep - (Math.floor(Date.now() / 1000) % timeStep);
}

export default function OtpSecretGeneratorTool() {
  const [secret, setSecret] = useState(() => generateSecret());
  const [issuer, setIssuer] = useState("MyApp");
  const [account, setAccount] = useState("user@example.com");
  const [totpCode, setTotpCode] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(secondsUntilNextStep());
  const [qrSvg, setQrSvg] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const uri = buildOtpUri(secret, issuer, account);

  const refreshTotp = useCallback(async (s: string) => {
    try {
      const code = await computeTotp(s);
      setTotpCode(code);
    } catch {
      setTotpCode("------");
    }
  }, []);

  useEffect(() => {
    refreshTotp(secret);
    try {
      setQrSvg(generateQrSvg(buildOtpUri(secret, issuer, account)));
    } catch {
      setQrSvg("");
    }
  }, [secret, issuer, account, refreshTotp]);

  useEffect(() => {
    setSecondsLeft(secondsUntilNextStep());
    timerRef.current = setInterval(() => {
      const s = secondsUntilNextStep();
      setSecondsLeft(s);
      if (s === 30) refreshTotp(secret);
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [secret, refreshTotp]);

  const regenerate = useCallback(() => {
    setSecret(generateSecret());
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="otp-issuer">
              Issuer (app name)
            </label>
            <Input
              id="otp-issuer"
              value={issuer}
              onChange={(e) => setIssuer(e.target.value)}
              placeholder="MyApp"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="otp-account">
              Account
            </label>
            <Input
              id="otp-account"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Secret (Base32)</span>
            <div className="flex gap-2">
              <CopyButton value={secret} label="Copy" />
              <Button variant="outline" size="sm" onClick={regenerate}>
                <RefreshCw className="h-3.5 w-3.5" />
                New
              </Button>
            </div>
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-sm tracking-widest break-all select-all">
            {secret}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">otpauth:// URI</span>
            <CopyButton value={uri} label="Copy" />
          </div>
          <div className="rounded-md border bg-muted/40 px-3 py-2 font-mono text-xs break-all select-all">
            {uri}
          </div>
        </div>

        <div className="flex flex-col gap-2 rounded-md border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current TOTP code</span>
            <CopyButton value={totpCode} label="Copy" />
          </div>
          <div className="flex items-center gap-4">
            <span className="font-mono text-3xl font-bold tracking-[0.25em]">
              {totpCode || "------"}
            </span>
            <div className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">expires in</span>
              <span className="font-mono text-lg font-medium">{secondsLeft}s</span>
            </div>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000"
              style={{ width: `${(secondsLeft / 30) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">QR code</span>
        <div className="flex items-center justify-center rounded-md border bg-white p-4">
          {qrSvg ? (
            <div
              className="w-48 h-48"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
              aria-label="QR code for OTP URI"
            />
          ) : (
            <div className="flex items-center justify-center w-48 h-48 text-muted-foreground text-sm">
              <ScanLine className="h-8 w-8" />
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Scan with Google Authenticator, Authy, or any TOTP-compatible app.
        </p>
        <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
          <p><span className="font-medium text-foreground">Algorithm:</span> TOTP (RFC 6238) — HMAC-SHA1</p>
          <p><span className="font-medium text-foreground">Digits:</span> 6</p>
          <p><span className="font-medium text-foreground">Period:</span> 30 seconds</p>
          <p><span className="font-medium text-foreground">Secret size:</span> 20 bytes (160 bits)</p>
        </div>
      </div>
    </div>
  );
}
