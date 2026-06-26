import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

interface IPInfo {
  inputType: "ipv4" | "ipv6";
  ipv4?: string;
  ipv6Full: string;
  ipv6Compressed: string;
  ipv4Mapped?: string;
  type: string;
  // IPv4-only fields
  binary?: string;
  decimal?: number;
  ipClass?: string;
  defaultMask?: string;
}

function parseIPv4(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums = parts.map(Number);
  if (nums.some((n) => isNaN(n) || n < 0 || n > 255 || String(n) !== parts[nums.indexOf(n)])) return null;
  return nums;
}

function ipv4ToInt(parts: number[]): number {
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function ipv4ToFull(parts: number[]): string {
  const hex = parts.map((n) => n.toString(16).padStart(2, "0")).join("");
  return `0000:0000:0000:0000:0000:ffff:${hex.slice(0, 4)}:${hex.slice(4)}`;
}

function compressIPv6(full: string): string {
  const groups = full.split(":");
  // Find longest run of zero groups
  let bestStart = -1, bestLen = 0, curStart = -1, curLen = 0;
  for (let i = 0; i < groups.length; i++) {
    if (groups[i] === "0000") {
      if (curStart === -1) { curStart = i; curLen = 1; }
      else curLen++;
      if (curLen > bestLen) { bestLen = curLen; bestStart = curStart; }
    } else {
      curStart = -1; curLen = 0;
    }
  }
  const stripped = groups.map((g) => g.replace(/^0+/, "") || "0");
  if (bestLen < 2) return stripped.join(":");
  const before = stripped.slice(0, bestStart).join(":");
  const after = stripped.slice(bestStart + bestLen).join(":");
  if (bestStart === 0 && bestStart + bestLen === 8) return "::";
  if (bestStart === 0) return `::${after}`;
  if (bestStart + bestLen === 8) return `${before}::`;
  return `${before}::${after}`;
}

function expandIPv6(ip: string): string | null {
  let addr = ip.trim().toLowerCase();
  // Handle IPv4-mapped like ::ffff:192.168.1.1
  const ipv4MappedMatch = addr.match(/^(.+):(\d+\.\d+\.\d+\.\d+)$/);
  if (ipv4MappedMatch) {
    const v4parts = parseIPv4(ipv4MappedMatch[2]);
    if (!v4parts) return null;
    const hex = v4parts.map((n) => n.toString(16).padStart(2, "0")).join("");
    addr = `${ipv4MappedMatch[1]}:${hex.slice(0, 4)}:${hex.slice(4)}`;
  }

  if (addr.includes("::")) {
    const sides = addr.split("::");
    if (sides.length !== 2) return null;
    const left = sides[0] ? sides[0].split(":") : [];
    const right = sides[1] ? sides[1].split(":") : [];
    const missing = 8 - left.length - right.length;
    if (missing < 0) return null;
    const groups = [...left, ...Array(missing).fill("0"), ...right];
    if (groups.length !== 8) return null;
    return groups.map((g) => g.padStart(4, "0")).join(":");
  }

  const groups = addr.split(":");
  if (groups.length !== 8) return null;
  if (groups.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return groups.map((g) => g.padStart(4, "0")).join(":");
}

function classifyIPv4(parts: number[]): string {
  const first = parts[0];
  if (first === 10) return "private (RFC1918)";
  if (first === 172 && parts[1] >= 16 && parts[1] <= 31) return "private (RFC1918)";
  if (first === 192 && parts[1] === 168) return "private (RFC1918)";
  if (first === 127) return "loopback";
  if (first === 169 && parts[1] === 254) return "link-local";
  if (first >= 224 && first <= 239) return "multicast";
  if (first >= 240) return "reserved";
  return "public";
}

function ipv4Class(first: number): string {
  if (first < 128) return "A";
  if (first < 192) return "B";
  if (first < 224) return "C";
  if (first < 240) return "D (multicast)";
  return "E (reserved)";
}

function defaultMask(cls: string): string {
  if (cls.startsWith("A")) return "255.0.0.0 (/8)";
  if (cls.startsWith("B")) return "255.255.0.0 (/16)";
  if (cls.startsWith("C")) return "255.255.255.0 (/24)";
  return "N/A";
}

function classifyIPv6(full: string): string {
  if (full === "0000:0000:0000:0000:0000:0000:0000:0001") return "loopback";
  if (full === "0000:0000:0000:0000:0000:0000:0000:0000") return "unspecified";
  if (full.startsWith("0000:0000:0000:0000:0000:ffff:")) return "IPv4-mapped";
  if (full.startsWith("fe80:")) return "link-local";
  if (full.startsWith("fc") || full.startsWith("fd")) return "unique local (ULA)";
  if (full.startsWith("ff")) return "multicast";
  if (full.startsWith("2001:0db8:")) return "documentation (TEST-NET)";
  return "global unicast";
}

function analyze(input: string): IPInfo {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Enter an IP address");

  // Try IPv4 first
  const v4parts = parseIPv4(trimmed);
  if (v4parts) {
    const full = ipv4ToFull(v4parts);
    const compressed = compressIPv6(full);
    const ipStr = v4parts.join(".");
    const mapped = `::ffff:${ipStr}`;
    const bin = v4parts.map((n) => n.toString(2).padStart(8, "0")).join(".");
    const dec = ipv4ToInt(v4parts);
    const cls = ipv4Class(v4parts[0]);
    return {
      inputType: "ipv4",
      ipv4: ipStr,
      ipv6Full: full,
      ipv6Compressed: compressed,
      ipv4Mapped: mapped,
      type: classifyIPv4(v4parts),
      binary: bin,
      decimal: dec,
      ipClass: cls,
      defaultMask: defaultMask(cls),
    };
  }

  // Try IPv6
  const full = expandIPv6(trimmed);
  if (!full) throw new Error("Invalid IP address format");

  const compressed = compressIPv6(full);
  const addrType = classifyIPv6(full);

  // Check if IPv4-mapped
  let ipv4: string | undefined;
  if (full.startsWith("0000:0000:0000:0000:0000:ffff:")) {
    const hex = full.replace(/:/g, "").slice(24);
    const parts = [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
      parseInt(hex.slice(6, 8), 16),
    ];
    ipv4 = parts.join(".");
  }

  return {
    inputType: "ipv6",
    ipv4,
    ipv6Full: full,
    ipv6Compressed: compressed,
    type: addrType,
  };
}

function Row({ label, value, mono = true }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b last:border-0">
      <span className="text-sm text-muted-foreground shrink-0 w-44">{label}</span>
      <div className="flex items-center gap-2 min-w-0">
        <span className={`text-sm break-all ${mono ? "font-mono" : ""}`}>{value}</span>
        <CopyButton value={value} />
      </div>
    </div>
  );
}

const SAMPLES = ["192.168.1.1", "10.0.0.1", "8.8.8.8", "127.0.0.1", "::1", "2001:db8::1", "::ffff:192.168.1.1"];

export default function IPv4IPv6Tool() {
  const [input, setInput] = useState("192.168.1.1");

  const result = useMemo(() => {
    try {
      return { ok: true as const, data: analyze(input) };
    } catch (err) {
      return { ok: false as const, error: err instanceof Error ? err.message : "Invalid input" };
    }
  }, [input]);

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="ip-input">
          IP Address
        </label>
        <div className="flex gap-2">
          <input
            id="ip-input"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. 192.168.1.1 or ::1"
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm font-mono shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            autoComplete="off"
            spellCheck={false}
          />
          <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
            Clear
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {SAMPLES.map((s) => (
          <Button key={s} variant="outline" size="sm" onClick={() => setInput(s)} className="font-mono text-xs">
            {s}
          </Button>
        ))}
      </div>

      {result.ok && input.trim() && (
        <div className="rounded-md border divide-y divide-border">
          <div className="px-4 py-2 bg-muted/40">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              {result.data.inputType === "ipv4" ? "IPv4 Address" : "IPv6 Address"}
            </span>
          </div>
          <div className="px-4">
            <Row label="Address type" value={result.data.type} mono={false} />
            {result.data.ipv4 && <Row label="IPv4" value={result.data.ipv4} />}
            <Row label="IPv6 full" value={result.data.ipv6Full} />
            <Row label="IPv6 compressed" value={result.data.ipv6Compressed} />
            {result.data.ipv4Mapped && <Row label="IPv4-mapped IPv6" value={result.data.ipv4Mapped} />}
            {result.data.binary && <Row label="Binary" value={result.data.binary} />}
            {result.data.decimal !== undefined && <Row label="Decimal" value={result.data.decimal.toString()} />}
            {result.data.ipClass && <Row label="IP class" value={`Class ${result.data.ipClass}`} mono={false} />}
            {result.data.defaultMask && <Row label="Default subnet mask" value={result.data.defaultMask} mono={false} />}
          </div>
        </div>
      )}

      {!result.ok && input.trim() && (
        <p className="text-sm text-destructive">{result.error}</p>
      )}
    </div>
  );
}
