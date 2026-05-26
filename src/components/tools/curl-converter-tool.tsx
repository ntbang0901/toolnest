import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

type Target = "fetch" | "axios" | "node";

const SAMPLE = `curl -X POST "https://api.toolnest.dev/v1/items" \\
  -H "Authorization: Bearer abc123" \\
  -H "Content-Type: application/json" \\
  -d '{"name":"foo","tags":["a","b"]}'`;

interface Parsed {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string | null;
  basicAuth: [string, string] | null;
}

function tokenize(input: string): string[] {
  const tokens: string[] = [];
  let cur = "";
  let quote: '"' | "'" | null = null;
  let escape = false;
  const flush = () => {
    if (cur) tokens.push(cur);
    cur = "";
  };
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (escape) {
      if (ch !== "\n") cur += ch;
      escape = false;
      continue;
    }
    if (ch === "\\") {
      const next = input[i + 1];
      if (next === "\n" || next === "\r") {
        i++;
        continue;
      }
      escape = true;
      continue;
    }
    if (quote) {
      if (ch === quote) quote = null;
      else cur += ch;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (/\s/.test(ch)) {
      flush();
      continue;
    }
    cur += ch;
  }
  flush();
  return tokens;
}

function parseCurl(input: string): Parsed {
  const tokens = tokenize(input.trim().replace(/^curl\s+/i, ""));
  const out: Parsed = { url: "", method: "GET", headers: {}, body: null, basicAuth: null };
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    const next = () => tokens[++i] ?? "";
    if (t === "-X" || t === "--request") out.method = next().toUpperCase();
    else if (t === "-H" || t === "--header") {
      const h = next();
      const idx = h.indexOf(":");
      if (idx > 0) out.headers[h.slice(0, idx).trim()] = h.slice(idx + 1).trim();
    } else if (t === "-d" || t === "--data" || t === "--data-raw" || t === "--data-binary") {
      out.body = next();
      if (out.method === "GET") out.method = "POST";
    } else if (t === "-u" || t === "--user") {
      const v = next();
      const idx = v.indexOf(":");
      out.basicAuth = idx > 0 ? [v.slice(0, idx), v.slice(idx + 1)] : [v, ""];
    } else if (t === "-A" || t === "--user-agent") {
      out.headers["User-Agent"] = next();
    } else if (t === "-e" || t === "--referer") {
      out.headers["Referer"] = next();
    } else if (t === "-b" || t === "--cookie") {
      out.headers["Cookie"] = next();
    } else if (t.startsWith("-")) {
      // skip unknown flag (and its value if it looks like one)
      const v = tokens[i + 1];
      if (v && !v.startsWith("-") && !v.startsWith("http")) i++;
    } else if (!out.url) {
      out.url = t;
    }
  }
  return out;
}

function quoteJsString(s: string): string {
  return JSON.stringify(s);
}

function buildFetch(p: Parsed): string {
  const init: string[] = [];
  if (p.method && p.method !== "GET") init.push(`  method: ${quoteJsString(p.method)},`);
  const headers: Record<string, string> = { ...p.headers };
  if (p.basicAuth) {
    headers["Authorization"] = `Basic \${btoa(${quoteJsString(`${p.basicAuth[0]}:${p.basicAuth[1]}`)})}`;
  }
  if (Object.keys(headers).length) {
    const lines = Object.entries(headers).map(
      ([k, v]) => `    ${quoteJsString(k)}: ${v.startsWith("Basic ${") ? `\`${v}\`` : quoteJsString(v)},`,
    );
    init.push("  headers: {\n" + lines.join("\n") + "\n  },");
  }
  if (p.body) init.push(`  body: ${quoteJsString(p.body)},`);
  const initStr = init.length ? `, {\n${init.join("\n")}\n}` : "";
  return `const res = await fetch(${quoteJsString(p.url)}${initStr});\nconst data = await res.json();`;
}

function buildAxios(p: Parsed): string {
  const cfg: string[] = [
    `  url: ${quoteJsString(p.url)},`,
    `  method: ${quoteJsString(p.method.toLowerCase())},`,
  ];
  if (Object.keys(p.headers).length) {
    cfg.push(
      "  headers: {\n" +
        Object.entries(p.headers)
          .map(([k, v]) => `    ${quoteJsString(k)}: ${quoteJsString(v)},`)
          .join("\n") +
        "\n  },",
    );
  }
  if (p.basicAuth) {
    cfg.push(`  auth: { username: ${quoteJsString(p.basicAuth[0])}, password: ${quoteJsString(p.basicAuth[1])} },`);
  }
  if (p.body) {
    try {
      cfg.push(`  data: ${JSON.stringify(JSON.parse(p.body), null, 2).replace(/\n/g, "\n  ")},`);
    } catch {
      cfg.push(`  data: ${quoteJsString(p.body)},`);
    }
  }
  return `const { data } = await axios.request({\n${cfg.join("\n")}\n});`;
}

function buildNode(p: Parsed): string {
  return `import { request } from "node:https";\n\n${buildFetch(p)}`;
}

export default function CurlConverterTool() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<Target>("fetch");

  const output = useMemo(() => {
    if (!input.trim()) return "";
    try {
      const parsed = parseCurl(input);
      if (!parsed.url) return "Could not parse a URL from the cURL command.";
      if (target === "fetch") return buildFetch(parsed);
      if (target === "axios") return buildAxios(parsed);
      return buildNode(parsed);
    } catch (err) {
      return err instanceof Error ? err.message : "Failed";
    }
  }, [input, target]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Target"
          value={target}
          onChange={(v) => setTarget(v as Target)}
          options={[
            { value: "fetch", label: "fetch (browser)" },
            { value: "axios", label: "axios" },
            { value: "node", label: "Node 18+" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
          Sample
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">cURL command</span>
          <CodeEditor
            value={input}
            onChange={setInput}
            language="plain"
            placeholder="Paste a cURL command…"
            minHeight="260px"
            className="lg:min-h-[400px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">JavaScript</span>
            <CopyButton value={output} />
          </div>
          <CodeEditor
            value={output}
            language="javascript"
            readOnly
            minHeight="260px"
            className="lg:min-h-[400px]"
          />
        </div>
      </div>
    </div>
  );
}
