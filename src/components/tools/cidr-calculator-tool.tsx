import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/tools/copy-button";

interface SubnetInfo {
  cidr: string;
  network: string;
  broadcast: string;
  netmask: string;
  wildcard: string;
  firstHost: string;
  lastHost: string;
  totalHosts: number;
  usableHosts: number;
  prefixLength: number;
}

function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const x = Number(p);
    if (!Number.isInteger(x) || x < 0 || x > 255) return null;
    n = (n << 8) + x;
  }
  return n >>> 0;
}

function intToIp(n: number): string {
  return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join(".");
}

function parseCidr(input: string): SubnetInfo | { error: string } {
  const trimmed = input.trim();
  const m = trimmed.match(/^(\d+\.\d+\.\d+\.\d+)\/(\d+)$/);
  if (!m) return { error: "Use format like 192.168.1.0/24" };
  const ipInt = ipToInt(m[1]);
  const prefix = Number(m[2]);
  if (ipInt === null) return { error: "Invalid IP address" };
  if (prefix < 0 || prefix > 32) return { error: "Prefix must be between 0 and 32" };
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (ipInt & mask) >>> 0;
  const broadcast = (network | (~mask >>> 0)) >>> 0;
  const total = prefix === 32 ? 1 : prefix === 31 ? 2 : 2 ** (32 - prefix);
  const usable = prefix >= 31 ? total : Math.max(0, total - 2);
  const firstHost = prefix >= 31 ? network : (network + 1) >>> 0;
  const lastHost = prefix >= 31 ? broadcast : (broadcast - 1) >>> 0;
  return {
    cidr: `${intToIp(network)}/${prefix}`,
    network: intToIp(network),
    broadcast: intToIp(broadcast),
    netmask: intToIp(mask),
    wildcard: intToIp((~mask) >>> 0),
    firstHost: intToIp(firstHost),
    lastHost: intToIp(lastHost),
    totalHosts: total,
    usableHosts: usable,
    prefixLength: prefix,
  };
}

export default function CidrCalculatorTool() {
  const [input, setInput] = useState("192.168.1.0/24");

  const info = useMemo(() => parseCidr(input), [input]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="cidr-input">
          CIDR block
        </label>
        <Input
          id="cidr-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="192.168.1.0/24"
          className="font-mono"
          spellCheck={false}
        />
      </div>

      {"error" in info ? (
        <p className="text-xs text-destructive">{info.error}</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Canonical CIDR" value={info.cidr} />
          <Field label="Prefix length" value={`/${info.prefixLength}`} />
          <Field label="Network address" value={info.network} />
          <Field label="Broadcast" value={info.broadcast} />
          <Field label="Netmask" value={info.netmask} />
          <Field label="Wildcard" value={info.wildcard} />
          <Field label="First host" value={info.firstHost} />
          <Field label="Last host" value={info.lastHost} />
          <Field label="Total addresses" value={info.totalHosts.toLocaleString()} />
          <Field label="Usable hosts" value={info.usableHosts.toLocaleString()} />
        </div>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-md border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <CopyButton value={value} label="" />
      </div>
      <div className="break-all font-mono text-sm">{value}</div>
    </div>
  );
}
