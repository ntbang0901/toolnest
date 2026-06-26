import { useState, useRef, useCallback, useEffect } from "react";
import { Upload, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";

// Pure JS MD5 implementation (RFC 1321)
function md5(input: ArrayBuffer): string {
  const buf = new Uint8Array(input);

  function safeAdd(x: number, y: number): number {
    const lsw = (x & 0xffff) + (y & 0xffff);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xffff);
  }
  function bitRotateLeft(num: number, cnt: number): number {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  function md5cmn(q: number, a: number, b: number, x: number, s: number, t: number): number {
    return safeAdd(bitRotateLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function md5ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & c) | (~b & d), a, b, x, s, t);
  }
  function md5gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn((b & d) | (c & ~d), a, b, x, s, t);
  }
  function md5hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  // Convert byte array to array of little-endian 32-bit words, with padding
  const len8 = buf.length;
  const len32 = Math.ceil((len8 + 9) / 64) * 16;
  const M = new Int32Array(len32);
  for (let i = 0; i < len8; i++) {
    M[i >> 2] |= buf[i] << ((i % 4) * 8);
  }
  M[len8 >> 2] |= 0x80 << ((len8 % 4) * 8);
  M[len32 - 2] = len8 * 8;

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  for (let i = 0; i < len32; i += 16) {
    const aa = a, bb = b, cc = c, dd = d;

    a = md5ff(a, b, c, d, M[i + 0], 7, -680876936);
    d = md5ff(d, a, b, c, M[i + 1], 12, -389564586);
    c = md5ff(c, d, a, b, M[i + 2], 17, 606105819);
    b = md5ff(b, c, d, a, M[i + 3], 22, -1044525330);
    a = md5ff(a, b, c, d, M[i + 4], 7, -176418897);
    d = md5ff(d, a, b, c, M[i + 5], 12, 1200080426);
    c = md5ff(c, d, a, b, M[i + 6], 17, -1473231341);
    b = md5ff(b, c, d, a, M[i + 7], 22, -45705983);
    a = md5ff(a, b, c, d, M[i + 8], 7, 1770035416);
    d = md5ff(d, a, b, c, M[i + 9], 12, -1958414417);
    c = md5ff(c, d, a, b, M[i + 10], 17, -42063);
    b = md5ff(b, c, d, a, M[i + 11], 22, -1990404162);
    a = md5ff(a, b, c, d, M[i + 12], 7, 1804603682);
    d = md5ff(d, a, b, c, M[i + 13], 12, -40341101);
    c = md5ff(c, d, a, b, M[i + 14], 17, -1502002290);
    b = md5ff(b, c, d, a, M[i + 15], 22, 1236535329);

    a = md5gg(a, b, c, d, M[i + 1], 5, -165796510);
    d = md5gg(d, a, b, c, M[i + 6], 9, -1069501632);
    c = md5gg(c, d, a, b, M[i + 11], 14, 643717713);
    b = md5gg(b, c, d, a, M[i + 0], 20, -373897302);
    a = md5gg(a, b, c, d, M[i + 5], 5, -701558691);
    d = md5gg(d, a, b, c, M[i + 10], 9, 38016083);
    c = md5gg(c, d, a, b, M[i + 15], 14, -660478335);
    b = md5gg(b, c, d, a, M[i + 4], 20, -405537848);
    a = md5gg(a, b, c, d, M[i + 9], 5, 568446438);
    d = md5gg(d, a, b, c, M[i + 14], 9, -1019803690);
    c = md5gg(c, d, a, b, M[i + 3], 14, -187363961);
    b = md5gg(b, c, d, a, M[i + 8], 20, 1163531501);
    a = md5gg(a, b, c, d, M[i + 13], 5, -1444681467);
    d = md5gg(d, a, b, c, M[i + 2], 9, -51403784);
    c = md5gg(c, d, a, b, M[i + 7], 14, 1735328473);
    b = md5gg(b, c, d, a, M[i + 12], 20, -1926607734);

    a = md5hh(a, b, c, d, M[i + 5], 4, -378558);
    d = md5hh(d, a, b, c, M[i + 8], 11, -2022574463);
    c = md5hh(c, d, a, b, M[i + 11], 16, 1839030562);
    b = md5hh(b, c, d, a, M[i + 14], 23, -35309556);
    a = md5hh(a, b, c, d, M[i + 1], 4, -1530992060);
    d = md5hh(d, a, b, c, M[i + 4], 11, 1272893353);
    c = md5hh(c, d, a, b, M[i + 7], 16, -155497632);
    b = md5hh(b, c, d, a, M[i + 10], 23, -1094730640);
    a = md5hh(a, b, c, d, M[i + 13], 4, 681279174);
    d = md5hh(d, a, b, c, M[i + 0], 11, -358537222);
    c = md5hh(c, d, a, b, M[i + 3], 16, -722521979);
    b = md5hh(b, c, d, a, M[i + 6], 23, 76029189);
    a = md5hh(a, b, c, d, M[i + 9], 4, -640364487);
    d = md5hh(d, a, b, c, M[i + 12], 11, -421815835);
    c = md5hh(c, d, a, b, M[i + 15], 16, 530742520);
    b = md5hh(b, c, d, a, M[i + 2], 23, -995338651);

    a = md5ii(a, b, c, d, M[i + 0], 6, -198630844);
    d = md5ii(d, a, b, c, M[i + 7], 10, 1126891415);
    c = md5ii(c, d, a, b, M[i + 14], 15, -1416354905);
    b = md5ii(b, c, d, a, M[i + 5], 21, -57434055);
    a = md5ii(a, b, c, d, M[i + 12], 6, 1700485571);
    d = md5ii(d, a, b, c, M[i + 3], 10, -1894986606);
    c = md5ii(c, d, a, b, M[i + 10], 15, -1051523);
    b = md5ii(b, c, d, a, M[i + 1], 21, -2054922799);
    a = md5ii(a, b, c, d, M[i + 8], 6, 1873313359);
    d = md5ii(d, a, b, c, M[i + 15], 10, -30611744);
    c = md5ii(c, d, a, b, M[i + 6], 15, -1560198380);
    b = md5ii(b, c, d, a, M[i + 13], 21, 1309151649);
    a = md5ii(a, b, c, d, M[i + 4], 6, -145523070);
    d = md5ii(d, a, b, c, M[i + 11], 10, -1120210379);
    c = md5ii(c, d, a, b, M[i + 2], 15, 718787259);
    b = md5ii(b, c, d, a, M[i + 9], 21, -343485551);

    a = safeAdd(a, aa);
    b = safeAdd(b, bb);
    c = safeAdd(c, cc);
    d = safeAdd(d, dd);
  }

  // Convert little-endian words back to hex
  const words = [a, b, c, d];
  return words
    .map((w) =>
      Array.from({ length: 4 }, (_, i) => ((w >> (i * 8)) & 0xff).toString(16).padStart(2, "0")).join("")
    )
    .join("");
}

async function hashFileSHA(file: File, algo: string): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest(algo, buffer);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashFileMD5(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  return md5(buffer);
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 2)} ${units[i]}`;
}

type HashAlgo = "MD5" | "SHA-1" | "SHA-256" | "SHA-512";

const ALGOS: HashAlgo[] = ["MD5", "SHA-1", "SHA-256", "SHA-512"];

type HashResults = Partial<Record<HashAlgo, string>>;

export default function ChecksumVerifierTool() {
  const [file, setFile] = useState<File | null>(null);
  const [hashes, setHashes] = useState<HashResults>({});
  const [progress, setProgress] = useState(0);
  const [computing, setComputing] = useState(false);
  const [expectedHash, setExpectedHash] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const computeHashes = useCallback(async (f: File) => {
    setFile(f);
    setHashes({});
    setProgress(0);
    setComputing(true);

    try {
      // MD5 first
      const md5hash = await hashFileMD5(f);
      setHashes((prev) => ({ ...prev, MD5: md5hash }));
      setProgress(25);

      const sha1 = await hashFileSHA(f, "SHA-1");
      setHashes((prev) => ({ ...prev, "SHA-1": sha1 }));
      setProgress(50);

      const sha256 = await hashFileSHA(f, "SHA-256");
      setHashes((prev) => ({ ...prev, "SHA-256": sha256 }));
      setProgress(75);

      const sha512 = await hashFileSHA(f, "SHA-512");
      setHashes((prev) => ({ ...prev, "SHA-512": sha512 }));
      setProgress(100);
    } finally {
      setComputing(false);
    }
  }, []);

  const handleFileChange = useCallback(
    (f: File | null | undefined) => {
      if (f) computeHashes(f);
    },
    [computeHashes]
  );

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e.target.files?.[0]);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    handleFileChange(e.dataTransfer.files?.[0]);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  };

  const onDragLeave = () => setDragOver(false);

  // Determine verification status
  const trimmedExpected = expectedHash.trim().toLowerCase();
  const matchedAlgo = trimmedExpected
    ? ALGOS.find((a) => hashes[a]?.toLowerCase() === trimmedExpected)
    : undefined;
  const verifyStatus: "match" | "mismatch" | "idle" =
    !trimmedExpected || !file
      ? "idle"
      : matchedAlgo
      ? "match"
      : "mismatch";

  // Reset file input value so the same file can be re-selected
  useEffect(() => {
    if (!file && fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [file]);

  return (
    <div className="flex flex-col gap-6">
      {/* Drop zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={[
          "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 transition-colors cursor-pointer",
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/30 hover:border-primary/50 hover:bg-muted/30",
        ].join(" ")}
        onClick={() => fileInputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Drop a file here or click to pick one"
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click();
        }}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <div className="text-center">
          <p className="text-sm font-medium">Drop a file here</p>
          <p className="text-xs text-muted-foreground mt-1">or click to browse</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            fileInputRef.current?.click();
          }}
          type="button"
        >
          Choose file
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={onInputChange}
          aria-hidden="true"
          tabIndex={-1}
        />
      </div>

      {/* File info + progress */}
      {file && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between rounded-md bg-muted px-3 py-2 text-sm">
            <span className="font-medium truncate max-w-[60%]">{file.name}</span>
            <span className="text-muted-foreground shrink-0">{formatBytes(file.size)}</span>
          </div>

          {computing && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Computing hashes…</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hash results */}
      {file && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Checksums</span>
          <div className="flex flex-col gap-2">
            {ALGOS.map((algo) => {
              const value = hashes[algo];
              const isMatch =
                trimmedExpected && value && value.toLowerCase() === trimmedExpected;
              return (
                <div
                  key={algo}
                  className={[
                    "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
                    isMatch ? "border-green-500/50 bg-green-500/5" : "",
                  ].join(" ")}
                >
                  <span className="w-16 shrink-0 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    {algo}
                  </span>
                  <span className="flex-1 font-mono text-xs break-all text-foreground">
                    {value ?? (computing ? "…" : "—")}
                  </span>
                  <CopyButton value={value ?? ""} disabled={!value} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Verify section */}
      {file && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Verify checksum</span>
          <div className="flex gap-2">
            <Input
              placeholder="Paste expected hash here…"
              value={expectedHash}
              onChange={(e) => setExpectedHash(e.target.value)}
              className="font-mono text-sm"
              spellCheck={false}
              aria-label="Expected checksum"
            />
            {expectedHash && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setExpectedHash("")}
                type="button"
              >
                Clear
              </Button>
            )}
          </div>

          {verifyStatus !== "idle" && (
            <div
              className={[
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                verifyStatus === "match"
                  ? "bg-green-500/10 text-green-700 dark:text-green-400"
                  : "bg-destructive/10 text-destructive",
              ].join(" ")}
              role="status"
              aria-live="polite"
            >
              {verifyStatus === "match" ? (
                <>
                  <CheckCircle className="h-4 w-4 shrink-0" />
                  Match — {matchedAlgo}
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 shrink-0" />
                  {computing
                    ? "Still computing — please wait"
                    : "No match against any computed hash"}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
