import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";

interface StatusEntry {
  code: number;
  name: string;
  description: string;
}

const STATUSES: StatusEntry[] = [
  { code: 100, name: "Continue", description: "Initial part of request received; client should continue." },
  { code: 101, name: "Switching Protocols", description: "Server agrees to switch protocols per Upgrade header." },
  { code: 200, name: "OK", description: "Standard success response." },
  { code: 201, name: "Created", description: "Resource was created. Location header points to it." },
  { code: 202, name: "Accepted", description: "Accepted for processing but not yet acted upon." },
  { code: 204, name: "No Content", description: "Success with no response body." },
  { code: 206, name: "Partial Content", description: "Partial body sent; used with Range requests." },
  { code: 301, name: "Moved Permanently", description: "Resource has a new permanent URL." },
  { code: 302, name: "Found", description: "Temporary redirect; original URL still valid." },
  { code: 303, name: "See Other", description: "Redirect to a GET resource (e.g. after POST)." },
  { code: 304, name: "Not Modified", description: "Cached response is still valid." },
  { code: 307, name: "Temporary Redirect", description: "Temporary redirect; method is preserved." },
  { code: 308, name: "Permanent Redirect", description: "Permanent redirect; method is preserved." },
  { code: 400, name: "Bad Request", description: "Malformed request; client should not repeat without changes." },
  { code: 401, name: "Unauthorized", description: "Authentication required or has failed." },
  { code: 403, name: "Forbidden", description: "Server understood but refuses to authorize." },
  { code: 404, name: "Not Found", description: "Resource does not exist." },
  { code: 405, name: "Method Not Allowed", description: "HTTP method not supported for this resource." },
  { code: 408, name: "Request Timeout", description: "Server timed out waiting for the request." },
  { code: 409, name: "Conflict", description: "Request conflicts with current state of the resource." },
  { code: 410, name: "Gone", description: "Resource is permanently removed." },
  { code: 413, name: "Payload Too Large", description: "Request body exceeds server limits." },
  { code: 415, name: "Unsupported Media Type", description: "Request media type is not supported." },
  { code: 418, name: "I'm a teapot", description: "RFC 2324; not implemented by HTTP servers." },
  { code: 422, name: "Unprocessable Entity", description: "Semantically invalid request body." },
  { code: 425, name: "Too Early", description: "Server unwilling to process replayed requests." },
  { code: 428, name: "Precondition Required", description: "Origin server requires the request to be conditional." },
  { code: 429, name: "Too Many Requests", description: "Rate limit exceeded." },
  { code: 451, name: "Unavailable For Legal Reasons", description: "Resource censored by legal demand." },
  { code: 500, name: "Internal Server Error", description: "Generic server error." },
  { code: 501, name: "Not Implemented", description: "Server doesn't recognize the request method." },
  { code: 502, name: "Bad Gateway", description: "Invalid response from upstream server." },
  { code: 503, name: "Service Unavailable", description: "Server overloaded or down for maintenance." },
  { code: 504, name: "Gateway Timeout", description: "Upstream server timed out." },
  { code: 511, name: "Network Authentication Required", description: "Client must authenticate to gain network access." },
];

function classify(code: number): { label: string; tone: string } {
  if (code >= 100 && code < 200) return { label: "Informational", tone: "text-sky-600 dark:text-sky-400" };
  if (code >= 200 && code < 300) return { label: "Success", tone: "text-emerald-600 dark:text-emerald-400" };
  if (code >= 300 && code < 400) return { label: "Redirect", tone: "text-amber-600 dark:text-amber-400" };
  if (code >= 400 && code < 500) return { label: "Client error", tone: "text-rose-600 dark:text-rose-400" };
  if (code >= 500 && code < 600) return { label: "Server error", tone: "text-rose-700 dark:text-rose-300" };
  return { label: "Unknown", tone: "text-muted-foreground" };
}

export default function HttpStatusTool() {
  const [query, setQuery] = useState("");

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return STATUSES;
    return STATUSES.filter(
      (s) =>
        s.code.toString().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-4">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by code, name, or meaning…"
        className="font-mono"
        spellCheck={false}
      />

      <div className="grid gap-2 sm:grid-cols-2">
        {results.map((s) => {
          const c = classify(s.code);
          return (
            <div key={s.code} className="flex flex-col gap-1 rounded-md border border-border bg-card p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-lg">{s.code}</span>
                <span className={`text-xs ${c.tone}`}>{c.label}</span>
              </div>
              <div className="text-sm font-medium">{s.name}</div>
              <div className="text-xs text-muted-foreground">{s.description}</div>
            </div>
          );
        })}
        {results.length === 0 && (
          <p className="col-span-full p-6 text-center text-sm text-muted-foreground">
            No status code matches "{query}".
          </p>
        )}
      </div>
    </div>
  );
}
