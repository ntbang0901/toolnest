import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Eye, EyeOff, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/tools/copy-button";
import { CodeEditor } from "@/components/tools/code-editor";
import { exportImage } from "@/components/tools/diagram/lib/export";
import { transpile } from "./diagram-dsl/transpiler";
import { FlowCanvas } from "./diagram-dsl/flow/flow-canvas";
import { samples } from "./diagram-dsl/samples";

const STORAGE_KEY = "diagram-dsl-source";
const sampleOptions = samples.map((s) => ({ value: s.type, label: s.label }));

export default function DiagramDslTool() {
  const [source, setSource] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY) || samples[0].code;
    }
    return samples[0].code;
  });
  const [showCode, setShowCode] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const canvasRef = useRef<HTMLDivElement>(null);

  // Debounced source
  const [debouncedSource, setDebouncedSource] = useState(source);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSource(source), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [source]);

  // Persist
  useEffect(() => { localStorage.setItem(STORAGE_KEY, source); }, [source]);

  // Transpile
  const result = useMemo(() => transpile(debouncedSource), [debouncedSource]);

  // Dark mode
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
    const obs = new MutationObserver(() => setDark(document.documentElement.classList.contains("dark")));
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  // Determine render mode
  const graph = result.ok && "graph" in result ? result.graph : null;
  const directSvg = result.ok && "svg" in result ? result.svg : null;
  const transpileError = !result.ok ? result : null;

  // SVG string is available only for chart diagrams (sequence/gantt/pie),
  // which the transpiler emits directly as SVG. Graph diagrams render and
  // export through React Flow instead.
  const exportSvg = directSvg ?? "";

  const hasDiagram = Boolean(graph || directSvg);

  const loadSample = (type: string) => {
    const sample = samples.find((s) => s.type === type);
    if (sample) setSource(sample.code);
  };

  // PNG/SVG export of the React Flow viewport (graph diagrams) or the SVG
  // string (chart diagrams).
  const downloadSvg = useCallback(async () => {
    if (graph && canvasRef.current) {
      await exportImage(canvasRef.current, "svg");
      return;
    }
    if (!exportSvg) return;
    const blob = new Blob([exportSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "diagram.svg";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }, [graph, exportSvg]);

  const downloadPng = useCallback(async () => {
    if (graph && canvasRef.current) {
      await exportImage(canvasRef.current, "png");
      return;
    }
    if (!exportSvg) return;
    const blob = new Blob([exportSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement("canvas");
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = dark ? "#0a0a0a" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        if (!b) return;
        const u = URL.createObjectURL(b);
        const a = document.createElement("a");
        a.href = u; a.download = "diagram.png";
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(u);
      }, "image/png");
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }, [graph, exportSvg, dark]);

  const downloadJson = useCallback(() => {
    if (!graph) return;
    const payload = {
      version: 1,
      kind: "toolnest-diagram-dsl",
      type: graph.type,
      direction: graph.direction,
      nodes: graph.nodes,
      edges: graph.edges,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "diagram.json";
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }, [graph]);

  const errorDisplay = transpileError
    ? `Line ${transpileError.line ?? "?"}: ${transpileError.error}`
    : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Top toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value=""
          onChange={(e) => { if (e.target.value) loadSample(e.target.value); }}
          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
          aria-label="Load sample"
        >
          <option value="">Load sample…</option>
          {sampleOptions.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <Button variant="ghost" size="sm" onClick={() => setSource("")} disabled={!source}>
          Clear
        </Button>
        <div className="ml-auto flex items-center gap-1.5">
          <Button variant="ghost" size="sm" onClick={() => setShowCode(!showCode)} title="Show SVG code">
            {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setFullscreen(!fullscreen)} title="Toggle fullscreen canvas">
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <div className="mx-1 h-4 w-px bg-border" />
          <Button variant="outline" size="sm" onClick={downloadSvg} disabled={!hasDiagram}>
            <Download className="h-4 w-4" /> SVG
          </Button>
          <Button variant="outline" size="sm" onClick={downloadPng} disabled={!hasDiagram}>
            <Download className="h-4 w-4" /> PNG
          </Button>
          <Button variant="outline" size="sm" onClick={downloadJson} disabled={!graph}>
            <Download className="h-4 w-4" /> JSON
          </Button>
        </div>
      </div>

      {/* Split view */}
      <div className={`grid gap-3 ${fullscreen ? "" : "lg:grid-cols-[1fr_1.4fr]"}`}>
        {/* Editor panel */}
        {!fullscreen && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Code</span>
              <CopyButton value={source} />
            </div>
            <CodeEditor
              value={source}
              onChange={setSource}
              language="plain"
              placeholder="flowchart&#10;&#10;A [Start] -> B [Process] -> C {Decision}"
              minHeight="200px"
              className="lg:min-h-[540px]"
            />
            {errorDisplay && (
              <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive">
                {errorDisplay}
              </div>
            )}
          </div>
        )}

        {/* Canvas panel */}
        <div className="flex flex-col gap-2">
          {!fullscreen && (
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Preview</span>
          )}
          <div
            ref={canvasRef}
            className={`rounded-lg border border-border overflow-hidden ${fullscreen ? "min-h-[600px]" : "min-h-[300px] lg:min-h-[540px]"}`}
          >
            {graph ? (
              <FlowCanvas graph={graph} dark={dark} />
            ) : directSvg ? (
              <div
                className="flex items-center justify-center p-4 h-full"
                style={{ background: dark ? "#0F172A" : "#F8FAFC" }}
                dangerouslySetInnerHTML={{ __html: directSvg }}
              />
            ) : (
              !transpileError && (
                <div className="flex items-center justify-center h-full text-sm text-muted-foreground" style={{ background: dark ? "#0F172A" : "#F8FAFC" }}>
                  Start typing to see preview
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Generated SVG code */}
      {showCode && exportSvg && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Generated SVG</span>
            <CopyButton value={exportSvg} />
          </div>
          <CodeEditor value={exportSvg} language="plain" minHeight="100px" readOnly />
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Diagram-as-code — type a simple DSL, get a clean diagram. Drag nodes to rearrange. Scroll to pan, Ctrl+scroll to zoom.
      </p>
    </div>
  );
}
