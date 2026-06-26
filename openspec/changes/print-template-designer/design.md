## Context

Toolnest is a static developer utilities site (Astro 5 + React 19 + Tailwind CSS 4) with 70+ tools. Each tool is a self-contained React component hydrated as an island. Complex tools use a subfolder pattern (e.g., `src/components/tools/diagram-dsl/`). The project already uses @xyflow/react for diagram tools, demonstrating the pattern for canvas-heavy tools.

We are adding a Print Template Designer — a visual drag-and-drop editor for creating printable templates. This is the most complex tool to date, requiring a canvas engine, multi-element system, state management with history, and production-quality PDF export.

## Goals / Non-Goals

**Goals:**
- Provide a professional-grade print template designer running entirely client-side
- Support precise mm-based positioning with export to print-ready PDF (vector text, 300 DPI images)
- Implement drag-and-drop with resize, rotation, multi-select, snap, and alignment
- Support 5 element types: Text, Image, Shape, QR Code, Barcode
- Enable save/load via JSON serialization (localStorage + file download/upload)
- Deliver smooth UX with undo/redo, keyboard shortcuts, and contextual panels

**Non-Goals:**
- Server-side rendering or server-side PDF generation
- Collaborative editing (Y.js/WebRTC) — future v2.0
- Multi-page documents — future v2.0
- Mail-merge / data binding — future v1.1
- Table element — future v1.1
- Rich text (per-character formatting) — future v1.1
- CMYK color mode — future v2.0
- Custom font upload — future (use web-safe fonts + Google Fonts for MVP)

## Decisions

### 1. Canvas Engine: Konva.js + react-konva

**Choice**: Konva.js with react-konva bindings (v19.x)

**Alternatives considered**:
- Fabric.js — heavier (~300KB), no maintained React bindings, imperative API fights React model
- SVG + DOM hybrid — more accessible but requires building all interaction primitives from scratch
- dnd-kit / react-dnd — optimized for list reordering, not free-form canvas positioning
- Native HTML5 Canvas — no object model, must build everything from scratch

**Rationale**: Konva provides a complete object model with built-in Transformer (resize/rotate handles), event system, layering, serialization, and React 19 support. Its `react-konva` bindings are declarative. The Transformer component alone saves weeks of development on resize/rotate handles.

### 2. Rendering: Canvas-based (Konva) with DOM overlays for text editing

**Choice**: Render all elements on Konva canvas. When user double-clicks a text element, mount a DOM textarea overlay for editing, then sync back to Konva.

**Rationale**: Konva handles all positioning/transformation uniformly. DOM overlay for text editing gives native cursor/selection behavior without implementing a text editor on canvas.

### 3. State Management: useReducer + React Context

**Choice**: Single `useReducer` with React Context provider wrapping the designer.

**Alternatives considered**:
- Zustand — unnecessary external dep for a self-contained tool
- Redux — overkill, adds boilerplate
- Jotai — atomic model doesn't fit well for document-level state with history

**Rationale**: The tool is self-contained (one page, one component tree). useReducer handles complex state transitions cleanly, Context distributes state without prop drilling. History is implemented as snapshots in the reducer (past/future arrays).

### 4. Coordinate System: mm internally, CSS px at render, pt at PDF export

**Choice**: Store all element positions/sizes in millimeters. Convert to CSS pixels for screen rendering (mm × 3.7795 × zoom), and to PDF points for export (mm × 2.8346).

**Rationale**: Print users think in mm. Storing in mm avoids lossy conversions and makes PDF export straightforward. The conversion factor is applied at render boundaries only.

### 5. PDF Export: pdf-lib + @pdf-lib/fontkit

**Choice**: Client-side PDF generation via pdf-lib.

**Alternatives considered**:
- jsPDF + html2canvas — rasterizes everything, no vector text, poor quality
- @react-pdf/renderer — fights against free-form positioning with its layout engine
- pdfmake — declarative model doesn't map to absolute positioning

**Rationale**: pdf-lib gives low-level control: exact coordinate placement, vector text drawing, font embedding (TTF/OTF via fontkit), and image embedding at native resolution. Perfect mapping from mm-based model to PDF point coordinates.

### 6. History: Full state snapshots

**Choice**: Store complete page element arrays in past/future stacks (max 50 entries).

**Alternatives considered**:
- Command pattern with inverse operations — complex to maintain, brittle with compound operations
- Immer patches — good for large state but adds dependency and complexity

**Rationale**: Print templates rarely have >100 elements. Full snapshots are simple, correct, and fast enough. Shallow copy via structured clone keeps memory manageable. Can migrate to patches later if needed.

### 7. File Structure: Subfolder with domain separation

**Choice**: `src/components/tools/print-template/` with subdirectories: state/, canvas/, elements/, panels/, toolbar/, export/, templates/, hooks/, utils/

**Rationale**: At ~35 files, a flat structure would be unmanageable. Domain-based folders match the tool's architecture layers. This follows the existing `diagram-dsl/` subfolder pattern in the project.

## Risks / Trade-offs

- **[Bundle size]** Konva (~150KB) + pdf-lib (~200KB) add ~350KB gzipped → Mitigated: loaded only on this tool's page via React island. No impact on other pages.
- **[Konva text limitations]** Konva text doesn't support per-character styling → Mitigated: MVP uses uniform text styling per element. Rich text deferred to v1.1 with Tiptap overlay.
- **[Font embedding in PDF]** Only fonts available as TTF/OTF files can be embedded → Mitigated: Bundle 2-3 standard fonts (Inter, Roboto Mono) as base64 or fetch from CDN. Web-safe fonts (Arial, Times) rendered via pdf-lib's standard fonts.
- **[Canvas accessibility]** Konva renders to `<canvas>` which is not accessible by default → Mitigated: Add ARIA labels on canvas container, keyboard navigation for element selection, screen reader announcements for state changes.
- **[Performance with many elements]** Canvas re-renders on every state change → Mitigated: Konva uses layer-based rendering (only dirty layers re-render). React-konva's reconciler minimizes updates. Typical print templates have <50 elements.
- **[Touch device UX]** Resize/rotate handles are small on mobile → Mitigated: Increase handle touch targets. The tool is primarily desktop-focused but touch will work for basic operations.
