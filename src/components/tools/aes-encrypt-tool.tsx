import { useState } from "react";
import { CodeEditor } from "@/components/tools/code-editor";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

type Mode = "encrypt" | "decrypt";

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function fromBase64(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

async function encryptText(plaintext: string, password: string): Promise<string> {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(plaintext)
  );
  // layout: salt (16) + iv (12) + ciphertext
  const combined = new Uint8Array(SALT_BYTES + IV_BYTES + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, SALT_BYTES);
  combined.set(new Uint8Array(ciphertext), SALT_BYTES + IV_BYTES);
  return toBase64(combined.buffer);
}

async function decryptText(b64: string, password: string): Promise<string> {
  const data = fromBase64(b64.trim());
  if (data.length <= SALT_BYTES + IV_BYTES) throw new Error("Invalid ciphertext");
  const salt = data.slice(0, SALT_BYTES);
  const iv = data.slice(SALT_BYTES, SALT_BYTES + IV_BYTES);
  const ciphertext = data.slice(SALT_BYTES + IV_BYTES);
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}

export default function AesEncryptTool() {
  const [mode, setMode] = useState<Mode>("encrypt");
  const [input, setInput] = useState("");
  const [password, setPassword] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRun() {
    if (!input || !password) return;
    setLoading(true);
    setError("");
    setOutput("");
    try {
      const result =
        mode === "encrypt"
          ? await encryptText(input, password)
          : await decryptText(input, password);
      setOutput(result);
    } catch (e) {
      setError(mode === "decrypt" ? "Decryption failed. Wrong password or corrupted data." : String(e));
    } finally {
      setLoading(false);
    }
  }

  const inputLabel = mode === "encrypt" ? "Plaintext" : "Base64 ciphertext";
  const inputPlaceholder =
    mode === "encrypt" ? "Enter text to encrypt…" : "Paste base64 ciphertext…";
  const outputLabel = mode === "encrypt" ? "Encrypted (base64)" : "Decrypted plaintext";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex">
        <SegmentedControl
          size="sm"
          ariaLabel="Mode"
          value={mode}
          onChange={(v) => {
            setMode(v as Mode);
            setOutput("");
            setError("");
          }}
          options={[
            { value: "encrypt", label: "Encrypt" },
            { value: "decrypt", label: "Decrypt" },
          ]}
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">{inputLabel}</span>
        <CodeEditor
          value={input}
          onChange={(v) => { setInput(v); setOutput(""); setError(""); }}
          language="plain"
          placeholder={inputPlaceholder}
          minHeight="120px"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Password</span>
        <Input
          type="password"
          value={password}
          onChange={(e) => { setPassword(e.target.value); setOutput(""); setError(""); }}
          placeholder="Enter password…"
        />
      </div>

      <Button onClick={handleRun} disabled={!input || !password || loading}>
        {loading ? (mode === "encrypt" ? "Encrypting…" : "Decrypting…") : (mode === "encrypt" ? "Encrypt" : "Decrypt")}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {output && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{outputLabel}</span>
            <CopyButton value={output} label="" />
          </div>
          <div className="rounded-md border border-border bg-card p-3 font-mono text-sm break-all whitespace-pre-wrap">
            {output}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        AES-256-GCM with PBKDF2 key derivation. Runs entirely in your browser — nothing is sent to a server.
      </p>
    </div>
  );
}
