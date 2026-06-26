import type { CodeLang } from "@/components/tools/code-editor";
import { codeToLang, langToCode } from "@/lib/paste-languages";

/**
 * Local URL Paste codec.
 *
 * Pipeline (encode):
 *   text → deflate-raw → [optional AES-GCM encrypt] → binary envelope → base64url
 *
 * Pipeline (decode):
 *   base64url → envelope → [optional AES-GCM decrypt] → inflate → text
 *
 * Compress-before-encrypt is intentional: ciphertext is incompressible, so
 * compressing afterwards would do nothing.
 *
 * Binary envelope layout:
 *   [magic 'UP' (2)] [version (1)] [flags (1)] [langCode (1)]
 *     if encrypted: [salt (16)] [iv (12)]
 *   [payload]   // = encrypted(deflated(text)) or deflated(text)
 */

const MAGIC_0 = 0x55; // 'U'
const MAGIC_1 = 0x50; // 'P'
const VERSION = 1;
const FLAG_ENCRYPTED = 0x01;

const SALT_LEN = 16;
const IV_LEN = 12;
const PBKDF2_ITERATIONS = 200_000;

// ---------------------------------------------------------------------------
// Typed errors
// ---------------------------------------------------------------------------
export class NeedsPasswordError extends Error {
  constructor() {
    super("This paste is password protected.");
    this.name = "NeedsPasswordError";
  }
}

export class BadPasswordError extends Error {
  constructor() {
    super("Incorrect password.");
    this.name = "BadPasswordError";
  }
}

export class CorruptError extends Error {
  constructor(message = "This link is corrupt or incomplete.") {
    super(message);
    this.name = "CorruptError";
  }
}

// ---------------------------------------------------------------------------
// Compression (native CompressionStream, deflate-raw)
// ---------------------------------------------------------------------------
async function streamThrough(
  data: Uint8Array,
  stream: CompressionStream | DecompressionStream
): Promise<Uint8Array> {
  const writer = stream.writable.getWriter();
  void writer.write(data as BufferSource);
  void writer.close();

  const chunks: Uint8Array[] = [];
  const reader = stream.readable.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}

export async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  return streamThrough(data, new CompressionStream("deflate-raw"));
}

export async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  return streamThrough(data, new DecompressionStream("deflate-raw"));
}

// ---------------------------------------------------------------------------
// base64url (Uint8Array ↔ string), no padding
// ---------------------------------------------------------------------------
export function base64urlEncode(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64urlDecode(text: string): Uint8Array {
  const normalized = text.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  let binary: string;
  try {
    binary = atob(padded);
  } catch {
    throw new CorruptError();
  }
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

// ---------------------------------------------------------------------------
// Encryption (PBKDF2 → AES-GCM)
// ---------------------------------------------------------------------------
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// ---------------------------------------------------------------------------
// Encode / decode
// ---------------------------------------------------------------------------
export interface EncodeOptions {
  content: string;
  language: CodeLang;
  password?: string;
}

export async function encodePaste({
  content,
  language,
  password,
}: EncodeOptions): Promise<string> {
  const deflated = await deflateRaw(new TextEncoder().encode(content));
  const encrypted = Boolean(password);

  let payload = deflated;
  let salt: Uint8Array | null = null;
  let iv: Uint8Array | null = null;

  if (encrypted) {
    salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
    iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
    const key = await deriveKey(password as string, salt);
    const cipher = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: iv as BufferSource },
      key,
      deflated as BufferSource
    );
    payload = new Uint8Array(cipher);
  }

  const headerLen = 5 + (encrypted ? SALT_LEN + IV_LEN : 0);
  const envelope = new Uint8Array(headerLen + payload.length);
  envelope[0] = MAGIC_0;
  envelope[1] = MAGIC_1;
  envelope[2] = VERSION;
  envelope[3] = encrypted ? FLAG_ENCRYPTED : 0;
  envelope[4] = langToCode(language);

  let offset = 5;
  if (encrypted && salt && iv) {
    envelope.set(salt, offset);
    offset += SALT_LEN;
    envelope.set(iv, offset);
    offset += IV_LEN;
  }
  envelope.set(payload, offset);

  return base64urlEncode(envelope);
}

export interface DecodeResult {
  content: string;
  language: CodeLang;
  encrypted: boolean;
}

/**
 * Parse just the header to learn whether a fragment is encrypted without
 * needing the password. Throws CorruptError on a malformed envelope.
 */
export function inspectPaste(fragment: string): { encrypted: boolean; language: CodeLang } {
  const bytes = base64urlDecode(fragment);
  if (bytes.length < 5 || bytes[0] !== MAGIC_0 || bytes[1] !== MAGIC_1) {
    throw new CorruptError();
  }
  const flags = bytes[3];
  return {
    encrypted: (flags & FLAG_ENCRYPTED) !== 0,
    language: codeToLang(bytes[4]),
  };
}

export async function decodePaste(
  fragment: string,
  password?: string
): Promise<DecodeResult> {
  const bytes = base64urlDecode(fragment);
  if (bytes.length < 5 || bytes[0] !== MAGIC_0 || bytes[1] !== MAGIC_1) {
    throw new CorruptError();
  }

  const flags = bytes[3];
  const encrypted = (flags & FLAG_ENCRYPTED) !== 0;
  const language = codeToLang(bytes[4]);

  let offset = 5;
  let deflated: Uint8Array;

  if (encrypted) {
    if (!password) throw new NeedsPasswordError();
    if (bytes.length < offset + SALT_LEN + IV_LEN) throw new CorruptError();

    const salt = bytes.subarray(offset, offset + SALT_LEN);
    offset += SALT_LEN;
    const iv = bytes.subarray(offset, offset + IV_LEN);
    offset += IV_LEN;
    const payload = bytes.subarray(offset);

    const key = await deriveKey(password, salt);
    try {
      const plain = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: iv as BufferSource },
        key,
        payload as BufferSource
      );
      deflated = new Uint8Array(plain);
    } catch {
      throw new BadPasswordError();
    }
  } else {
    deflated = bytes.subarray(offset);
  }

  let inflated: Uint8Array;
  try {
    inflated = await inflateRaw(deflated);
  } catch {
    throw new CorruptError();
  }

  return {
    content: new TextDecoder().decode(inflated),
    language,
    encrypted,
  };
}

/**
 * Estimate the compressed byte size of content (the payload that lands in the
 * URL). Used by the live size meter. Encryption adds a fixed ~28-byte header +
 * 16-byte GCM tag, negligible for the threshold buckets.
 */
export async function estimateCompressedSize(content: string): Promise<number> {
  if (!content) return 0;
  const deflated = await deflateRaw(new TextEncoder().encode(content));
  return deflated.length;
}
