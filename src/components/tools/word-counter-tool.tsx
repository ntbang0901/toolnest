import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const WPM = 200;

function countGraphemes(input: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const seg = new (Intl as unknown as { Segmenter: typeof Intl.Segmenter }).Segmenter("en", { granularity: "grapheme" });
    let n = 0;
    for (const _ of seg.segment(input)) n++;
    return n;
  }
  return [...input].length;
}

function countWords(input: string): number {
  return input.trim() ? input.trim().split(/\s+/).length : 0;
}

function countSentences(input: string): number {
  const m = input.match(/[^.!?]+[.!?]+/g);
  return m ? m.length : input.trim() ? 1 : 0;
}

function countParagraphs(input: string): number {
  return input.trim() ? input.trim().split(/\n{2,}/).length : 0;
}

function readingTime(words: number): string {
  if (!words) return "0 min";
  const min = words / WPM;
  if (min < 1) return `${Math.max(1, Math.round(min * 60))} sec`;
  return `${Math.round(min)} min`;
}

export default function WordCounterTool() {
  const [input, setInput] = useState("");

  const stats = useMemo(() => {
    const words = countWords(input);
    return {
      chars: input.length,
      graphemes: countGraphemes(input),
      charsNoSpace: input.replace(/\s+/g, "").length,
      words,
      sentences: countSentences(input),
      paragraphs: countParagraphs(input),
      lines: input ? input.split("\n").length : 0,
      reading: readingTime(words),
    };
  }, [input]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Text</span>
        <Button variant="ghost" size="sm" onClick={() => setInput("")} disabled={!input}>
          Clear
        </Button>
      </div>
      <Textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type or paste text…"
        className="min-h-[220px] lg:min-h-[300px]"
        spellCheck={false}
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Words" value={stats.words.toLocaleString()} />
        <Stat label="Characters" value={stats.chars.toLocaleString()} />
        <Stat label="Chars (no spaces)" value={stats.charsNoSpace.toLocaleString()} />
        <Stat label="Graphemes" value={stats.graphemes.toLocaleString()} />
        <Stat label="Sentences" value={stats.sentences.toLocaleString()} />
        <Stat label="Paragraphs" value={stats.paragraphs.toLocaleString()} />
        <Stat label="Lines" value={stats.lines.toLocaleString()} />
        <Stat label={`Reading (${WPM} wpm)`} value={stats.reading} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border bg-card p-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-mono text-lg">{value}</span>
    </div>
  );
}
