import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";

const SAMPLE = `{"name":"toolnest","tools":["json","base64","timestamp"],"version":1}`;

type Status = { kind: "idle" } | { kind: "ok"; bytes: number } | { kind: "error"; message: string };

export default function JsonFormatterTool() {
  const [input, setInput] = useState("");
  const [indent, setIndent] = useState<"0" | "2" | "4">("2");

  const result = useMemo<{ output: string; status: Status }>(() => {
    if (!input.trim()) return { output: "", status: { kind: "idle" } };
    try {
      const parsed = JSON.parse(input);
      const n = Number(indent);
      const output = n === 0 ? JSON.stringify(parsed) : JSON.stringify(parsed, null, n);
      return { output, status: { kind: "ok", bytes: new Blob([output]).size } };
    } catch (err) {
      return {
        output: "",
        status: { kind: "error", message: err instanceof Error ? err.message : "Invalid JSON" },
      };
    }
  }, [input, indent]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Input</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setInput(SAMPLE)}>
              Sample
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
              Clear
            </Button>
          </div>
        </div>
        <CodeEditor
          value={input}
          onChange={setInput}
          language="json"
          placeholder="Paste JSON here…"
          minHeight="240px"
          className="lg:min-h-[440px]"
        />
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Output</span>
          <div className="flex items-center gap-2">
            <SegmentedControl
              size="sm"
              ariaLabel="Indentation"
              value={indent}
              onChange={(v) => setIndent(v as "0" | "2" | "4")}
              options={[
                { value: "0", label: "Min" },
                { value: "2", label: "2 sp" },
                { value: "4", label: "4 sp" },
              ]}
            />
            <CopyButton value={result.output} />
          </div>
        </div>
        <CodeEditor
          value={result.output}
          language="json"
          readOnly
          placeholder="Formatted output appears here…"
          minHeight="240px"
          className="lg:min-h-[440px]"
        />
        <div className="min-h-[1.25rem] text-xs">
          {result.status.kind === "ok" && (
            <span className="text-muted-foreground">Valid JSON · {result.status.bytes} bytes</span>
          )}
          {result.status.kind === "error" && (
            <span className="text-destructive">{result.status.message}</span>
          )}
        </div>
      </div>
    </div>
  );
}
