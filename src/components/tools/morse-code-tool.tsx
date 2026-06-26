import { useMemo, useState } from "react";
import { CodeEditor } from "@/components/tools/code-editor";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";

const MORSE: Record<string, string> = {
  A: ".-", B: "-...", C: "-.-.", D: "-..", E: ".", F: "..-.", G: "--.",
  H: "....", I: "..", J: ".---", K: "-.-", L: ".-..", M: "--", N: "-.",
  O: "---", P: ".--.", Q: "--.-", R: ".-.", S: "...", T: "-", U: "..-",
  V: "...-", W: ".--", X: "-..-", Y: "-.--", Z: "--..",
  "0": "-----", "1": ".----", "2": "..---", "3": "...--", "4": "....-",
  "5": ".....", "6": "-....", "7": "--...", "8": "---..", "9": "----.",
  ".": ".-.-.-", ",": "--..--", "?": "..--..", "'": ".----.", "!": "-.-.--",
  "/": "-..-.", "(": "-.--.", ")": "-.--.-", "&": ".-...", ":": "---...",
  ";": "-.-.-.", "=": "-...-", "+": ".-.-.", "-": "-....-", "_": "..--.-",
  '"': ".-..-.", "$": "...-..-", "@": ".--.-.",
};

const REVERSE_MORSE: Record<string, string> = Object.fromEntries(
  Object.entries(MORSE).map(([k, v]) => [v, k])
);

function encode(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const words = input.toUpperCase().split(" ");
  const unknowns: string[] = [];
  const result = words
    .map((word) =>
      word
        .split("")
        .map((ch) => {
          if (MORSE[ch]) return MORSE[ch];
          unknowns.push(ch);
          return "?";
        })
        .join(" ")
    )
    .join(" / ");
  if (unknowns.length > 0) {
    return { ok: false, error: `Unknown characters: ${[...new Set(unknowns)].join(", ")}` };
  }
  return { ok: true, value: result };
}

function decode(input: string): { ok: true; value: string } | { ok: false; error: string } {
  const words = input.trim().split(/\s*\/\s*/);
  const unknowns: string[] = [];
  const result = words
    .map((word) =>
      word
        .trim()
        .split(/\s+/)
        .map((code) => {
          if (!code) return "";
          if (REVERSE_MORSE[code]) return REVERSE_MORSE[code];
          unknowns.push(code);
          return "?";
        })
        .join("")
    )
    .join(" ");
  if (unknowns.length > 0) {
    return { ok: false, error: `Unknown codes: ${[...new Set(unknowns)].join(", ")}` };
  }
  return { ok: true, value: result };
}

type Mode = "encode" | "decode";

export default function MorseCodeTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [input, setInput] = useState("");

  const result = useMemo(() => {
    if (!input) return { ok: true as const, value: "" };
    return mode === "encode" ? encode(input) : decode(input);
  }, [input, mode]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <SegmentedControl
          ariaLabel="Mode"
          value={mode}
          onChange={(v) => setMode(v as Mode)}
          options={[
            { value: "encode", label: "Text → Morse" },
            { value: "decode", label: "Morse → Text" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">
            Input ({mode === "encode" ? "plain text" : "morse code (dots/dashes, / between words)"})
          </span>
          <CodeEditor
            value={input}
            onChange={setInput}
            language="plain"
            placeholder={
              mode === "encode"
                ? "Type or paste text…"
                : "Paste morse here (e.g. .... . .-.. .-.. --- / .-- --- .-. .-.. -..)…"
            }
            minHeight="200px"
            className="lg:min-h-[340px]"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <CopyButton value={result.ok ? result.value : ""} />
          </div>
          <CodeEditor
            value={result.ok ? result.value : ""}
            readOnly
            language="plain"
            minHeight="200px"
            className="lg:min-h-[340px]"
          />
          <div className="min-h-[1.25rem] text-xs">
            {!result.ok && <span className="text-destructive">{result.error}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
