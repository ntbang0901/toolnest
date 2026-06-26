import { useState, useCallback, useEffect } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CodeEditor } from "@/components/tools/code-editor";
import { CopyButton } from "@/components/tools/copy-button";

const CUID2_CHARS = "abcdefghijklmnopqrstuvwxyz0123456789";

function randomChar(): string {
  const arr = new Uint8Array(1);
  while (true) {
    crypto.getRandomValues(arr);
    const idx = arr[0] & 63;
    if (idx < CUID2_CHARS.length) return CUID2_CHARS[idx];
  }
}

function generateCuid2(): string {
  // CUID2: starts with letter, ~24 chars, lowercase alphanumeric
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const firstChar = letters[Math.floor(Math.random() * letters.length)];
  const ts = Date.now().toString(36);
  const randomPart = Array.from({ length: 24 - 1 - ts.length }, randomChar).join("");
  return (firstChar + ts + randomPart).slice(0, 24);
}

export default function CuidGeneratorTool() {
  const [count, setCount] = useState(10);
  const [ids, setIds] = useState<string[]>([]);
  const [genTimeMs, setGenTimeMs] = useState<number>(0);

  const safeCount = Math.max(1, Math.min(100, Math.floor(Number(count)) || 1));

  const generate = useCallback(() => {
    const start = performance.now();
    const newIds = Array.from({ length: safeCount }, generateCuid2);
    setGenTimeMs(performance.now() - start);
    setIds(newIds);
  }, [safeCount]);

  useEffect(() => {
    generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const output = ids.join("\n");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="cuid-count">
            Count
          </label>
          <Input
            id="cuid-count"
            type="number"
            min={1}
            max={100}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-24 font-mono"
          />
        </div>
        <Button onClick={generate} className="ml-auto">
          <RefreshCw className="h-4 w-4" />
          Generate
        </Button>
      </div>

      <div className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground space-y-1">
        <p>
          <span className="font-medium text-foreground">CUID2</span> — 24 characters, lowercase alphanumeric, starts with a letter.
        </p>
        <p>
          Collision-resistant, monotonically increasing, URL-safe. Generated in{" "}
          <span className="font-mono text-foreground">{genTimeMs.toFixed(2)}ms</span>.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Generated IDs</span>
          <CopyButton value={output} label="Copy all" />
        </div>
        <CodeEditor
          value={output}
          readOnly
          language="plain"
          minHeight="300px"
        />
      </div>
    </div>
  );
}
