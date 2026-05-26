import { useRef } from "react";
import {
  Copy,
  Download,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Redo2,
  Trash2,
  Undo2,
  Upload,
  ZoomIn,
  ZoomOut,
  Crosshair,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SAMPLES } from "../samples";

export interface ToolbarProps {
  paletteOpen: boolean;
  propsOpen: boolean;
  fullscreen: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
  nodeCount: number;
  edgeCount: number;
  onTogglePalette: () => void;
  onToggleProps: () => void;
  onToggleFullscreen: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onClear: () => void;
  onExportPng: () => void;
  onExportSvg: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onLoadSample: (id: string) => void;
}

export function DiagramToolbar(props: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-card/40 px-2 py-1.5">
      <Button
        variant="ghost"
        size="sm"
        onClick={props.onTogglePalette}
        title={props.paletteOpen ? "Hide shapes" : "Show shapes"}
      >
        {props.paletteOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <Button variant="ghost" size="sm" onClick={props.onUndo} disabled={!props.canUndo} title="Undo (⌘Z)">
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={props.onRedo} disabled={!props.canRedo} title="Redo (⇧⌘Z)">
        <Redo2 className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <Button
        variant="ghost"
        size="sm"
        onClick={props.onDuplicate}
        disabled={!props.hasSelection}
        title="Duplicate (⌘D)"
      >
        <Copy className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={props.onDelete}
        disabled={!props.hasSelection}
        title="Delete (⌫)"
      >
        <Trash2 className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <Button variant="ghost" size="sm" onClick={props.onZoomOut} title="Zoom out">
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={props.onZoomIn} title="Zoom in">
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={props.onFit} title="Fit view (F)">
        <Crosshair className="h-4 w-4" />
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <select
        defaultValue=""
        onChange={(e) => {
          const id = e.target.value;
          if (id) props.onLoadSample(id);
          e.target.value = "";
        }}
        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
      >
        <option value="">Templates…</option>
        {SAMPLES.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (confirm("Clear the canvas? This cannot be undone after autosave overwrites.")) {
            props.onClear();
          }
        }}
        title="Clear canvas"
      >
        Clear
      </Button>

      <div className="mx-1 h-5 w-px bg-border" />

      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} title="Import JSON">
        <Upload className="h-4 w-4" /> Import
      </Button>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) props.onImportJson(f);
          e.target.value = "";
        }}
      />
      <Button variant="outline" size="sm" onClick={props.onExportSvg} title="Export SVG">
        <Download className="h-4 w-4" /> SVG
      </Button>
      <Button variant="outline" size="sm" onClick={props.onExportPng} title="Export PNG">
        <Download className="h-4 w-4" /> PNG
      </Button>
      <Button variant="outline" size="sm" onClick={props.onExportJson} title="Export JSON">
        <Download className="h-4 w-4" /> JSON
      </Button>

      <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <span>
          {props.nodeCount} shapes · {props.edgeCount} connections
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onToggleProps}
          title={props.propsOpen ? "Hide properties" : "Show properties"}
        >
          {props.propsOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={props.onToggleFullscreen}
          title={props.fullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {props.fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
}
