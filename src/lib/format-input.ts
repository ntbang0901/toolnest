import yaml from "js-yaml";
import { XMLParser, XMLBuilder } from "fast-xml-parser";

export type FormatLang = "json" | "yaml" | "xml";

export interface FormatResult {
  ok: boolean;
  value: string;
  error?: string;
}

/**
 * Re-indent / pretty-print editable source text in place. Used by the "Format"
 * action on language tools (JSON, YAML, XML) so users can tidy messy input
 * without leaving the editor. On parse failure the original text is returned
 * unchanged with an error message.
 */
export function formatInput(value: string, lang: FormatLang, indent = 2): FormatResult {
  if (!value.trim()) return { ok: true, value };
  try {
    switch (lang) {
      case "json": {
        return { ok: true, value: JSON.stringify(JSON.parse(value), null, indent) };
      }
      case "yaml": {
        const parsed = yaml.load(value);
        return { ok: true, value: yaml.dump(parsed, { indent, lineWidth: 120, noRefs: true }) };
      }
      case "xml": {
        const parser = new XMLParser({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          preserveOrder: true,
        });
        const builder = new XMLBuilder({
          ignoreAttributes: false,
          attributeNamePrefix: "@_",
          preserveOrder: true,
          format: true,
          indentBy: " ".repeat(indent),
        });
        return { ok: true, value: builder.build(parser.parse(value)).trimEnd() };
      }
    }
  } catch (err) {
    return {
      ok: false,
      value,
      error: err instanceof Error ? err.message : `Invalid ${lang.toUpperCase()}`,
    };
  }
}
