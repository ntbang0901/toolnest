import { useCallback, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import MermaidView from "@/components/tools/mermaid-view";

type Sample = "flowchart" | "sequence" | "class" | "er" | "gantt" | "state" | "pie" | "mindmap";

const SAMPLES: Record<Sample, string> = {
  flowchart: `flowchart LR
  A[User] -->|opens app| B(Toolnest)
  B --> C{Pick a tool}
  C -->|JSON| D[Format]
  C -->|QR| E[Generate]
  C -->|Hash| F[Compute]`,
  sequence: `sequenceDiagram
  participant U as User
  participant T as Toolnest
  participant B as Browser
  U->>T: Type input
  T->>B: Compute locally
  B-->>T: Result
  T-->>U: Show output`,
  class: `classDiagram
  class Tool {
    +String slug
    +String name
    +run()
  }
  class TextTool {
    +String input
    +format()
  }
  class CryptoTool {
    +hash()
  }
  Tool <|-- TextTool
  Tool <|-- CryptoTool`,
  er: `erDiagram
  USER ||--o{ POST : writes
  USER ||--o{ COMMENT : authors
  POST ||--o{ COMMENT : has
  USER {
    int id PK
    string email
    string name
  }
  POST {
    int id PK
    int user_id FK
    string title
    text body
  }`,
  gantt: `gantt
  title Toolnest roadmap
  dateFormat YYYY-MM-DD
  section Core
  Foundation     :done, 2026-01-01, 30d
  24 tools       :done, 2026-02-01, 30d
  section Polish
  UI DNA pass    :active, 2026-05-01, 14d
  Mermaid + DB   :2026-05-15, 7d`,
  state: `stateDiagram-v2
  [*] --> Idle
  Idle --> Loading: input
  Loading --> Done: success
  Loading --> Error: failure
  Error --> Idle: retry
  Done --> [*]`,
  pie: `pie title Tool categories
  "Text" : 8
  "Converter" : 12
  "Encoder" : 5
  "Generator" : 5
  "Other" : 12`,
  mindmap: `mindmap
  root((Toolnest))
    Text
      Case
      Slugify
      Diff
    Converter
      JSON
      YAML
      CSV
    Crypto
      Hash
      TOTP`,
};

export default function MermaidTool() {
  const [source, setSource] = useState(SAMPLES.flowchart);
  const [svg, setSvg] = useState("");

  const loadSample = (s: Sample) => setSource(SAMPLES[s]);

  const downloadSvg = useCallback(() => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "diagram.svg";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [svg]);

  const downloadPng = useCallback(async () => {
    if (!svg) return;
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = document.documentElement.classList.contains("dark") ? "#0a0a0a" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        if (!b) return;
        const u = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = u;
        a.download = "diagram.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(u);
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [svg]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          size="sm"
          ariaLabel="Sample"
          value=""
          onChange={(v) => v && loadSample(v as Sample)}
          options={[
            { value: "flowchart", label: "Flowchart" },
            { value: "sequence", label: "Sequence" },
            { value: "class", label: "Class" },
            { value: "er", label: "ER" },
            { value: "gantt", label: "Gantt" },
            { value: "state", label: "State" },
            { value: "pie", label: "Pie" },
            { value: "mindmap", label: "Mindmap" },
          ]}
        />
        <Button variant="ghost" size="sm" onClick={() => setSource("")} disabled={!source}>
          Clear
        </Button>
        <Button variant="outline" size="sm" onClick={downloadSvg} disabled={!svg} className="ml-auto">
          <Download className="h-4 w-4" /> SVG
        </Button>
        <Button variant="outline" size="sm" onClick={downloadPng} disabled={!svg}>
          <Download className="h-4 w-4" /> PNG
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Source</span>
            <CopyButton value={source} />
          </div>
          <CodeEditor
            value={source}
            onChange={setSource}
            language="plain"
            placeholder="flowchart LR..."
            minHeight="280px"
            className="lg:min-h-[460px]"
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Preview</span>
          <div className="min-h-[280px] rounded-md border border-border bg-card p-3 lg:min-h-[460px]">
            <MermaidView source={source} onSvg={setSvg} className="h-full w-full" />
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Reference: <a href="https://mermaid.js.org/intro/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">mermaid.js.org</a>. Rendered locally; no upload.
      </p>
    </div>
  );
}
