import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/tools/code-editor";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

function getUtf8Bytes(cp: number): string {
  if (cp < 0x80) return cp.toString(16).padStart(2, "0").toUpperCase();
  if (cp < 0x800) {
    const b1 = 0xc0 | (cp >> 6);
    const b2 = 0x80 | (cp & 0x3f);
    return `${b1.toString(16).toUpperCase()} ${b2.toString(16).toUpperCase()}`;
  }
  if (cp < 0x10000) {
    const b1 = 0xe0 | (cp >> 12);
    const b2 = 0x80 | ((cp >> 6) & 0x3f);
    const b3 = 0x80 | (cp & 0x3f);
    return `${b1.toString(16).toUpperCase()} ${b2.toString(16).toUpperCase()} ${b3.toString(16).toUpperCase()}`;
  }
  const b1 = 0xf0 | (cp >> 18);
  const b2 = 0x80 | ((cp >> 12) & 0x3f);
  const b3 = 0x80 | ((cp >> 6) & 0x3f);
  const b4 = 0x80 | (cp & 0x3f);
  return `${b1.toString(16).toUpperCase()} ${b2.toString(16).toUpperCase()} ${b3.toString(16).toUpperCase()} ${b4.toString(16).toUpperCase()}`;
}

interface CharInfo {
  char: string;
  codepoint: number;
  hex: string;
  escape: string;
  htmlEntity: string;
  utf8: string;
  isAscii: boolean;
}

export default function UnicodeInspectorTool() {
  const [input, setInput] = useState("");

  const chars = useMemo<CharInfo[]>(() => {
    if (!input) return [];
    const result: CharInfo[] = [];
    for (const char of [...input]) {
      const cp = char.codePointAt(0)!;
      const hex = cp.toString(16).toUpperCase().padStart(4, "0");
      result.push({
        char,
        codepoint: cp,
        hex,
        escape: cp > 0xffff ? `\\u{${hex}}` : `\\u${hex}`,
        htmlEntity: `&#${cp};`,
        utf8: getUtf8Bytes(cp),
        isAscii: cp < 128,
      });
    }
    return result;
  }, [input]);

  const uniqueCount = useMemo(() => new Set(chars.map((c) => c.codepoint)).size, [chars]);

  const tableText = chars
    .map((c) => `U+${c.hex}\t${c.char}\t${c.escape}\t${c.htmlEntity}\t${c.utf8}`)
    .join("\n");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Input text</span>
          <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
            Clear
          </Button>
        </div>
        <CodeEditor
          value={input}
          onChange={setInput}
          language="plain"
          placeholder="Type or paste text to inspect Unicode codepoints…"
          minHeight="120px"
        />
      </div>

      {chars.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>{chars.length} characters</span>
              <span>{uniqueCount} unique codepoints</span>
              <span>{chars.filter((c) => !c.isAscii).length} non-ASCII</span>
            </div>
            <CopyButton value={tableText} label="Copy table" />
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Char</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Codepoint</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Escape</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">HTML Entity</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">UTF-8 bytes</th>
                </tr>
              </thead>
              <tbody>
                {chars.map((c, i) => (
                  <tr
                    key={i}
                    className={`border-b border-border last:border-0 ${!c.isAscii ? "bg-amber-50 dark:bg-amber-950/20" : ""}`}
                  >
                    <td className="px-3 py-2 font-mono text-lg">{c.char}</td>
                    <td className="px-3 py-2 font-mono text-xs">U+{c.hex}</td>
                    <td className="px-3 py-2 font-mono text-xs">{c.escape}</td>
                    <td className="px-3 py-2 font-mono text-xs">{c.htmlEntity}</td>
                    <td className="px-3 py-2 font-mono text-xs">{c.utf8}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
