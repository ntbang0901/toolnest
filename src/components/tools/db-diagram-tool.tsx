import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Download,
  Keyboard,
  Maximize2,
  Minimize2,
  PanelRightClose,
  PanelRightOpen,
  RefreshCw,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { CopyButton } from "@/components/tools/copy-button";
import { type DbTableData } from "@/components/tools/db-diagram/table-node";
import { type CrowFootEdgeData } from "@/components/tools/db-diagram/crow-foot-edge";
import { layoutTables } from "@/components/tools/db-diagram/layout";
import { parseDbml, type ParseResult } from "@/components/tools/db-diagram/parse";
import { buildSchemaModel, type SchemaModel } from "@/components/tools/db-diagram/schema-model";
import { useDeferredAsync } from "@/components/tools/db-diagram/use-deferred-async";
import { lintSchema } from "@/components/tools/db-diagram/lint/lint";
import {
  applyLayout,
  clearLayout,
  loadLayout,
  loadSidebarOpen,
  saveLayout,
  saveSidebarOpen,
} from "@/components/tools/db-diagram/persist";
import { SAMPLES } from "@/components/tools/db-diagram/samples";
import {
  deleteTableBlock,
  getTableBlockText,
  setTableHeaderColor,
} from "@/components/tools/db-diagram/dbml-edit";
import { DiagramCanvas } from "@/components/tools/db-diagram/views/diagram-canvas";
import { GenerateView } from "@/components/tools/db-diagram/views/generate-view";
import { MockView } from "@/components/tools/db-diagram/views/mock-view";
import { DiffView } from "@/components/tools/db-diagram/views/diff-view";
import { LintPanel } from "@/components/tools/db-diagram/views/lint-panel";
import { TableListSidebar } from "@/components/tools/db-diagram/views/table-list-sidebar";
import {
  TableContextMenu,
  type ContextMenuState,
} from "@/components/tools/db-diagram/views/table-context-menu";

type ExportFmt = "postgres" | "mysql" | "mssql" | "json";
type ImportFmt = "postgres" | "mysql" | "mssql";
type ViewMode = "diagram" | "generate" | "mock" | "diff" | "import" | "export";

const DEFAULT_DBML = SAMPLES[0].dbml;
const SHORTCUTS: Array<[string, string]> = [
  ["F", "Fit view"],
  ["R", "Re-layout"],
  ["1", "Zoom 100%"],
  ["0", "Fit"],
  ["Esc", "Clear selection / search"],
  ["⌘/Ctrl + F", "Focus diagram search"],
  ["Shift + drag", "Box select"],
  ["Shift + click", "Toggle selection"],
];

export default function DbDiagramTool() {
  return (
    <ReactFlowProvider>
      <DbDiagramInner />
    </ReactFlowProvider>
  );
}

function DbDiagramInner() {
  const [dbml, setDbml] = useState(DEFAULT_DBML);
  const [view, setView] = useState<ViewMode>("diagram");
  const [exportFmt, setExportFmt] = useState<ExportFmt>("postgres");
  const [importFmt, setImportFmt] = useState<ImportFmt>("postgres");
  const [importSql, setImportSql] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const [focusTable, setFocusTable] = useState<string | null>(null);
  const [centerTable, setCenterTable] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => loadSidebarOpen() ?? true);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const flowRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { fitView, setCenter, getNode } = useReactFlow();

  const parsed = useDeferredAsync<ParseResult>(
    () => parseDbml(dbml),
    [dbml],
    { ok: true, data: { nodes: [], edges: [], tableCount: 0, fieldCount: 0, refCount: 0, tableLines: {} } },
  );
  const modelResult = useDeferredAsync<{ ok: true; model: SchemaModel } | { ok: false; error: string }>(
    () => buildSchemaModel(dbml),
    [dbml],
    { ok: true, model: { tables: [], refs: [], enums: [], tableCount: 0, fieldCount: 0, refCount: 0 } },
  );
  const model = modelResult.ok ? modelResult.model : null;
  const lintIssues = useMemo(() => (model ? lintSchema(model) : []), [model]);

  useEffect(() => {
    saveSidebarOpen(sidebarOpen);
  }, [sidebarOpen]);

  const computed = useMemo<{
    nodes: Node<DbTableData>[];
    edges: Edge<CrowFootEdgeData>[];
  }>(() => {
    if (!parsed.ok) return { nodes: [], edges: [] };
    const laid = layoutTables(parsed.data.nodes, parsed.data.edges);
    const stored = loadLayout(dbml);
    const nodes = stored ? applyLayout(laid, stored) : laid;
    return { nodes, edges: parsed.data.edges };
  }, [parsed, dbml]);

  const [internalNodes, setInternalNodes] = useState(computed.nodes);
  const [internalEdges, setInternalEdges] = useState(computed.edges);
  const [selectedTableId, setSelectedTableId] = useState<string | null>(null);

  useEffect(() => {
    setInternalNodes(computed.nodes);
    setInternalEdges(computed.edges);
  }, [computed.nodes, computed.edges]);

  // Center on a requested node once we have its measured size.
  useEffect(() => {
    if (!centerTable) return;
    const node = getNode(centerTable);
    if (!node) return;
    const w = node.measured?.width ?? 240;
    const h = node.measured?.height ?? 120;
    setCenter(node.position.x + w / 2, node.position.y + h / 2, { zoom: 1.1, duration: 350 });
    setCenterTable(null);
  }, [centerTable, getNode, setCenter, internalNodes]);

  const [exported, setExported] = useState("");
  useEffect(() => {
    if (!dbml.trim()) {
      setExported("");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { exporter } = await import("@dbml/core");
        const out = exporter.export(dbml, exportFmt);
        if (!cancelled) setExported(out);
      } catch (err) {
        if (!cancelled) setExported(err instanceof Error ? err.message : "Failed to export");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dbml, exportFmt]);

  const handleImport = async () => {
    if (!importSql.trim()) return;
    try {
      const { importer } = await import("@dbml/core");
      const out = importer.import(importSql, importFmt);
      setDbml(out);
      setView("diagram");
    } catch (err) {
      alert(`Import failed: ${err instanceof Error ? err.message : "unknown error"}`);
    }
  };

  const downloadImage = useCallback(async (kind: "png" | "svg") => {
    const flow = flowRef.current?.querySelector(".react-flow") as HTMLElement | null;
    if (!flow) return;
    const opts = {
      backgroundColor: document.documentElement.classList.contains("dark") ? "#0a0a0a" : "#ffffff",
      pixelRatio: 2,
      cacheBust: true,
      filter: (node: HTMLElement) => {
        if (!node.classList) return true;
        if (node.classList.contains("react-flow__minimap")) return false;
        if (node.classList.contains("react-flow__controls")) return false;
        if (node.classList.contains("react-flow__panel")) return false;
        return true;
      },
    };
    try {
      const { toPng, toSvg } = await import("html-to-image");
      const dataUrl = kind === "png" ? await toPng(flow, opts) : await toSvg(flow, opts);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `schema.${kind}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      alert(`Export failed: ${err instanceof Error ? err.message : "unknown"}`);
    }
  }, []);

  const relayout = () => {
    if (!parsed.ok) return;
    const laid = layoutTables(parsed.data.nodes, parsed.data.edges);
    setInternalNodes(laid);
    clearLayout(dbml);
    setTimeout(() => fitView({ padding: 0.2, duration: 250 }), 50);
  };

  const recenter = () => {
    fitView({ padding: 0.2, duration: 250 });
  };

  // ---------- Sidebar / context-menu actions ----------

  const tableById = useCallback(
    (id: string) => {
      const n = internalNodes.find((x) => x.id === id);
      return n ? { name: n.data.name, schema: n.data.schema } : null;
    },
    [internalNodes],
  );

  const focusOnTable = useCallback((tableId: string) => {
    setSelectedTableId(tableId);
    setFocusTable(tableId);
    setCenterTable(tableId);
  }, []);

  const jumpToEditor = useCallback(
    (_tableId: string) => {
      // scroll-to-line not available without textarea ref; no-op
    },
    [],
  );

  const copyTableBlock = useCallback(
    async (tableId: string) => {
      const t = tableById(tableId);
      if (!t) return;
      const block = getTableBlockText(dbml, t.name, t.schema);
      if (!block) return;
      try {
        await navigator.clipboard.writeText(block);
      } catch {
        /* ignore */
      }
    },
    [dbml, tableById],
  );

  const updateHeaderColor = useCallback(
    (tableId: string, color: string | null) => {
      const t = tableById(tableId);
      if (!t) return;
      setDbml(setTableHeaderColor(dbml, t.name, t.schema, color));
    },
    [dbml, tableById],
  );

  const deleteTable = useCallback(
    (tableId: string) => {
      const t = tableById(tableId);
      if (!t) return;
      if (!confirm(`Delete table "${t.name}"? This rewrites the DBML.`)) return;
      setDbml(deleteTableBlock(dbml, t.name, t.schema));
    },
    [dbml, tableById],
  );

  return (
    <div className="flex flex-col gap-4">
      <Toolbar
        view={view}
        setView={setView}
        dbml={dbml}
        setDbml={setDbml}
        stats={parsed.ok ? { tables: parsed.data.tableCount, fields: parsed.data.fieldCount, refs: parsed.data.refCount } : null}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        shortcutsOpen={shortcutsOpen}
        setShortcutsOpen={setShortcutsOpen}
      />

      {view === "diagram" && (
        <div
          className={
            sidebarOpen
              ? "grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.55fr)_220px]"
              : "grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]"
          }
        >
          <EditorPanel
            dbml={dbml}
            setDbml={setDbml}
            parseError={parsed.ok ? null : parsed.error}
            lintIssues={lintIssues}
            onJump={(t) => setFocusTable(t)}
          />
          <DiagramPanel
            flowRef={flowRef}
            nodes={internalNodes}
            edges={internalEdges}
            onNodesChange={setInternalNodes}
            onEdgesChange={setInternalEdges}
            onPositionPersist={(nodes) => saveLayout(dbml, nodes)}
            relayout={relayout}
            recenter={recenter}
            downloadImage={downloadImage}
            fullscreen={fullscreen}
            setFullscreen={setFullscreen}
            parseOk={parsed.ok}
            focusTable={focusTable}
            onFocusHandled={() => setFocusTable(null)}
            onTableContextMenu={setContextMenu}
            searchRef={searchRef}
          />
          {sidebarOpen && (
            <aside className="h-[480px] overflow-hidden rounded-md border border-border bg-card lg:h-[640px]">
              <TableListSidebar
                nodes={internalNodes}
                selectedTableId={selectedTableId}
                onSelectTable={focusOnTable}
                onJumpToEditor={jumpToEditor}
              />
            </aside>
          )}
        </div>
      )}

      {view === "generate" && <GenerateView model={model} parseError={parsed.ok ? null : parsed.error} />}
      {view === "mock" && <MockView model={model} />}
      {view === "diff" && <DiffView current={dbml} />}

      {view === "import" && (
        <ImportPanel
          importSql={importSql}
          setImportSql={setImportSql}
          importFmt={importFmt}
          setImportFmt={setImportFmt}
          dbml={dbml}
          handleImport={handleImport}
        />
      )}

      {view === "export" && (
        <ExportPanel
          dbml={dbml}
          setDbml={setDbml}
          exportFmt={exportFmt}
          setExportFmt={setExportFmt}
          exported={exported}
          parseError={parsed.ok ? null : parsed.error}
        />
      )}

      <p className="text-xs text-muted-foreground">
        DBML reference:{" "}
        <a href="https://dbml.dbdiagram.io/docs/" target="_blank" rel="noreferrer" className="underline hover:text-foreground">
          dbml.dbdiagram.io
        </a>
        . Click a table to highlight its relations · hover a column to spotlight FK partners · right-click for actions. Layout, viewport, and sidebar state are saved per-schema.
      </p>

      {contextMenu && (
        <TableContextMenu
          menu={contextMenu}
          onClose={() => setContextMenu(null)}
          onCenter={(id) => {
            focusOnTable(id);
            setContextMenu(null);
          }}
          onCopyBlock={(id) => {
            copyTableBlock(id);
            setContextMenu(null);
          }}
          onJumpToEditor={(id) => {
            jumpToEditor(id);
            setContextMenu(null);
          }}
          onSetHeaderColor={(id, color) => {
            updateHeaderColor(id, color);
            setContextMenu(null);
          }}
          onDelete={(id) => {
            deleteTable(id);
            setContextMenu(null);
          }}
        />
      )}

      {shortcutsOpen && (
        <ShortcutsPopover onClose={() => setShortcutsOpen(false)} />
      )}
    </div>
  );
}

function ShortcutsPopover({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-40" onClick={onClose}>
      <div
        className="absolute right-6 top-20 w-72 rounded-md border border-border bg-popover p-3 text-popover-foreground shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center gap-2 text-xs font-medium">
          <Keyboard className="h-3.5 w-3.5" /> Keyboard shortcuts
        </div>
        <ul className="grid grid-cols-1 gap-1.5 text-xs">
          {SHORTCUTS.map(([key, label]) => (
            <li key={key} className="flex items-center justify-between gap-2">
              <span className="text-muted-foreground">{label}</span>
              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                {key}
              </kbd>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface ToolbarProps {
  view: ViewMode;
  setView: (v: ViewMode) => void;
  dbml: string;
  setDbml: (s: string) => void;
  stats: { tables: number; fields: number; refs: number } | null;
  sidebarOpen: boolean;
  setSidebarOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (v: boolean | ((p: boolean) => boolean)) => void;
}

function Toolbar({
  view,
  setView,
  dbml,
  setDbml,
  stats,
  sidebarOpen,
  setSidebarOpen,
  shortcutsOpen,
  setShortcutsOpen,
}: ToolbarProps) {
  const [sampleId, setSampleId] = useState<string>("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SegmentedControl
        ariaLabel="View"
        value={view}
        onChange={(v) => setView(v as ViewMode)}
        options={[
          { value: "diagram", label: "Editor + Diagram" },
          { value: "generate", label: "Generate Code" },
          { value: "mock", label: "Mock Data" },
          { value: "diff", label: "Diff & Migrate" },
          { value: "import", label: "Import SQL" },
          { value: "export", label: "Export SQL" },
        ]}
      />
      <select
        value={sampleId}
        onChange={(e) => {
          const id = e.target.value;
          setSampleId(id);
          const found = SAMPLES.find((s) => s.id === id);
          if (found) setDbml(found.dbml);
        }}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      >
        <option value="">Load sample…</option>
        {SAMPLES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name} — {s.description}
          </option>
        ))}
      </select>
      <Button variant="ghost" size="sm" onClick={() => setDbml("")} disabled={!dbml}>
        Clear
      </Button>
      {view === "diagram" && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
            title={sidebarOpen ? "Hide table list" : "Show table list"}
          >
            {sidebarOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShortcutsOpen((v) => !v)}
            aria-label="Keyboard shortcuts"
            title="Keyboard shortcuts"
            aria-pressed={shortcutsOpen}
          >
            <Keyboard className="h-4 w-4" />
          </Button>
        </>
      )}
      {stats && (
        <span className="ml-auto text-xs text-muted-foreground">
          {stats.tables} tables · {stats.fields} fields · {stats.refs} refs
        </span>
      )}
    </div>
  );
}

interface EditorPanelProps {
  dbml: string;
  setDbml: (s: string) => void;
  parseError: string | null;
  lintIssues: ReturnType<typeof lintSchema>;
  onJump: (table: string) => void;
}

function EditorPanel({ dbml, setDbml, parseError, lintIssues, onJump }: EditorPanelProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">DBML</span>
        <CopyButton value={dbml} />
      </div>
      <Textarea
        value={dbml}
        onChange={(e) => setDbml(e.target.value)}
        placeholder="Table users { id int [pk] ... }"
        className="min-h-[300px] font-mono text-sm lg:min-h-[480px]"
        spellCheck={false}
      />
      {parseError && <p className="text-xs text-destructive">{parseError}</p>}
      {!parseError && <LintPanel issues={lintIssues} onJump={onJump} />}
    </div>
  );
}

interface DiagramPanelProps {
  flowRef: React.RefObject<HTMLDivElement | null>;
  nodes: Node<DbTableData>[];
  edges: Edge<CrowFootEdgeData>[];
  onNodesChange: (n: Node<DbTableData>[]) => void;
  onEdgesChange: (e: Edge<CrowFootEdgeData>[]) => void;
  onPositionPersist: (n: Node<DbTableData>[]) => void;
  relayout: () => void;
  recenter: () => void;
  downloadImage: (kind: "png" | "svg") => void;
  fullscreen: boolean;
  setFullscreen: (b: boolean | ((v: boolean) => boolean)) => void;
  parseOk: boolean;
  focusTable: string | null;
  onFocusHandled: () => void;
  onTableContextMenu: (payload: ContextMenuState) => void;
  searchRef: React.RefObject<HTMLInputElement | null>;
}

function DiagramPanel(props: DiagramPanelProps) {
  const {
    flowRef,
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onPositionPersist,
    relayout,
    recenter,
    downloadImage,
    fullscreen,
    setFullscreen,
    parseOk,
    focusTable,
    onFocusHandled,
    onTableContextMenu,
    searchRef,
  } = props;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Schema</span>
        <Button variant="ghost" size="sm" onClick={relayout} disabled={!nodes.length}>
          <RefreshCw className="h-4 w-4" /> Auto-layout
        </Button>
        <Button variant="ghost" size="sm" onClick={recenter} disabled={!nodes.length}>
          Fit
        </Button>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => downloadImage("svg")} disabled={!nodes.length}>
            <Download className="h-4 w-4" /> SVG
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadImage("png")} disabled={!nodes.length}>
            <Download className="h-4 w-4" /> PNG
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setFullscreen((v) => !v)}
            aria-label={fullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div
        ref={flowRef}
        className={
          fullscreen
            ? "fixed inset-0 z-50 bg-background"
            : "relative h-[480px] overflow-hidden rounded-md border border-border bg-card lg:h-[640px]"
        }
      >
        {fullscreen && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setFullscreen(false)}
            className="absolute right-3 top-3 z-10"
          >
            <Minimize2 className="h-4 w-4" /> Close
          </Button>
        )}
        {nodes.length === 0 ? (
          <div className="grid h-full place-items-center text-xs text-muted-foreground">
            {parseOk ? "Add a Table block to see the diagram." : "—"}
          </div>
        ) : (
          <DiagramCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onPositionPersist={onPositionPersist}
            focusTable={focusTable}
            onFocusHandled={onFocusHandled}
            onRelayout={relayout}
            onFit={recenter}
            onTableContextMenu={onTableContextMenu}
            searchRef={searchRef}
          />
        )}
      </div>
    </div>
  );
}

interface ImportPanelProps {
  importSql: string;
  setImportSql: (s: string) => void;
  importFmt: ImportFmt;
  setImportFmt: (f: ImportFmt) => void;
  dbml: string;
  handleImport: () => void;
}

function ImportPanel({ importSql, setImportSql, importFmt, setImportFmt, dbml, handleImport }: ImportPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">SQL</span>
          <SegmentedControl
            size="sm"
            ariaLabel="Source dialect"
            value={importFmt}
            onChange={(v) => setImportFmt(v as ImportFmt)}
            options={[
              { value: "postgres", label: "Postgres" },
              { value: "mysql", label: "MySQL" },
              { value: "mssql", label: "MSSQL" },
            ]}
          />
          <Button onClick={handleImport} size="sm" disabled={!importSql.trim()} className="ml-auto">
            <Upload className="h-4 w-4" /> Import to DBML
          </Button>
        </div>
        <Textarea
          value={importSql}
          onChange={(e) => setImportSql(e.target.value)}
          placeholder="CREATE TABLE users ( ... );"
          className="min-h-[420px] font-mono text-sm lg:min-h-[600px]"
          spellCheck={false}
        />
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current DBML (will be replaced)</span>
          <CopyButton value={dbml} />
        </div>
        <Textarea
          value={dbml}
          readOnly
          className="min-h-[420px] font-mono text-sm lg:min-h-[600px]"
          spellCheck={false}
        />
      </div>
    </div>
  );
}

interface ExportPanelProps {
  dbml: string;
  setDbml: (s: string) => void;
  exportFmt: ExportFmt;
  setExportFmt: (f: ExportFmt) => void;
  exported: string;
  parseError: string | null;
}

function ExportPanel({ dbml, setDbml, exportFmt, setExportFmt, exported, parseError }: ExportPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">DBML</span>
          <CopyButton value={dbml} />
        </div>
        <Textarea
          value={dbml}
          onChange={(e) => setDbml(e.target.value)}
          className="min-h-[420px] font-mono text-sm lg:min-h-[600px]"
          spellCheck={false}
        />
        {parseError && <p className="text-xs text-destructive">{parseError}</p>}
      </div>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Export</span>
          <SegmentedControl
            size="sm"
            ariaLabel="Format"
            value={exportFmt}
            onChange={(v) => setExportFmt(v as ExportFmt)}
            options={[
              { value: "postgres", label: "Postgres" },
              { value: "mysql", label: "MySQL" },
              { value: "mssql", label: "MSSQL" },
              { value: "json", label: "JSON" },
            ]}
          />
          <CopyButton value={exported} className="ml-auto" />
        </div>
        <Textarea
          value={exported}
          readOnly
          className="min-h-[420px] font-mono text-sm lg:min-h-[600px]"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
