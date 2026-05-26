import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/tools/copy-button";

const WORDS = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing", "elit", "sed", "do",
  "eiusmod", "tempor", "incididunt", "ut", "labore", "et", "dolore", "magna", "aliqua", "enim",
  "ad", "minim", "veniam", "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi",
  "aliquip", "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "in", "reprehenderit",
  "voluptate", "velit", "esse", "cillum", "fugiat", "nulla", "pariatur", "excepteur", "sint",
  "occaecat", "cupidatat", "non", "proident", "sunt", "culpa", "qui", "officia", "deserunt",
  "mollit", "anim", "id", "est", "laborum", "at", "vero", "eos", "accusamus", "iusto", "odio",
  "dignissimos", "ducimus", "blanditiis", "praesentium", "voluptatum", "deleniti", "atque",
  "corrupti", "quos", "dolores", "quas", "molestias", "excepturi", "obcaecati", "cupiditate",
];

type Mode = "paragraphs" | "sentences" | "words";

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(): string {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

function makeSentence(): string {
  const len = rand(6, 14);
  const words = Array.from({ length: len }, pick);
  words[0] = words[0][0].toUpperCase() + words[0].slice(1);
  return words.join(" ") + ".";
}

function makeParagraph(): string {
  const n = rand(3, 6);
  return Array.from({ length: n }, makeSentence).join(" ");
}

function generate(mode: Mode, count: number, startStandard: boolean): string {
  const safeCount = Math.max(1, Math.min(500, Math.floor(count) || 1));
  if (mode === "paragraphs") {
    const out = Array.from({ length: safeCount }, makeParagraph);
    if (startStandard) out[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. " + out[0];
    return out.join("\n\n");
  }
  if (mode === "sentences") {
    const out = Array.from({ length: safeCount }, makeSentence);
    if (startStandard) out[0] = "Lorem ipsum dolor sit amet, consectetur adipiscing elit.";
    return out.join(" ");
  }
  const words = Array.from({ length: safeCount }, pick);
  if (startStandard) {
    const intro = "lorem ipsum dolor sit amet".split(" ");
    for (let i = 0; i < Math.min(intro.length, words.length); i++) words[i] = intro[i];
  }
  words[0] = words[0][0].toUpperCase() + words[0].slice(1);
  return words.join(" ") + ".";
}

export default function LoremIpsumTool() {
  const [mode, setMode] = useState<Mode>("paragraphs");
  const [count, setCount] = useState(3);
  const [startStandard, setStartStandard] = useState(true);
  const [seed, setSeed] = useState(0);

  const output = useMemo(
    () => generate(mode, count, startStandard),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mode, count, startStandard, seed],
  );

  const stats = useMemo(() => {
    const words = output.trim().split(/\s+/).filter(Boolean).length;
    const chars = output.length;
    return { words, chars };
  }, [output]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Type</span>
          <SegmentedControl
            ariaLabel="Type"
            value={mode}
            onChange={(v) => setMode(v as Mode)}
            options={[
              { value: "paragraphs", label: "Paragraphs" },
              { value: "sentences", label: "Sentences" },
              { value: "words", label: "Words" },
            ]}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="lorem-count">Count</label>
          <Input
            id="lorem-count"
            type="number"
            min={1}
            max={500}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-28 font-mono"
          />
        </div>

        <Checkbox
          label='Start with "Lorem ipsum…"'
          checked={startStandard}
          onChange={(e) => setStartStandard(e.target.checked)}
        />

        <Button onClick={() => setSeed((s) => s + 1)} className="ml-auto">
          Regenerate
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {stats.words} words · {stats.chars} chars
          </span>
          <CopyButton value={output} label="Copy" />
        </div>
        <Textarea value={output} readOnly className="min-h-[280px] lg:min-h-[400px]" spellCheck={false} />
      </div>
    </div>
  );
}
