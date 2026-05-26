import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";

const ALGOS = ["MD5", "SHA-1", "SHA-256", "SHA-512"] as const;
type Algo = (typeof ALGOS)[number];

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

function md5(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const len = bytes.length;
  const padLen = (len + 9 + 63) & ~63;
  const buf = new Uint8Array(padLen);
  buf.set(bytes);
  buf[len] = 0x80;
  const view = new DataView(buf.buffer);
  view.setUint32(padLen - 8, (len << 3) >>> 0, true);
  view.setUint32(padLen - 4, Math.floor(len / 0x20000000), true);

  let a = 0x67452301;
  let b = 0xefcdab89;
  let c = 0x98badcfe;
  let d = 0x10325476;

  const K = new Int32Array([
    -680876936, -389564586, 606105819, -1044525330, -176418897, 1200080426, -1473231341, -45705983,
    1770035416, -1958414417, -42063, -1990404162, 1804603682, -40341101, -1502002290, 1236535329,
    -165796510, -1069501632, 643717713, -373897302, -701558691, 38016083, -660478335, -405537848,
    568446438, -1019803690, -187363961, 1163531501, -1444681467, -51403784, 1735328473, -1926607734,
    -378558, -2022574463, 1839030562, -35309556, -1530992060, 1272893353, -155497632, -1094730640,
    681279174, -358537222, -722521979, 76029189, -640364487, -421815835, 530742520, -995338651,
    -198630844, 1126891415, -1416354905, -57434055, 1700485571, -1894986606, -1051523, -2054922799,
    1873313359, -30611744, -1560198380, 1309151649, -145523070, -1120210379, 718787259, -343485551,
  ]);

  const S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];

  const rotl = (x: number, n: number) => ((x << n) | (x >>> (32 - n))) >>> 0;

  for (let off = 0; off < padLen; off += 64) {
    const M = new Int32Array(16);
    for (let i = 0; i < 16; i++) M[i] = view.getInt32(off + i * 4, true);
    let A = a, B = b, C = c, D = d;
    for (let i = 0; i < 64; i++) {
      let F = 0, g = 0;
      if (i < 16) {
        F = (B & C) | (~B & D);
        g = i;
      } else if (i < 32) {
        F = (D & B) | (~D & C);
        g = (5 * i + 1) % 16;
      } else if (i < 48) {
        F = B ^ C ^ D;
        g = (3 * i + 5) % 16;
      } else {
        F = C ^ (B | ~D);
        g = (7 * i) % 16;
      }
      const t = (A + F + K[i] + M[g]) | 0;
      A = D;
      D = C;
      C = B;
      B = (B + rotl(t >>> 0, S[i])) | 0;
    }
    a = (a + A) | 0;
    b = (b + B) | 0;
    c = (c + C) | 0;
    d = (d + D) | 0;
  }

  const toLE = (n: number) =>
    [(n >>> 0) & 0xff, (n >>> 8) & 0xff, (n >>> 16) & 0xff, (n >>> 24) & 0xff]
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
  return toLE(a) + toLE(b) + toLE(c) + toLE(d);
}

async function hash(algo: Algo, input: string): Promise<string> {
  if (algo === "MD5") return md5(input);
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest(algo, data);
  return toHex(buf);
}

export default function HashTool() {
  const [input, setInput] = useState("");
  const [results, setResults] = useState<Record<Algo, string>>({
    MD5: "",
    "SHA-1": "",
    "SHA-256": "",
    "SHA-512": "",
  });
  const [casing, setCasing] = useState<"lower" | "upper">("lower");

  useEffect(() => {
    let cancelled = false;
    if (!input) {
      setResults({ MD5: "", "SHA-1": "", "SHA-256": "", "SHA-512": "" });
      return;
    }
    (async () => {
      const entries = await Promise.all(ALGOS.map(async (a) => [a, await hash(a, input)] as const));
      if (cancelled) return;
      setResults(Object.fromEntries(entries) as Record<Algo, string>);
    })();
    return () => {
      cancelled = true;
    };
  }, [input]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Input</span>
          <SegmentedControl
            size="sm"
            ariaLabel="Casing"
            value={casing}
            onChange={(v) => setCasing(v as "lower" | "upper")}
            options={[
              { value: "lower", label: "lower" },
              { value: "upper", label: "UPPER" },
            ]}
          />
        </div>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type or paste text…"
          className="min-h-[140px]"
          spellCheck={false}
        />
        <p className="text-xs text-muted-foreground">
          UTF-8 hashed locally. SHA family runs in WebCrypto, MD5 in pure JS — never sent to a server.
        </p>
      </div>

      <div className="grid gap-3">
        {ALGOS.map((a) => {
          const value = casing === "upper" ? results[a].toUpperCase() : results[a];
          return (
            <div key={a} className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">{a}</span>
                <CopyButton value={value} label="" />
              </div>
              <div className="break-all font-mono text-sm">
                {value || <span className="text-muted-foreground">—</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
