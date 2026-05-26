import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

type Mode = "encode" | "decode";

const NAMED: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  copy: "©",
  reg: "®",
  trade: "™",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  laquo: "«",
  raquo: "»",
  euro: "€",
  pound: "£",
  yen: "¥",
  cent: "¢",
  para: "¶",
  sect: "§",
  deg: "°",
  plusmn: "±",
  middot: "·",
  bull: "•",
  larr: "←",
  uarr: "↑",
  rarr: "→",
  darr: "↓",
  harr: "↔",
};

function encodeAll(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (ch === "&") out += "&amp;";
    else if (ch === "<") out += "&lt;";
    else if (ch === ">") out += "&gt;";
    else if (ch === '"') out += "&quot;";
    else if (ch === "'") out += "&#39;";
    else if (code < 128) out += ch;
    else out += `&#${code};`;
  }
  return out;
}

function encodeMinimal(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function decodeEntities(input: string): string {
  return input.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body) => {
    if (body[0] === "#") {
      const isHex = body[1] === "x" || body[1] === "X";
      const code = parseInt(body.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return whole;
      try {
        return String.fromCodePoint(code);
      } catch {
        return whole;
      }
    }
    return NAMED[body] ?? whole;
  });
}

export default function HtmlEntitiesTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");
  const [allChars, setAllChars] = useState(false);

  const output = useMemo(() => {
    if (!input) return "";
    if (mode === "decode") return decodeEntities(input);
    return allChars ? encodeAll(input) : encodeMinimal(input);
  }, [input, mode, allChars]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          ariaLabel="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: "encode", label: "Encode" },
            { value: "decode", label: "Decode" },
          ]}
        />
        {mode === "encode" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={allChars}
              onChange={(e) => setAllChars(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-brand"
            />
            <span>Encode all non-ASCII chars</span>
          </label>
        )}
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input} className="ml-auto">
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Input</span>
          <CodeEditor
            value={input}
            onChange={setInput}
            language="html"
            placeholder={mode === "encode" ? "<div>Hello & welcome</div>" : "&lt;div&gt;Hello&lt;/div&gt;"}
            minHeight="200px"
            className="lg:min-h-[300px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <CopyButton value={output} />
          </div>
          <CodeEditor
            value={output}
            language="html"
            readOnly
            minHeight="200px"
            className="lg:min-h-[300px]"
          />
        </div>
      </div>
    </div>
  );
}
