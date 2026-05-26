import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/copy-button";
import { Button } from "@/components/ui/button";

// Semver parsing — no external deps
interface Semver {
  major: number;
  minor: number;
  patch: number;
  prerelease: string;
  build: string;
  raw: string;
}

function parse(v: string): Semver | null {
  const m = v.trim().replace(/^v/, "").match(
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+([0-9A-Za-z.-]+))?$/
  );
  if (!m) return null;
  return {
    major: Number(m[1]),
    minor: Number(m[2]),
    patch: Number(m[3]),
    prerelease: m[4] ?? "",
    build: m[5] ?? "",
    raw: v.trim(),
  };
}

function fmt(s: Semver): string {
  let v = `${s.major}.${s.minor}.${s.patch}`;
  if (s.prerelease) v += `-${s.prerelease}`;
  if (s.build) v += `+${s.build}`;
  return v;
}

function compare(a: Semver, b: Semver): number {
  for (const k of ["major", "minor", "patch"] as const) {
    if (a[k] !== b[k]) return a[k] > b[k] ? 1 : -1;
  }
  // prerelease: no prerelease > prerelease
  if (!a.prerelease && b.prerelease) return 1;
  if (a.prerelease && !b.prerelease) return -1;
  if (a.prerelease !== b.prerelease) return a.prerelease > b.prerelease ? 1 : -1;
  return 0;
}

function increment(s: Semver, type: "major" | "minor" | "patch"): Semver {
  const next = { ...s, prerelease: "", build: "" };
  if (type === "major") { next.major++; next.minor = 0; next.patch = 0; }
  if (type === "minor") { next.minor++; next.patch = 0; }
  if (type === "patch") { next.patch++; }
  next.raw = fmt(next);
  return next;
}

function satisfies(version: Semver, range: string): boolean | null {
  const r = range.trim();
  // Support: ^, ~, >=, <=, >, <, =, exact
  const ops: [RegExp, (v: Semver, n: Semver) => boolean][] = [
    [/^\^(.+)$/, (v, n) => {
      if (n.major !== 0) return v.major === n.major && compare(v, n) >= 0;
      if (n.minor !== 0) return v.major === 0 && v.minor === n.minor && compare(v, n) >= 0;
      return compare(v, n) === 0;
    }],
    [/^~(.+)$/, (v, n) => v.major === n.major && v.minor === n.minor && compare(v, n) >= 0],
    [/^>=(.+)$/, (v, n) => compare(v, n) >= 0],
    [/^<=(.+)$/, (v, n) => compare(v, n) <= 0],
    [/^>(.+)$/, (v, n) => compare(v, n) > 0],
    [/^<(.+)$/, (v, n) => compare(v, n) < 0],
    [/^=?(.+)$/, (v, n) => compare(v, n) === 0],
  ];
  for (const [re, fn] of ops) {
    const m = r.match(re);
    if (m) {
      const n = parse(m[1]);
      if (!n) return null;
      return fn(version, n);
    }
  }
  return null;
}

export default function SemverCalculatorTool() {
  const [versionA, setVersionA] = useState("1.4.2");
  const [versionB, setVersionB] = useState("2.0.0-beta.1");
  const [range, setRange] = useState("^1.4.0");

  const a = useMemo(() => parse(versionA), [versionA]);
  const b = useMemo(() => parse(versionB), [versionB]);
  const cmp = useMemo(() => (a && b ? compare(a, b) : null), [a, b]);
  const sat = useMemo(() => (a ? satisfies(a, range) : null), [a, range]);

  return (
    <div className="flex flex-col gap-6">
      {/* Compare */}
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">Compare versions</span>
        <div className="flex flex-wrap items-center gap-3">
          <VersionInput label="Version A" value={versionA} onChange={setVersionA} parsed={a} />
          <div className="text-2xl font-mono text-muted-foreground select-none">vs</div>
          <VersionInput label="Version B" value={versionB} onChange={setVersionB} parsed={b} />
        </div>
        {a && b && cmp !== null && (
          <div className="rounded-md border border-border bg-card px-4 py-3 text-sm">
            <span className="font-mono font-semibold">{fmt(a)}</span>
            <span className="mx-2 text-muted-foreground">
              {cmp > 0 ? ">" : cmp < 0 ? "<" : "="}
            </span>
            <span className="font-mono font-semibold">{fmt(b)}</span>
            <span className="ml-3 text-muted-foreground">
              {cmp > 0 ? "(A is newer)" : cmp < 0 ? "(B is newer)" : "(equal)"}
            </span>
          </div>
        )}
      </div>

      {/* Increment */}
      {a && (
        <div className="flex flex-col gap-3">
          <span className="text-sm font-medium">Increment {fmt(a)}</span>
          <div className="grid gap-2 sm:grid-cols-3">
            {(["major", "minor", "patch"] as const).map((type) => {
              const next = fmt(increment(a, type));
              return (
                <div key={type} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2">
                  <div>
                    <div className="text-xs text-muted-foreground capitalize">{type}</div>
                    <div className="font-mono text-sm font-semibold">{next}</div>
                  </div>
                  <CopyButton value={next} label="" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Range check */}
      <div className="flex flex-col gap-3">
        <span className="text-sm font-medium">Range check</span>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Version</label>
            <input
              value={versionA}
              onChange={(e) => setVersionA(e.target.value)}
              className="flex h-9 w-36 rounded-md border border-input bg-transparent px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Range (^, ~, &gt;=, &lt;, etc.)</label>
            <input
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="flex h-9 w-40 rounded-md border border-input bg-transparent px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>
        {a && sat !== null && (
          <div className={`rounded-md border px-4 py-2 text-sm font-medium ${sat ? "border-green-500/30 bg-green-500/5 text-green-600 dark:text-green-400" : "border-destructive/30 bg-destructive/5 text-destructive"}`}>
            <span className="font-mono">{fmt(a)}</span>
            {sat ? " satisfies " : " does NOT satisfy "}
            <span className="font-mono">{range}</span>
          </div>
        )}
        {a && sat === null && range.trim() && (
          <p className="text-xs text-destructive">Invalid range expression.</p>
        )}
      </div>

      {/* Quick presets */}
      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Range examples</span>
        <div className="flex flex-wrap gap-2">
          {["^1.0.0", "~1.4.0", ">=1.0.0 <2.0.0", ">1.2.3", "1.4.2"].map((r) => (
            <Button key={r} variant="outline" size="sm" onClick={() => setRange(r)}>
              <span className="font-mono">{r}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

function VersionInput({ label, value, onChange, parsed }: {
  label: string; value: string; onChange: (v: string) => void; parsed: Semver | null;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-muted-foreground">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`flex h-9 w-36 rounded-md border bg-transparent px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring ${
          parsed ? "border-input" : "border-destructive"
        }`}
      />
      {!parsed && value && <p className="text-xs text-destructive">Invalid semver</p>}
    </div>
  );
}
