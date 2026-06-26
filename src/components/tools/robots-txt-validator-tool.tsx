import { useState, useCallback } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeEditor } from "@/components/tools/code-editor";

interface Rule {
  userAgent: string;
  allow: string[];
  disallow: string[];
  crawlDelay?: number;
}

interface ParseResult {
  rules: Rule[];
  sitemaps: string[];
  errors: string[];
  warnings: string[];
}

interface MatchResult {
  allowed: boolean;
  matchedRule?: string;
  matchedUserAgent?: string;
}

function parseRobotsTxt(content: string): ParseResult {
  const lines = content.split("\n");
  const rules: Rule[] = [];
  const sitemaps: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  let currentAgents: string[] = [];
  let currentAllows: string[] = [];
  let currentDisallows: string[] = [];
  let currentCrawlDelay: number | undefined;
  let inGroup = false;

  function flushGroup() {
    if (currentAgents.length > 0) {
      for (const ua of currentAgents) {
        rules.push({
          userAgent: ua,
          allow: [...currentAllows],
          disallow: [...currentDisallows],
          crawlDelay: currentCrawlDelay,
        });
      }
    }
    currentAgents = [];
    currentAllows = [];
    currentDisallows = [];
    currentCrawlDelay = undefined;
    inGroup = false;
  }

  lines.forEach((rawLine, idx) => {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (!line) {
      if (inGroup) flushGroup();
      return;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx === -1) {
      errors.push(`Line ${idx + 1}: missing colon in "${rawLine.trim()}"`);
      return;
    }

    const field = line.slice(0, colonIdx).trim().toLowerCase();
    const value = line.slice(colonIdx + 1).trim();

    switch (field) {
      case "user-agent":
        if (inGroup && currentDisallows.length === 0 && currentAllows.length === 0) {
          // Same group, multiple User-agent lines
          currentAgents.push(value || "*");
        } else {
          if (inGroup) flushGroup();
          currentAgents.push(value || "*");
          inGroup = true;
        }
        break;
      case "disallow":
        if (!inGroup) {
          warnings.push(`Line ${idx + 1}: Disallow before User-agent`);
        } else {
          currentDisallows.push(value);
        }
        break;
      case "allow":
        if (!inGroup) {
          warnings.push(`Line ${idx + 1}: Allow before User-agent`);
        } else {
          currentAllows.push(value);
        }
        break;
      case "sitemap":
        sitemaps.push(value);
        break;
      case "crawl-delay":
        if (inGroup) {
          const n = parseFloat(value);
          if (isNaN(n)) errors.push(`Line ${idx + 1}: invalid Crawl-delay value "${value}"`);
          else currentCrawlDelay = n;
        }
        break;
      default:
        warnings.push(`Line ${idx + 1}: unknown field "${field}"`);
    }
  });

  if (inGroup) flushGroup();
  return { rules, sitemaps, errors, warnings };
}

function pathMatchesPattern(path: string, pattern: string): boolean {
  if (!pattern) return false;
  // Escape regex special chars except * and $
  const escaped = pattern.replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const regex = new RegExp(`^${escaped}`);
  return regex.test(path);
}

function testUrl(parsed: ParseResult, url: string, userAgent: string): MatchResult {
  let path: string;
  try {
    path = new URL(url).pathname + new URL(url).search;
  } catch {
    path = url.startsWith("/") ? url : `/${url}`;
  }

  const ua = userAgent.toLowerCase();
  // Find applicable rules: exact match first, then wildcard
  const exact = parsed.rules.filter((r) => r.userAgent.toLowerCase() === ua);
  const wildcard = parsed.rules.filter((r) => r.userAgent === "*");
  const applicable = exact.length > 0 ? exact : wildcard;

  if (applicable.length === 0) {
    return { allowed: true, matchedUserAgent: undefined };
  }

  // Combine all allow/disallow from applicable agents, pick longest match
  let bestAllow: { len: number; rule: string } | null = null;
  let bestDisallow: { len: number; rule: string } | null = null;

  for (const rule of applicable) {
    for (const a of rule.allow) {
      if (pathMatchesPattern(path, a) && a.length > (bestAllow?.len ?? -1)) {
        bestAllow = { len: a.length, rule: `Allow: ${a}` };
      }
    }
    for (const d of rule.disallow) {
      if (pathMatchesPattern(path, d) && d.length > (bestDisallow?.len ?? -1)) {
        bestDisallow = { len: d.length, rule: `Disallow: ${d}` };
      }
    }
  }

  if (!bestDisallow) return { allowed: true, matchedUserAgent: applicable[0].userAgent };
  if (!bestAllow) return { allowed: false, matchedRule: bestDisallow.rule, matchedUserAgent: applicable[0].userAgent };
  // Longer match wins; ties → allow wins
  if (bestAllow.len >= bestDisallow.len) {
    return { allowed: true, matchedRule: bestAllow.rule, matchedUserAgent: applicable[0].userAgent };
  }
  return { allowed: false, matchedRule: bestDisallow.rule, matchedUserAgent: applicable[0].userAgent };
}

const SAMPLE = `User-agent: *
Disallow: /private/
Disallow: /admin/
Allow: /public/

User-agent: Googlebot
Disallow: /no-google/
Crawl-delay: 2

Sitemap: https://example.com/sitemap.xml`;

export default function RobotsTxtValidatorTool() {
  const [content, setContent] = useState(SAMPLE);
  const [testUrl_, setTestUrl_] = useState("");
  const [testAgent, setTestAgent] = useState("*");
  const [parsed, setParsed] = useState<ParseResult | null>(null);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

  const validate = useCallback(() => {
    const result = parseRobotsTxt(content);
    setParsed(result);
    setMatchResult(null);
  }, [content]);

  const testMatch = useCallback(() => {
    if (!parsed || !testUrl_) return;
    setMatchResult(testUrl(parsed, testUrl_, testAgent));
  }, [parsed, testUrl_, testAgent]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" htmlFor="robots-content">
          robots.txt content
        </label>
        <CodeEditor
          value={content}
          onChange={setContent}
          language="plain"
          placeholder="Paste your robots.txt here..."
          minHeight="220px"
        />
        <Button onClick={validate} className="self-start">
          <Bot className="h-4 w-4" />
          Validate
        </Button>
      </div>

      {parsed && (
        <>
          {(parsed.errors.length > 0 || parsed.warnings.length > 0) && (
            <div className="flex flex-col gap-2">
              {parsed.errors.map((e, i) => (
                <div key={i} className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Error: {e}
                </div>
              ))}
              {parsed.warnings.map((w, i) => (
                <div key={i} className="rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-sm text-yellow-700 dark:text-yellow-400">
                  Warning: {w}
                </div>
              ))}
            </div>
          )}

          {parsed.errors.length === 0 && parsed.warnings.length === 0 && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 text-sm text-green-700 dark:text-green-400">
              Valid robots.txt — no errors or warnings.
            </div>
          )}

          {parsed.sitemaps.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <span className="text-sm font-medium">Sitemaps</span>
              <ul className="list-disc list-inside text-sm font-mono text-muted-foreground space-y-0.5">
                {parsed.sitemaps.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}

          {parsed.rules.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">Parsed rules</span>
              <div className="overflow-x-auto rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-3 py-2 text-left font-medium">User-agent</th>
                      <th className="px-3 py-2 text-left font-medium">Allow</th>
                      <th className="px-3 py-2 text-left font-medium">Disallow</th>
                      <th className="px-3 py-2 text-left font-medium">Crawl-delay</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsed.rules.map((rule, i) => (
                      <tr key={i} className="border-b last:border-0">
                        <td className="px-3 py-2 font-mono">{rule.userAgent}</td>
                        <td className="px-3 py-2 font-mono text-green-700 dark:text-green-400">
                          {rule.allow.length > 0 ? rule.allow.join(", ") : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-destructive">
                          {rule.disallow.length > 0 ? rule.disallow.join(", ") : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2 font-mono text-muted-foreground">
                          {rule.crawlDelay ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 rounded-md border p-4">
            <span className="text-sm font-medium">URL tester</span>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                <label className="text-xs text-muted-foreground" htmlFor="test-url">URL or path</label>
                <Input
                  id="test-url"
                  value={testUrl_}
                  onChange={(e) => setTestUrl_(e.target.value)}
                  placeholder="/private/page or https://example.com/page"
                  className="font-mono text-sm"
                />
              </div>
              <div className="flex flex-col gap-1.5 w-40">
                <label className="text-xs text-muted-foreground" htmlFor="test-agent">User-agent</label>
                <Input
                  id="test-agent"
                  value={testAgent}
                  onChange={(e) => setTestAgent(e.target.value)}
                  placeholder="*"
                  className="font-mono text-sm"
                />
              </div>
            </div>
            <Button onClick={testMatch} disabled={!testUrl_} className="self-start">
              Test
            </Button>

            {matchResult && (
              <div className={`rounded-md border px-3 py-2 text-sm ${matchResult.allowed ? "border-green-500/40 bg-green-500/10 text-green-700 dark:text-green-400" : "border-destructive/50 bg-destructive/10 text-destructive"}`}>
                <span className="font-medium">{matchResult.allowed ? "Allowed" : "Blocked"}</span>
                {matchResult.matchedRule && <span> — matched <span className="font-mono">{matchResult.matchedRule}</span></span>}
                {matchResult.matchedUserAgent && <span> (User-agent: <span className="font-mono">{matchResult.matchedUserAgent}</span>)</span>}
                {!matchResult.matchedUserAgent && <span> — no applicable rules found</span>}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
