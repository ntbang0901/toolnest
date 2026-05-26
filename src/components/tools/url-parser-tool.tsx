import { useMemo, useState } from "react";
import { CopyButton } from "@/components/tools/copy-button";
import { Button } from "@/components/ui/button";

const SAMPLE = "https://user:pass@api.example.com:8080/v1/search?q=hello+world&page=2&limit=10#results";

interface ParsedUrl {
  protocol: string;
  username: string;
  password: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;
  host: string;
  href: string;
  params: [string, string][];
}

function parseUrl(raw: string): ParsedUrl | null {
  try {
    const u = new URL(raw.trim());
    const params: [string, string][] = [];
    u.searchParams.forEach((v, k) => params.push([k, v]));
    return {
      protocol: u.protocol,
      username: u.username,
      password: u.password,
      hostname: u.hostname,
      port: u.port,
      pathname: u.pathname,
      search: u.search,
      hash: u.hash,
      origin: u.origin,
      host: u.host,
      href: u.href,
      params,
    };
  } catch {
    return null;
  }
}

function buildUrl(p: ParsedUrl): string {
  try {
    const u = new URL(`${p.protocol}//${p.host}${p.pathname}`);
    if (p.username) u.username = p.username;
    if (p.password) u.password = p.password;
    p.params.forEach(([k, v]) => u.searchParams.append(k, v));
    if (p.hash) u.hash = p.hash;
    return u.href;
  } catch {
    return "";
  }
}

export default function UrlParserTool() {
  const [input, setInput] = useState(SAMPLE);
  const parsed = useMemo(() => parseUrl(input), [input]);

  function updateParam(i: number, key: string, value: string) {
    if (!parsed) return;
    const params = [...parsed.params];
    params[i] = [key, value];
    const next = { ...parsed, params };
    setInput(buildUrl(next));
  }

  function removeParam(i: number) {
    if (!parsed) return;
    const params = parsed.params.filter((_, idx) => idx !== i);
    setInput(buildUrl({ ...parsed, params }));
  }

  function addParam() {
    if (!parsed) return;
    const params = [...parsed.params, ["key", "value"] as [string, string]];
    setInput(buildUrl({ ...parsed, params }));
  }

  const fields: { label: string; key: keyof ParsedUrl; editable?: boolean }[] = [
    { label: "Protocol", key: "protocol" },
    { label: "Origin", key: "origin" },
    { label: "Host", key: "host" },
    { label: "Hostname", key: "hostname" },
    { label: "Port", key: "port" },
    { label: "Pathname", key: "pathname" },
    { label: "Username", key: "username" },
    { label: "Password", key: "password" },
    { label: "Hash", key: "hash" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">URL</label>
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 font-mono text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
            Example
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
            Clear
          </Button>
        </div>
        {input && !parsed && (
          <p className="text-xs text-destructive">Invalid URL — include the protocol (https://…)</p>
        )}
      </div>

      {parsed && (
        <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map(({ label, key }) => {
              const val = String(parsed[key] ?? "");
              if (!val) return null;
              return (
                <div key={key} className="flex flex-col gap-1 rounded-md border border-border bg-card p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                    <CopyButton value={val} label="" />
                  </div>
                  <span className="font-mono text-sm break-all">{val}</span>
                </div>
              );
            })}
          </div>

          {/* Query params editor */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Query Parameters</span>
              <Button variant="outline" size="sm" onClick={addParam}>+ Add</Button>
            </div>
            {parsed.params.length === 0 ? (
              <p className="text-sm text-muted-foreground">No query parameters.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {parsed.params.map(([k, v], i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      value={k}
                      onChange={(e) => updateParam(i, e.target.value, v)}
                      className="flex h-8 w-36 rounded-md border border-input bg-transparent px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <span className="text-muted-foreground">=</span>
                    <input
                      value={v}
                      onChange={(e) => updateParam(i, k, e.target.value)}
                      className="flex h-8 flex-1 rounded-md border border-input bg-transparent px-2 font-mono text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeParam(i)} className="text-muted-foreground hover:text-destructive">
                      ×
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
            <span className="font-mono text-xs break-all flex-1">{parsed.href}</span>
            <CopyButton value={parsed.href} label="" />
          </div>
        </>
      )}
    </div>
  );
}
