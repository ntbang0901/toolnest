import type { CodeLang } from "@/components/tools/code-editor";

/**
 * Shared language list for paste tools (server-backed Paste & Share and the
 * local URL Paste). The order is significant: the URL Paste codec stores a
 * language as its index into this array, so new entries must be appended to
 * the end to keep existing links decodable.
 */
export const LANGUAGES: { value: CodeLang; label: string }[] = [
  { value: "plain", label: "Plain Text" },
  { value: "markdown", label: "Markdown" },
  { value: "json", label: "JSON" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "sql", label: "SQL" },
  { value: "yaml", label: "YAML" },
];

export const LANGUAGE_LABELS: Record<string, string> = Object.fromEntries(
  LANGUAGES.map((l) => [l.value, l.label])
);

/** Map a language value to its stable index (langCode) in the envelope header. */
export function langToCode(language: CodeLang): number {
  const idx = LANGUAGES.findIndex((l) => l.value === language);
  return idx === -1 ? 0 : idx;
}

/** Map a stored langCode back to a language value; falls back to "plain". */
export function codeToLang(code: number): CodeLang {
  return LANGUAGES[code]?.value ?? "plain";
}
