import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import { encodeHTML, encodeXML, escapeUTF8, decodeHTML, decodeXML } from "entities";

type Mode = "encode" | "decode";
type EncodeMode = "html-all" | "html-minimal" | "xml" | "utf8-safe";

export default function HtmlEntitiesTool() {
  const [mode, setMode] = useState<Mode>("encode");
  const [encodeMode, setEncodeMode] = useState<EncodeMode>("html-minimal");
  const [input, setInput] = useState("");

  const output = useMemo(() => {
    if (!input) return "";
    if (mode === "encode") {
      switch (encodeMode) {
        case "html-all":     return encodeHTML(input);
        case "html-minimal": return escapeUTF8(input);
        case "xml":          return encodeXML(input);
        case "utf8-safe":    return escapeUTF8(input);
      }
    } else {
      try {
        return decodeHTML(input);
      } catch {
        try { return decodeXML(input); } catch { return input; }
      }
    }
  }, [input, mode, encodeMode]);

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
          <SegmentedControl
            size="sm"
            ariaLabel="Encode mode"
            value={encodeMode}
            onChange={(v) => setEncodeMode(v as EncodeMode)}
            options={[
              { value: "html-minimal", label: "Minimal" },
              { value: "html-all",     label: "All named" },
              { value: "xml",          label: "XML" },
            ]}
          />
        )}
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
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
            placeholder={mode === "encode" ? "<div>Hello & welcome © 2024</div>" : "&lt;div&gt;Hello &amp; welcome &copy; 2024&lt;/div&gt;"}
            minHeight="200px"
            className="lg:min-h-[300px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Output</span>
            <CopyButton value={output ?? ""} />
          </div>
          <CodeEditor
            value={output ?? ""}
            language="html"
            readOnly
            minHeight="200px"
            className="lg:min-h-[300px]"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Minimal: escapes only <code>&amp; &lt; &gt; &quot; &apos;</code> —
        All named: uses full HTML5 named entities (e.g. <code>&amp;uuml;</code>) —
        XML: numeric references for non-ASCII.
        Decode handles both named and numeric HTML/XML entities.
      </p>
    </div>
  );
}
