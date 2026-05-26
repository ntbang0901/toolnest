import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const BROWSERS: Array<{ name: string; re: RegExp }> = [
  { name: "Edge", re: /Edg(?:e|A|iOS)?\/([\d.]+)/ },
  { name: "OPR/Opera", re: /OPR\/([\d.]+)/ },
  { name: "Opera", re: /Opera\/([\d.]+)/ },
  { name: "Chrome", re: /Chrome\/([\d.]+)/ },
  { name: "Firefox", re: /Firefox\/([\d.]+)/ },
  { name: "Safari", re: /Version\/([\d.]+).*Safari/ },
  { name: "Internet Explorer", re: /MSIE ([\d.]+)|Trident.*rv:([\d.]+)/ },
];

const OSES: Array<{ name: string; re: RegExp }> = [
  { name: "Windows 11/10", re: /Windows NT 10\.0/ },
  { name: "Windows 8.1", re: /Windows NT 6\.3/ },
  { name: "Windows 8", re: /Windows NT 6\.2/ },
  { name: "Windows 7", re: /Windows NT 6\.1/ },
  { name: "macOS", re: /Mac OS X ([\d_.]+)/ },
  { name: "iOS", re: /iPhone OS ([\d_]+)|CPU OS ([\d_]+)/ },
  { name: "Android", re: /Android ([\d.]+)/ },
  { name: "Linux", re: /Linux/ },
];

function detectBrowser(ua: string): { name: string; version: string } {
  for (const b of BROWSERS) {
    const m = ua.match(b.re);
    if (m) return { name: b.name, version: m[1] ?? m[2] ?? "" };
  }
  return { name: "Unknown", version: "" };
}

function detectOs(ua: string): { name: string; version: string } {
  for (const o of OSES) {
    const m = ua.match(o.re);
    if (m) {
      const ver = (m[1] ?? m[2] ?? "").replace(/_/g, ".");
      return { name: o.name, version: ver };
    }
  }
  return { name: "Unknown", version: "" };
}

function detectDevice(ua: string): string {
  if (/iPad/.test(ua)) return "Tablet (iPad)";
  if (/Tablet|SM-T/.test(ua)) return "Tablet";
  if (/iPhone|Android.*Mobile|Mobile/.test(ua)) return "Mobile";
  return "Desktop";
}

function detectEngine(ua: string): string {
  if (/Gecko\/.*Firefox/.test(ua)) return "Gecko";
  if (/AppleWebKit/.test(ua) && /Chrome/.test(ua)) return "Blink";
  if (/AppleWebKit/.test(ua)) return "WebKit";
  if (/Trident/.test(ua)) return "Trident";
  return "Unknown";
}

function detectBot(ua: string): boolean {
  return /bot|crawl|spider|slurp|bingpreview|facebookexternalhit/i.test(ua);
}

export default function UserAgentTool() {
  const [input, setInput] = useState("");

  const ua = input || (typeof navigator !== "undefined" ? navigator.userAgent : "");
  const result = useMemo(() => {
    if (!ua) return null;
    return {
      browser: detectBrowser(ua),
      os: detectOs(ua),
      device: detectDevice(ua),
      engine: detectEngine(ua),
      bot: detectBot(ua),
    };
  }, [ua]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">User-Agent string</span>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInput(typeof navigator !== "undefined" ? navigator.userAgent : "")}
          >
            Use mine
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
            Clear
          </Button>
        </div>
      </div>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste a user-agent string, or leave empty to parse your browser…"
        className="min-h-[100px] font-mono text-xs"
        spellCheck={false}
      />
      <p className="break-all text-xs text-muted-foreground">{ua || "—"}</p>

      {result && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Stat
            label="Browser"
            value={`${result.browser.name}${result.browser.version ? ` ${result.browser.version}` : ""}`}
          />
          <Stat label="Engine" value={result.engine} />
          <Stat
            label="OS"
            value={`${result.os.name}${result.os.version ? ` ${result.os.version}` : ""}`}
          />
          <Stat label="Device" value={result.device} />
          <Stat label="Bot / Crawler" value={result.bot ? "Yes" : "No"} />
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-sm">{value || "—"}</span>
    </div>
  );
}
