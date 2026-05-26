import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import { Download } from "lucide-react";
import { GENERATORS, type GenTarget, generate } from "../codegen";
import type { SchemaModel } from "../schema-model";

interface Props {
  model: SchemaModel | null;
  parseError: string | null;
}

const GROUP_ORDER: Array<"ORM" | "Schema" | "Diagram"> = ["ORM", "Schema", "Diagram"];

export function GenerateView({ model, parseError }: Props) {
  const [target, setTarget] = useState<GenTarget>("prisma");

  const code = useMemo(() => {
    if (!model) return parseError ?? "";
    return generate(target, model);
  }, [model, target, parseError]);

  const filename = useMemo(() => {
    const t = GENERATORS.find((g) => g.id === target);
    if (!t) return "schema.txt";
    const ext = ({
      typescript: "ts",
      python: "py",
      prisma: "prisma",
      json: "json",
      graphql: "graphql",
      mermaid: "mmd",
      dot: "dot",
      plantuml: "puml",
    } as Record<string, string>)[t.language] ?? "txt";
    return `schema.${target}.${ext}`;
  }, [target]);

  function download() {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {GROUP_ORDER.map((group) => {
          const items = GENERATORS.filter((g) => g.group === group);
          return (
            <div key={group} className="flex flex-col gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{group}</span>
              <SegmentedControl
                ariaLabel={`${group} target`}
                size="sm"
                value={items.some((i) => i.id === target) ? target : items[0].id}
                onChange={(v) => setTarget(v as GenTarget)}
                options={items.map((i) => ({ value: i.id, label: i.label }))}
              />
            </div>
          );
        })}
        <div className="ml-auto flex items-end gap-2">
          <Button variant="outline" size="sm" onClick={download} disabled={!code}>
            <Download className="h-4 w-4" /> Download
          </Button>
          <CopyButton value={code} />
        </div>
      </div>
      <CodeEditor
        value={code}
        language="typescript"
        readOnly
        minHeight="480px"
        className="lg:min-h-[640px]"
      />
      <p className="text-xs text-muted-foreground">
        Output is generated client-side. Adjust types or imports for your specific stack as needed.
      </p>
    </div>
  );
}
