import { useState, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeEditor } from "@/components/tools/code-editor";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";

// Crockford's Base32 alphabet (excludes I, L, O, U to avoid ambiguity)
const CROCKFORD_CHARS = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeCrockfordBase32(value: bigint, length: number): string {
  let result = "";
  let v = value;
  for (let i = 0; i < length; i++) {
    result = CROCKFORD_CHARS[Number(v & 31n)] + result;
    v >>= 5n;
  }
  return result;
}

function generateUlid(): string {
  const now = BigInt(Date.now());
  // 10 chars for 48-bit timestamp
  const timePart = encodeCrockfordBase32(now, 10);

  // 80 bits of randomness = 16 Crockford Base32 chars (5 bits each)
  const randomBytes = new Uint8Array(10);
  crypto.getRandomValues(randomBytes);

  // Convert 10 bytes (80 bits) to bigint
  let randomBigInt = 0n;
  for (const byte of randomBytes) {
    randomBigInt = (randomBigInt << 8n) | BigInt(byte);
  }
  const randomPart = encodeCrockfordBase32(randomBigInt, 16);

  return timePart + randomPart;
}

function extractUlidTimestamp(ulid: string): Date | null {
  if (ulid.length !== 26) return null;
  const timePart = ulid.slice(0, 10).toUpperCase();
  let ms = 0n;
  for (const char of timePart) {
    const idx = CROCKFORD_CHARS.indexOf(char);
    if (idx === -1) return null;
    ms = ms * 32n + BigInt(idx);
  }
  return new Date(Number(ms));
}

const DEFAULT_NANOID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-";
const DEFAULT_NANOID_LENGTH = 21;

function generateNanoid(alphabet: string, length: number): string {
  if (alphabet.length === 0 || length <= 0) return "";

  // Use rejection sampling to avoid modulo bias
  const alphabetSize = alphabet.length;
  // Find the smallest mask that covers the alphabet size
  const mask = Math.pow(2, Math.ceil(Math.log2(alphabetSize))) - 1;
  const step = Math.ceil((1.6 * mask * length) / alphabetSize);

  let result = "";
  while (result.length < length) {
    const bytes = new Uint8Array(step);
    crypto.getRandomValues(bytes);
    for (const byte of bytes) {
      const idx = byte & mask;
      if (idx < alphabetSize) {
        result += alphabet[idx];
        if (result.length === length) break;
      }
    }
  }
  return result;
}

type Format = "ulid" | "nanoid";

export default function UlidNanoidGeneratorTool() {
  const [format, setFormat] = useState<Format>("ulid");
  const [count, setCount] = useState(10);
  const [nanoidAlphabet, setNanoidAlphabet] = useState(DEFAULT_NANOID_ALPHABET);
  const [nanoidLength, setNanoidLength] = useState(DEFAULT_NANOID_LENGTH);
  const [ids, setIds] = useState<string[]>([]);
  const [alphabetError, setAlphabetError] = useState("");

  const safeCount = Math.max(1, Math.min(100, Math.floor(Number(count)) || 1));
  const safeLength = Math.max(1, Math.min(256, Math.floor(Number(nanoidLength)) || DEFAULT_NANOID_LENGTH));

  const generate = useCallback(() => {
    if (format === "ulid") {
      setIds(Array.from({ length: safeCount }, generateUlid));
    } else {
      const trimmed = nanoidAlphabet;
      if (trimmed.length < 2) {
        setAlphabetError("Alphabet must have at least 2 characters");
        return;
      }
      setAlphabetError("");
      setIds(Array.from({ length: safeCount }, () => generateNanoid(trimmed, safeLength)));
    }
  }, [format, safeCount, nanoidAlphabet, safeLength]);

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const output = ids.join("\n");

  // For ULID: show timestamp info for the first ID
  const firstUlid = format === "ulid" && ids.length > 0 ? ids[0] : null;
  const firstTimestamp = firstUlid ? extractUlidTimestamp(firstUlid) : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Controls row */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Format</span>
          <SegmentedControl
            ariaLabel="Format"
            value={format}
            onChange={(v) => setFormat(v as Format)}
            options={[
              { value: "ulid", label: "ULID" },
              { value: "nanoid", label: "NanoID" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="id-count">
            Count
          </label>
          <Input
            id="id-count"
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 font-mono"
          />
        </div>

        {format === "nanoid" && (
          <>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" htmlFor="nanoid-length">
                Length
              </label>
              <Input
                id="nanoid-length"
                type="number"
                min={1}
                max={256}
                value={nanoidLength}
                onChange={(e) => setNanoidLength(Number(e.target.value))}
                className="w-24 font-mono"
              />
            </div>

            <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
              <label className="text-sm font-medium" htmlFor="nanoid-alphabet">
                Alphabet
              </label>
              <Input
                id="nanoid-alphabet"
                value={nanoidAlphabet}
                onChange={(e) => setNanoidAlphabet(e.target.value)}
                className="font-mono text-sm"
                spellCheck={false}
                aria-describedby={alphabetError ? "alphabet-error" : undefined}
              />
            </div>
          </>
        )}

        <Button onClick={generate} className="ml-auto">
          <RefreshCw className="h-4 w-4" />
          Generate
        </Button>
      </div>

      {/* Alphabet validation error */}
      {alphabetError && (
        <p id="alphabet-error" className="text-sm text-destructive -mt-2">
          {alphabetError}
        </p>
      )}

      {/* Format info */}
      {format === "ulid" ? (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1">
          <p>
            <span className="font-medium text-foreground">ULID</span> — 26 characters, Crockford&apos;s Base32.
          </p>
          <p>
            First <span className="font-mono font-medium text-foreground">10</span> chars: 48-bit millisecond timestamp.
            Last <span className="font-mono font-medium text-foreground">16</span> chars: 80-bit cryptographic random.
          </p>
          {firstTimestamp && firstUlid && (
            <p className="pt-1 border-t border-border/60">
              Latest timestamp:{" "}
              <span className="font-mono text-foreground">{firstUlid.slice(0, 10)}</span>
              {" → "}
              <span className="font-mono text-foreground">{firstTimestamp.toISOString()}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1">
          <p>
            <span className="font-medium text-foreground">NanoID</span> — configurable alphabet and length.
            Cryptographically secure via <span className="font-mono">crypto.getRandomValues</span>.
          </p>
          <p>
            Alphabet size:{" "}
            <span className="font-mono font-medium text-foreground">{nanoidAlphabet.length}</span> chars · Length:{" "}
            <span className="font-mono font-medium text-foreground">{safeLength}</span> ·{" "}
            ~{(Math.log2(nanoidAlphabet.length) * safeLength).toFixed(1)} bits of entropy.
          </p>
        </div>
      )}

      {/* Output */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {ids.length} {format === "ulid" ? "ULID" : "NanoID"}{ids.length === 1 ? "" : "s"}
          </span>
          <CopyButton value={output} label="Copy all" />
        </div>
        <CodeEditor
          value={output}
          readOnly
          language="plain"
          minHeight="280px"
          className="lg:min-h-[400px]"
        />
      </div>
    </div>
  );
}
