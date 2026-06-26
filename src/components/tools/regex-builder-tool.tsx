import { useState, useMemo } from "react";
import { Info } from "lucide-react";
import { Input } from "@/components/ui/input";
import { CodeEditor } from "@/components/tools/code-editor";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/tools/copy-button";

// ---------------------------------------------------------------------------
// Regex tokenizer / explainer
// ---------------------------------------------------------------------------

interface Token {
  raw: string;
  description: string;
  type: "anchor" | "quantifier" | "group" | "class" | "escape" | "alternation" | "literal" | "dot";
}

function tokenize(pattern: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < pattern.length) {
    const ch = pattern[i];

    // Escaped sequences
    if (ch === "\\") {
      const next = pattern[i + 1];
      if (!next) {
        tokens.push({ raw: "\\", description: "Literal backslash (incomplete escape)", type: "escape" });
        i++;
        continue;
      }
      const raw = `\\${next}`;
      let description = "";
      switch (next) {
        case "d": description = "Any digit (0–9)"; break;
        case "D": description = "Any non-digit"; break;
        case "w": description = "Any word character (a-z, A-Z, 0-9, _)"; break;
        case "W": description = "Any non-word character"; break;
        case "s": description = "Any whitespace character"; break;
        case "S": description = "Any non-whitespace character"; break;
        case "b": description = "Word boundary"; break;
        case "B": description = "Non-word boundary"; break;
        case "n": description = "Newline"; break;
        case "r": description = "Carriage return"; break;
        case "t": description = "Tab character"; break;
        case "0": description = "Null character"; break;
        default:  description = `Escaped literal "${next}"`; break;
      }
      tokens.push({ raw, description, type: "escape" });
      i += 2;
      continue;
    }

    // Character class [...]
    if (ch === "[") {
      let end = i + 1;
      // handle negation and literal ] at start
      if (pattern[end] === "^") end++;
      if (pattern[end] === "]") end++;
      while (end < pattern.length && pattern[end] !== "]") end++;
      const raw = pattern.slice(i, end + 1);
      const negated = pattern[i + 1] === "^";
      const inner = negated ? raw.slice(2, -1) : raw.slice(1, -1);
      tokens.push({
        raw,
        description: negated
          ? `Any character NOT in [${inner}]`
          : `Any character in [${inner}]`,
        type: "class",
      });
      i = end + 1;
      continue;
    }

    // Non-capturing group (?:...)
    if (ch === "(" && pattern.slice(i, i + 3) === "(?:") {
      // find matching close paren (simple depth counter)
      let depth = 1;
      let j = i + 3;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === "(" ) depth++;
        else if (pattern[j] === ")") depth--;
        j++;
      }
      const raw = pattern.slice(i, j);
      const inner = raw.slice(3, -1);
      tokens.push({ raw, description: `Non-capturing group containing: ${inner}`, type: "group" });
      i = j;
      continue;
    }

    // Lookahead (?=...) / (?!...) / lookbehind (?<=...) / (?<!...)
    if (ch === "(" && pattern[i + 1] === "?") {
      const ahead = pattern.slice(i, i + 4);
      let kind = "Lookahead";
      if (ahead === "(?=") kind = "Positive lookahead";
      else if (ahead === "(?!") kind = "Negative lookahead";
      else if (pattern.slice(i, i + 5) === "(?<=") kind = "Positive lookbehind";
      else if (pattern.slice(i, i + 5) === "(?<!") kind = "Negative lookbehind";

      let depth = 1;
      let j = i + 2;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === "(") depth++;
        else if (pattern[j] === ")") depth--;
        j++;
      }
      const raw = pattern.slice(i, j);
      tokens.push({ raw, description: `${kind}: ${raw}`, type: "group" });
      i = j;
      continue;
    }

    // Capturing group (...)
    if (ch === "(") {
      let depth = 1;
      let j = i + 1;
      while (j < pattern.length && depth > 0) {
        if (pattern[j] === "(") depth++;
        else if (pattern[j] === ")") depth--;
        j++;
      }
      const raw = pattern.slice(i, j);
      const inner = raw.slice(1, -1);
      // count group number
      const groupNum = tokens.filter((t) => t.type === "group" && t.raw.startsWith("(") && !t.raw.startsWith("(?")).length + 1;
      tokens.push({ raw, description: `Capturing group #${groupNum}: ${inner}`, type: "group" });
      i = j;
      continue;
    }

    // Quantifiers: {n}, {n,}, {n,m}
    if (ch === "{") {
      const end = pattern.indexOf("}", i);
      if (end !== -1) {
        const raw = pattern.slice(i, end + 1);
        const inner = raw.slice(1, -1);
        let description = "";
        if (/^\d+$/.test(inner)) {
          description = `Exactly ${inner} times`;
        } else if (/^\d+,$/.test(inner)) {
          description = `At least ${inner.slice(0, -1)} times`;
        } else {
          const [min, max] = inner.split(",");
          description = `Between ${min} and ${max} times`;
        }
        tokens.push({ raw, description, type: "quantifier" });
        i = end + 1;
        continue;
      }
    }

    // Single-char quantifiers
    if (ch === "+") { tokens.push({ raw: "+", description: "One or more (greedy)", type: "quantifier" }); i++; continue; }
    if (ch === "*") { tokens.push({ raw: "*", description: "Zero or more (greedy)", type: "quantifier" }); i++; continue; }
    if (ch === "?") { tokens.push({ raw: "?", description: "Zero or one (optional)", type: "quantifier" }); i++; continue; }

    // Anchors
    if (ch === "^") { tokens.push({ raw: "^", description: "Start of string / line", type: "anchor" }); i++; continue; }
    if (ch === "$") { tokens.push({ raw: "$", description: "End of string / line", type: "anchor" }); i++; continue; }

    // Dot
    if (ch === ".") { tokens.push({ raw: ".", description: "Any character except newline", type: "dot" }); i++; continue; }

    // Alternation
    if (ch === "|") { tokens.push({ raw: "|", description: "OR — match left or right side", type: "alternation" }); i++; continue; }

    // Literal
    tokens.push({ raw: ch, description: `Literal "${ch}"`, type: "literal" });
    i++;
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// Highlight helpers
// ---------------------------------------------------------------------------

const TOKEN_COLORS: Record<Token["type"], string> = {
  anchor:      "bg-purple-500/20 text-purple-700 dark:text-purple-300",
  quantifier:  "bg-orange-500/20 text-orange-700 dark:text-orange-300",
  group:       "bg-blue-500/20 text-blue-700 dark:text-blue-300",
  class:       "bg-green-500/20 text-green-700 dark:text-green-300",
  escape:      "bg-yellow-500/20 text-yellow-700 dark:text-yellow-300",
  alternation: "bg-pink-500/20 text-pink-700 dark:text-pink-300",
  literal:     "bg-muted text-muted-foreground",
  dot:         "bg-cyan-500/20 text-cyan-700 dark:text-cyan-300",
};

// ---------------------------------------------------------------------------
// Match result helpers
// ---------------------------------------------------------------------------

interface MatchSegment {
  text: string;
  matched: boolean;
  groupIndex?: number; // which group this highlight belongs to (0 = full match)
}

function buildSegments(text: string, matches: RegExpExecArray[]): MatchSegment[] {
  if (matches.length === 0) return [{ text, matched: false }];

  const segments: MatchSegment[] = [];
  let cursor = 0;

  for (const m of matches) {
    const start = m.index ?? 0;
    const end = start + m[0].length;
    if (cursor < start) segments.push({ text: text.slice(cursor, start), matched: false });
    segments.push({ text: m[0], matched: true });
    cursor = end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), matched: false });
  return segments;
}

// ---------------------------------------------------------------------------
// Cheat sheet data
// ---------------------------------------------------------------------------

const CHEAT_SHEET: Array<{ pattern: string; description: string }> = [
  { pattern: ".",    description: "Any character except newline" },
  { pattern: "\\d",  description: "Digit [0-9]" },
  { pattern: "\\D",  description: "Non-digit" },
  { pattern: "\\w",  description: "Word char [a-zA-Z0-9_]" },
  { pattern: "\\W",  description: "Non-word char" },
  { pattern: "\\s",  description: "Whitespace" },
  { pattern: "\\S",  description: "Non-whitespace" },
  { pattern: "\\b",  description: "Word boundary" },
  { pattern: "^",    description: "Start of string" },
  { pattern: "$",    description: "End of string" },
  { pattern: "a+",   description: "One or more a" },
  { pattern: "a*",   description: "Zero or more a" },
  { pattern: "a?",   description: "Zero or one a" },
  { pattern: "a{3}", description: "Exactly 3 a" },
  { pattern: "a{2,4}", description: "2 to 4 a" },
  { pattern: "[abc]",  description: "a, b, or c" },
  { pattern: "[^abc]", description: "Not a, b, or c" },
  { pattern: "[a-z]",  description: "a through z" },
  { pattern: "(abc)",  description: "Capturing group" },
  { pattern: "(?:abc)", description: "Non-capturing group" },
  { pattern: "a|b",  description: "a or b" },
  { pattern: "(?=a)", description: "Positive lookahead" },
  { pattern: "(?!a)", description: "Negative lookahead" },
];

// ---------------------------------------------------------------------------
// Flags
// ---------------------------------------------------------------------------

const FLAG_LIST: Array<{ flag: string; label: string; description: string }> = [
  { flag: "g", label: "g", description: "Global — find all matches" },
  { flag: "i", label: "i", description: "Case insensitive" },
  { flag: "m", label: "m", description: "Multiline (^ and $ match line boundaries)" },
  { flag: "s", label: "s", description: "Dotall (. matches newline)" },
  { flag: "u", label: "u", description: "Unicode mode" },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const DEFAULT_PATTERN = "(\\d{1,3}\\.){3}\\d{1,3}";
const DEFAULT_TEST = `Valid IPs:
192.168.1.1
10.0.0.255
172.16.254.1

Not an IP:
999.999.999.999
hello world
`;

export default function RegexBuilderTool() {
  const [pattern, setPattern] = useState(DEFAULT_PATTERN);
  const [flags, setFlags] = useState<Set<string>>(new Set(["g"]));
  const [testString, setTestString] = useState(DEFAULT_TEST);
  const [showCheatSheet, setShowCheatSheet] = useState(false);

  const toggleFlag = (f: string) => {
    setFlags((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });
  };

  const flagStr = [...flags].sort().join("");

  // Build regex
  const { regex, regexError } = useMemo<{ regex: RegExp | null; regexError: string }>(() => {
    if (!pattern) return { regex: null, regexError: "" };
    try {
      // Always use 'd' flag for indices if supported, fall back gracefully
      return { regex: new RegExp(pattern, flagStr), regexError: "" };
    } catch (err) {
      return { regex: null, regexError: err instanceof Error ? err.message : "Invalid regex" };
    }
  }, [pattern, flagStr]);

  // Collect matches
  const matches = useMemo<RegExpExecArray[]>(() => {
    if (!regex || !testString) return [];
    const results: RegExpExecArray[] = [];
    if (flags.has("g")) {
      let m: RegExpExecArray | null;
      const r = new RegExp(pattern, flagStr);
      while ((m = r.exec(testString)) !== null) {
        results.push(m);
        // Prevent infinite loop on zero-length matches
        if (m[0].length === 0) r.lastIndex++;
      }
    } else {
      const m = regex.exec(testString);
      if (m) results.push(m);
    }
    return results;
  }, [regex, testString, pattern, flagStr, flags]);

  // Highlighted segments
  const segments = useMemo(() => buildSegments(testString, matches), [testString, matches]);

  // Tokens for breakdown
  const tokens = useMemo(() => (pattern ? tokenize(pattern) : []), [pattern]);

  // Groups
  const groups = useMemo(() => {
    return matches.flatMap((m, mi) =>
      (m.slice(1) as Array<string | undefined>).map((g, gi) => ({
        matchIndex: mi + 1,
        groupIndex: gi + 1,
        value: g ?? "(no match)",
      }))
    );
  }, [matches]);

  const regexDisplay = `/${pattern}/${flagStr}`;

  return (
    <div className="flex flex-col gap-6">
      {/* Pattern + flags row */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" htmlFor="regex-pattern">
            Regex pattern
          </label>
          <CopyButton value={regexDisplay} label="Copy regex" />
        </div>

        <div className="flex items-center gap-0 rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
          <span className="select-none px-3 font-mono text-muted-foreground">/</span>
          <input
            id="regex-pattern"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className="min-w-0 flex-1 bg-transparent py-2 font-mono text-sm focus:outline-none"
            spellCheck={false}
            aria-label="Regex pattern"
            aria-invalid={!!regexError}
            aria-describedby={regexError ? "regex-error" : undefined}
          />
          <span className="select-none px-3 font-mono text-muted-foreground">/{flagStr}</span>
        </div>

        {regexError && (
          <p id="regex-error" className="text-xs text-destructive" role="alert">
            {regexError}
          </p>
        )}

        {/* Flags */}
        <div className="flex flex-wrap gap-4">
          {FLAG_LIST.map(({ flag, label, description }) => (
            <Checkbox
              key={flag}
              label={
                <span className="flex items-center gap-1.5">
                  <span className="font-mono font-semibold">{label}</span>
                  <span className="text-muted-foreground">{description}</span>
                </span>
              }
              checked={flags.has(flag)}
              onChange={() => toggleFlag(flag)}
            />
          ))}
        </div>
      </div>

      {/* Test string + highlighted output */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" htmlFor="test-string">
            Test string
          </label>
          <CodeEditor
            value={testString}
            onChange={setTestString}
            language="plain"
            placeholder="Paste test input here…"
            minHeight="180px"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">
              Matches
              {matches.length > 0 && (
                <span className="ml-2 rounded-full bg-brand/20 px-2 py-0.5 text-xs font-semibold text-brand">
                  {matches.length}
                </span>
              )}
            </span>
          </div>
          <div
            className="min-h-[180px] rounded-md border border-input bg-background p-3 font-mono text-sm whitespace-pre-wrap break-all"
            aria-label="Test string with matches highlighted"
          >
            {testString === "" ? (
              <span className="text-muted-foreground">Matches will appear here…</span>
            ) : (
              segments.map((seg, i) =>
                seg.matched ? (
                  <mark
                    key={i}
                    className="rounded bg-yellow-400/40 text-foreground dark:bg-yellow-500/30"
                  >
                    {seg.text}
                  </mark>
                ) : (
                  <span key={i}>{seg.text}</span>
                )
              )
            )}
          </div>
        </div>
      </div>

      {/* Token breakdown */}
      {tokens.length > 0 && !regexError && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Pattern breakdown</span>
          <div className="flex flex-wrap gap-2">
            {tokens.map((tok, i) => (
              <div
                key={i}
                title={tok.description}
                className={`flex flex-col items-center rounded-md border border-border px-2.5 py-1.5 ${TOKEN_COLORS[tok.type]}`}
              >
                <span className="font-mono text-sm font-semibold">{tok.raw}</span>
                <span className="mt-0.5 max-w-[160px] text-center text-[10px] leading-tight opacity-80">
                  {tok.description}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-1 flex flex-wrap gap-3">
            {(["anchor", "quantifier", "group", "class", "escape", "alternation", "literal", "dot"] as Token["type"][]).map(
              (type) => (
                <span key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={`inline-block h-2.5 w-2.5 rounded-sm ${TOKEN_COLORS[type]}`} aria-hidden />
                  {type}
                </span>
              )
            )}
          </div>
        </div>
      )}

      {/* Capture groups */}
      {groups.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Capture groups</span>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Match</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Group</th>
                  <th className="px-3 py-2 text-left font-medium text-muted-foreground">Value</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    <td className="px-3 py-1.5 text-muted-foreground">#{g.matchIndex}</td>
                    <td className="px-3 py-1.5 text-muted-foreground">Group {g.groupIndex}</td>
                    <td className="px-3 py-1.5 font-mono">{g.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Cheat sheet toggle */}
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setShowCheatSheet((v) => !v)}
          className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          aria-expanded={showCheatSheet}
        >
          <Info className="h-4 w-4" aria-hidden />
          {showCheatSheet ? "Hide" : "Show"} quick reference
        </button>

        {showCheatSheet && (
          <div className="rounded-md border border-border bg-card p-4">
            <div className="grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {CHEAT_SHEET.map((row) => (
                <div key={row.pattern} className="flex items-baseline gap-2 py-0.5">
                  <code className="min-w-[90px] font-mono text-xs font-semibold text-foreground">
                    {row.pattern}
                  </code>
                  <span className="text-xs text-muted-foreground">{row.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
