import { useEffect, useMemo, useState } from "react";
import CodeMirror, { type Extension } from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { sql } from "@codemirror/lang-sql";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { yaml } from "@codemirror/lang-yaml";
import { javascript } from "@codemirror/lang-javascript";
import { githubLight, githubDark } from "@uiw/codemirror-theme-github";

export type CodeLang =
  | "json"
  | "sql"
  | "css"
  | "html"
  | "yaml"
  | "javascript"
  | "typescript"
  | "plain";

interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language?: CodeLang;
  readOnly?: boolean;
  minHeight?: string;
  placeholder?: string;
  className?: string;
}

function getLangExtension(lang: CodeLang): Extension[] {
  switch (lang) {
    case "json": return [json()];
    case "sql": return [sql()];
    case "css": return [css()];
    case "html": return [html()];
    case "yaml": return [yaml()];
    case "javascript": return [javascript()];
    case "typescript": return [javascript({ typescript: true })];
    default: return [];
  }
}

export function CodeEditor({
  value,
  onChange,
  language = "plain",
  readOnly = false,
  minHeight = "280px",
  placeholder,
  className = "",
}: CodeEditorProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const el = document.documentElement;
    setIsDark(el.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(el.classList.contains("dark"));
    });
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const extensions = useMemo(() => getLangExtension(language), [language]);

  return (
    <div className={`overflow-hidden rounded-lg border border-input ${className}`}>
      <CodeMirror
        value={value}
        onChange={onChange}
        readOnly={readOnly}
        placeholder={placeholder}
        theme={isDark ? githubDark : githubLight}
        extensions={extensions}
        minHeight={minHeight}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: !readOnly,
          highlightSelectionMatches: true,
          autocompletion: !readOnly,
          bracketMatching: true,
          closeBrackets: !readOnly,
          indentOnInput: !readOnly,
        }}
        style={{
          fontSize: "0.8125rem",
          fontFamily: "var(--font-mono)",
        }}
      />
    </div>
  );
}
