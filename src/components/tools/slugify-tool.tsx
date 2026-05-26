import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { CopyButton } from "@/components/tools/copy-button";

const VI_MAP: Record<string, string> = { đ: "d", Đ: "D" };

function slugify(input: string, sep: string, lower: boolean, strict: boolean): string {
  let s = input.normalize("NFKD").replace(/[̀-ͯ]/g, "");
  s = s.replace(/[đĐ]/g, (c) => VI_MAP[c]);
  if (lower) s = s.toLowerCase();
  s = strict ? s.replace(/[^a-zA-Z0-9]+/g, sep) : s.replace(/[\s_/.,]+/g, sep);
  s = s.replace(new RegExp(`${escapeRe(sep)}+`, "g"), sep);
  s = s.replace(new RegExp(`^${escapeRe(sep)}+|${escapeRe(sep)}+$`, "g"), "");
  return s;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export default function SlugifyTool() {
  const [input, setInput] = useState("");
  const [sep, setSep] = useState("-");
  const [lower, setLower] = useState(true);
  const [strict, setStrict] = useState(true);

  const lines = useMemo(() => input.split("\n"), [input]);
  const slugged = useMemo(
    () => lines.map((l) => slugify(l, sep, lower, strict)).join("\n"),
    [lines, sep, lower, strict],
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium" htmlFor="slug-sep">Separator</label>
          <Input
            id="slug-sep"
            value={sep}
            onChange={(e) => setSep(e.target.value || "-")}
            className="w-20 font-mono"
            maxLength={3}
          />
        </div>
        <Checkbox label="Lowercase" checked={lower} onChange={(e) => setLower(e.target.checked)} />
        <Checkbox label="Strict ASCII only" checked={strict} onChange={(e) => setStrict(e.target.checked)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Input</span>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Bài viết về JavaScript & TypeScript"
            className="min-h-[220px] lg:min-h-[280px]"
            spellCheck={false}
          />
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Slug</span>
            <CopyButton value={slugged} />
          </div>
          <Textarea
            value={slugged}
            readOnly
            className="min-h-[220px] font-mono text-sm lg:min-h-[280px]"
            spellCheck={false}
          />
        </div>
      </div>
    </div>
  );
}
