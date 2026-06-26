import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/tools/code-editor";
import { CopyButton } from "@/components/tools/copy-button";

interface HeaderInfo {
  description: string;
  category: "security" | "caching" | "content" | "authentication" | "cors" | "general";
}

const HEADER_DB: Record<string, HeaderInfo> = {
  "content-type": { description: "Media type of the request/response body (e.g. application/json; charset=utf-8).", category: "content" },
  "content-length": { description: "Size of the response body in bytes.", category: "content" },
  "content-encoding": { description: "Encoding applied to the body (gzip, br, deflate).", category: "content" },
  "content-language": { description: "Language of the intended audience for the content.", category: "content" },
  "content-disposition": { description: "Whether content is displayed inline or as a download attachment.", category: "content" },
  "accept": { description: "Media types the client is willing to receive.", category: "content" },
  "accept-encoding": { description: "Compression algorithms the client supports (gzip, br, deflate).", category: "content" },
  "accept-language": { description: "Preferred natural languages for the response.", category: "content" },
  "transfer-encoding": { description: "Encoding used to transfer the payload (chunked, compress, deflate, gzip).", category: "content" },
  "authorization": { description: "Credentials to authenticate the client with the server (e.g. Bearer <token>).", category: "authentication" },
  "www-authenticate": { description: "Authentication method that should be used to gain access to a resource.", category: "authentication" },
  "proxy-authenticate": { description: "Authentication method that should be used to gain access through a proxy.", category: "authentication" },
  "proxy-authorization": { description: "Credentials to authenticate the client with a proxy server.", category: "authentication" },
  "cookie": { description: "HTTP cookies previously sent by the server with Set-Cookie.", category: "authentication" },
  "set-cookie": { description: "Sends a cookie from the server to the user agent.", category: "authentication" },
  "cache-control": { description: "Directives for caching in both requests and responses (max-age, no-cache, private, public).", category: "caching" },
  "etag": { description: "Identifier for a specific version of a resource, used for cache validation.", category: "caching" },
  "if-none-match": { description: "Makes the request conditional — only return if ETag doesn't match (304 otherwise).", category: "caching" },
  "if-modified-since": { description: "Makes the request conditional — return 304 if not modified since the given date.", category: "caching" },
  "last-modified": { description: "Date/time when the resource was last modified.", category: "caching" },
  "expires": { description: "Date/time after which the response is considered stale.", category: "caching" },
  "pragma": { description: "Legacy HTTP/1.0 cache control (no-cache).", category: "caching" },
  "vary": { description: "Headers that determine whether a cached response can be used for future requests.", category: "caching" },
  "age": { description: "Time in seconds the object has been in a proxy cache.", category: "caching" },
  "strict-transport-security": { description: "Forces HTTPS connections. max-age sets duration; includeSubDomains extends to subdomains.", category: "security" },
  "content-security-policy": { description: "Controls resources the browser is allowed to load. Prevents XSS and data injection attacks.", category: "security" },
  "x-content-type-options": { description: "nosniff prevents browser from MIME-sniffing away from declared content-type.", category: "security" },
  "x-frame-options": { description: "Prevents clickjacking by controlling whether page can be loaded in a frame (DENY, SAMEORIGIN).", category: "security" },
  "x-xss-protection": { description: "Legacy XSS filter in older browsers (largely superseded by CSP).", category: "security" },
  "referrer-policy": { description: "Controls how much referrer information is included with requests.", category: "security" },
  "permissions-policy": { description: "Controls which browser features and APIs can be used in the page.", category: "security" },
  "cross-origin-opener-policy": { description: "Controls whether window can be shared with cross-origin documents.", category: "security" },
  "cross-origin-embedder-policy": { description: "Controls whether document can embed cross-origin resources.", category: "security" },
  "cross-origin-resource-policy": { description: "Indicates the resource can only be loaded by same-origin or same-site requests.", category: "security" },
  "access-control-allow-origin": { description: "CORS: specifies which origins can access the resource.", category: "cors" },
  "access-control-allow-methods": { description: "CORS: specifies allowed HTTP methods for cross-origin requests.", category: "cors" },
  "access-control-allow-headers": { description: "CORS: specifies allowed headers in the actual CORS request.", category: "cors" },
  "access-control-expose-headers": { description: "CORS: indicates which headers can be shared with browser JS.", category: "cors" },
  "access-control-max-age": { description: "CORS: how long preflight results can be cached (seconds).", category: "cors" },
  "access-control-allow-credentials": { description: "CORS: whether credentials (cookies, auth) can be included in cross-origin requests.", category: "cors" },
  "origin": { description: "Indicates the origin of the cross-origin request.", category: "cors" },
  "host": { description: "Domain name of the server and optionally the TCP port.", category: "general" },
  "user-agent": { description: "String identifying the client software (browser, HTTP client, library).", category: "general" },
  "referer": { description: "Address of the previous web page from which the request was made.", category: "general" },
  "location": { description: "URL to redirect the client to (used with 3xx responses).", category: "general" },
  "server": { description: "Information about the software used by the origin server.", category: "general" },
  "date": { description: "Date and time the message was originated.", category: "general" },
  "connection": { description: "Controls whether the network connection stays open after current transaction (keep-alive, close).", category: "general" },
  "keep-alive": { description: "Controls how long a persistent connection stays open.", category: "general" },
  "x-request-id": { description: "Unique identifier for the request, useful for tracing and debugging.", category: "general" },
  "x-correlation-id": { description: "Identifies a request across multiple services in distributed systems.", category: "general" },
  "x-forwarded-for": { description: "IP addresses of clients passing through proxies (leftmost = original client).", category: "general" },
  "x-forwarded-host": { description: "Original host requested by the client in the Host header.", category: "general" },
  "x-forwarded-proto": { description: "Protocol (http/https) used by the client to connect to the proxy.", category: "general" },
  "x-real-ip": { description: "Real IP address of the client (set by reverse proxies like nginx).", category: "general" },
  "forwarded": { description: "RFC 7239 standard replacement for the X-Forwarded-* headers.", category: "general" },
  "upgrade": { description: "Signals that the client wants to upgrade to a different protocol (e.g. WebSocket).", category: "general" },
  "link": { description: "Typed relationship with another resource (preload, rel=canonical, pagination).", category: "general" },
  "retry-after": { description: "How long the user agent should wait before making another request (rate limiting).", category: "general" },
  "x-ratelimit-limit": { description: "Maximum number of requests allowed in the rate limit window.", category: "general" },
  "x-ratelimit-remaining": { description: "Number of requests remaining in the current rate limit window.", category: "general" },
  "x-ratelimit-reset": { description: "Unix timestamp when the rate limit window resets.", category: "general" },
  "cf-ray": { description: "Cloudflare Ray ID — unique identifier for the request through Cloudflare's network.", category: "general" },
  "cf-cache-status": { description: "Cloudflare cache status: HIT, MISS, EXPIRED, BYPASS, etc.", category: "caching" },
};

const CATEGORY_COLORS: Record<string, string> = {
  security: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  caching: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  content: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  authentication: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  cors: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  general: "bg-gray-100 text-gray-800 dark:bg-gray-800/50 dark:text-gray-300",
};

interface ParsedHeader {
  name: string;
  value: string;
  info: HeaderInfo | null;
}

function parseHeaders(raw: string): ParsedHeader[] {
  const lines = raw.split("\n");
  const result: ParsedHeader[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    // Skip HTTP status/request lines
    if (/^HTTP\/|^GET |^POST |^PUT |^DELETE |^PATCH |^HEAD |^OPTIONS /.test(trimmed)) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const name = trimmed.slice(0, colonIdx).trim();
    const value = trimmed.slice(colonIdx + 1).trim();
    const info = HEADER_DB[name.toLowerCase()] ?? null;
    result.push({ name, value, info });
  }
  return result;
}

const EXAMPLE = `HTTP/2 200
content-type: application/json; charset=utf-8
content-length: 1234
cache-control: public, max-age=3600
strict-transport-security: max-age=31536000; includeSubDomains
access-control-allow-origin: https://example.com
x-request-id: abc123`;

export default function HttpHeaderAnalyzerTool() {
  const [input, setInput] = useState("");

  const parsed = useMemo(() => parseHeaders(input), [input]);

  const byCategory = useMemo(() => {
    const map: Record<string, ParsedHeader[]> = {};
    for (const h of parsed) {
      const cat = h.info?.category ?? "general";
      (map[cat] ??= []).push(h);
    }
    return map;
  }, [parsed]);

  const categoryOrder = ["security", "authentication", "cors", "caching", "content", "general"];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Raw HTTP headers</span>
          <button
            onClick={() => setInput(EXAMPLE)}
            className="text-xs text-muted-foreground underline-offset-2 hover:underline"
          >
            Load example
          </button>
        </div>
        <CodeEditor
          value={input}
          onChange={setInput}
          language="plain"
          placeholder={"Paste raw HTTP headers from curl -I, browser DevTools, or Postman…"}
          minHeight="180px"
        />
      </div>

      {parsed.length > 0 && (
        <div className="flex flex-col gap-4">
          <div className="text-sm text-muted-foreground">
            {parsed.length} header{parsed.length !== 1 ? "s" : ""} parsed
            {" · "}
            {parsed.filter((h) => h.info).length} recognized
          </div>

          {categoryOrder.map((cat) => {
            const headers = byCategory[cat];
            if (!headers?.length) return null;
            return (
              <div key={cat} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium capitalize ${CATEGORY_COLORS[cat]}`}>
                    {cat}
                  </span>
                </div>
                {headers.map((h, i) => (
                  <div key={i} className="rounded-md border border-border bg-card p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col gap-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-semibold">{h.name}</span>
                          <CopyButton value={`${h.name}: ${h.value}`} label="" />
                        </div>
                        <span className="font-mono text-xs break-all text-muted-foreground">{h.value}</span>
                        {h.info && (
                          <span className="text-xs text-muted-foreground mt-1">{h.info.description}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
