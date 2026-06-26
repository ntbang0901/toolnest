## 1. Project Setup & Dependencies

- [ ] 1.1 Install npm dependencies: konva, react-konva, pdf-lib, @pdf-lib/fontkit, qrcode, jsbarcode, nanoid
- [ ] 1.2 Create directory structure under src/components/tools/print-template/ (state/, canvas/, elements/, panels/, toolbar/, export/, templates/, hooks/, utils/)
- [ ] 1.3 Create Astro page at src/pages/tools/print-template-designer.astro with client:only="react"
- [ ] 1.4 Register tool in src/lib/tools-registry.ts (slug: print-template-designer, category: generator, icon: LayoutTemplate) ← (verify: tool page loads without errors, registry entry correct)

## 2. Types & Data Model

- [ ] 2.1 Create src/components/tools/print-template/types.ts with all TypeScript interfaces: Point, Size, Bounds, Unit, CanvasSettings, ElementBase, TextElement, ImageElement, ShapeElement, QRCodeElement, BarcodeElement, DesignElement union, TemplateDocument, Page, UIState, HistoryState, ToolMode, Guide, DesignerAction union type

## 3. State Management

- [ ] 3.1 Create src/components/tools/print-template/utils/id-generator.ts using nanoid
- [ ] 3.2 Create src/components/tools/print-template/utils/unit-conversion.ts with mmToPx, mmToPt, pxToMm, ptToMm conversion functions
- [ ] 3.3 Create src/components/tools/print-template/state/initial-state.ts with default TemplateDocument (A4 page, empty elements), default UIState, default HistoryState
- [ ] 3.4 Create src/components/tools/print-template/state/history-manager.ts with pushSnapshot, undo, redo functions operating on HistoryState
- [ ] 3.5 Create src/components/tools/print-template/state/designer-reducer.ts implementing all DesignerAction handlers: ELEMENT_ADD, ELEMENT_UPDATE, ELEMENT_DELETE, ELEMENT_MOVE, ELEMENT_RESIZE, ELEMENT_ROTATE, ELEMENT_REORDER, SELECTION_SET, SELECTION_CLEAR, CANVAS_SET_SIZE, CANVAS_SET_ZOOM, CANVAS_SET_PAN, HISTORY_UNDO, HISTORY_REDO, HISTORY_SNAPSHOT, DOCUMENT_LOAD, DOCUMENT_CLEAR
- [ ] 3.6 Create src/components/tools/print-template/state/designer-context.tsx with DesignerProvider (useReducer + Context), exporting useDesigner hook ← (verify: context provides state and dispatch, undo/redo works with 50-entry history limit, new actions clear redo stack)

## 4. Canvas Core

- [ ] 4.1 Create src/components/tools/print-template/utils/geometry.ts with bounds calculation, rotation math, point-in-rect, rect intersection utilities
- [ ] 4.2 Create src/components/tools/print-template/canvas/canvas-viewport.tsx wrapping Konva Stage with page dimensions (mm converted to px at current zoom), white page background on gray container
- [ ] 4.3 Create src/components/tools/print-template/hooks/use-zoom-pan.ts implementing wheel zoom (Ctrl+wheel, 25%-400%), Space+drag pan, middle-click pan, Ctrl+0 fit-to-view
- [ ] 4.4 Create src/components/tools/print-template/canvas/canvas-grid.tsx rendering grid lines on a Konva Layer (configurable spacing, toggleable)
- [ ] 4.5 Create src/components/tools/print-template/canvas/canvas-area.tsx composing viewport + grid + elements layer, handling click-to-deselect on empty area ← (verify: canvas renders A4 page, zoom 25%-400% works, pan via Space+drag works, grid toggles on/off)

## 5. Element Rendering

- [ ] 5.1 Create src/components/tools/print-template/elements/text-element.tsx rendering Konva Text with font/size/color/alignment, double-click to show editable textarea overlay
- [ ] 5.2 Create src/components/tools/print-template/elements/image-element.tsx rendering Konva Image from data URL with fit modes (contain/cover/fill)
- [ ] 5.3 Create src/components/tools/print-template/elements/shape-element.tsx rendering Konva Rect/Circle/Ellipse/Line/RegularPolygon based on shape type with fill/stroke/borderRadius
- [ ] 5.4 Create src/components/tools/print-template/elements/qrcode-element.tsx generating QR code via qrcode library, rendering as Konva Image with configurable error correction and colors
- [ ] 5.5 Create src/components/tools/print-template/elements/barcode-element.tsx generating barcode via jsbarcode, rendering as Konva Image with format/color/displayValue options
- [ ] 5.6 Create src/components/tools/print-template/elements/design-element.tsx as wrapper that renders the correct element component based on type, handles common properties (opacity, visibility), and attaches Konva Transformer for resize/rotate when selected ← (verify: all 5 element types render correctly on canvas, text editing via double-click works, QR/barcode generate from data)

## 6. Canvas Interactions

- [ ] 6.1 Create src/components/tools/print-template/hooks/use-drag.ts implementing pointer-based drag for moving elements, dispatching ELEMENT_MOVE on drag end
- [ ] 6.2 Implement resize via Konva Transformer in design-element.tsx: 8-point handles, minimum 2×2mm, aspect-ratio lock by default (free with Shift), dispatching ELEMENT_RESIZE
- [ ] 6.3 Implement rotation via Konva Transformer rotation handle: 1-degree increments, 15-degree snap with Shift held, dispatching ELEMENT_ROTATE
- [ ] 6.4 Create src/components/tools/print-template/canvas/selection-marquee.tsx implementing rubber-band selection (click+drag on empty area selects enclosed elements, Shift adds to selection)
- [ ] 6.5 Create src/components/tools/print-template/hooks/use-snap.ts implementing snap-to-grid (quantize to grid spacing) and snap-to-element (edge/center alignment within 2px threshold)
- [ ] 6.6 Create src/components/tools/print-template/canvas/smart-guides.tsx rendering cyan guide lines during drag when snap-to-element detects alignment
- [ ] 6.7 Create src/components/tools/print-template/hooks/use-keyboard.ts implementing all shortcuts: Delete, Ctrl+Z/Y, Ctrl+D, Ctrl+A, Ctrl+C/X/V, Ctrl+S, arrow nudge (1mm, 10mm with Shift) ← (verify: drag moves elements, resize respects min 2mm, rotation works with Shift snap, marquee selects enclosed elements, snap guides appear during drag, all keyboard shortcuts function)

## 7. Panels

- [ ] 7.1 Create src/components/tools/print-template/panels/element-palette.tsx with draggable element sources (Text, Image, Rectangle, Circle, Line, Triangle, QR Code, Barcode) that dispatch ELEMENT_ADD on drop to canvas
- [ ] 7.2 Create src/components/tools/print-template/panels/properties-panel.tsx as contextual panel: shows canvas settings when no selection, element-specific properties when selected
- [ ] 7.3 Create property editor sub-components under panels/property-editors/ for each element type (text-properties.tsx, image-properties.tsx, shape-properties.tsx, qrcode-properties.tsx, barcode-properties.tsx) with input controls dispatching ELEMENT_UPDATE
- [ ] 7.4 Create common properties section in properties-panel.tsx: position (x, y), size (width, height), rotation, opacity slider, name input, lock toggle — visible for all element types
- [ ] 7.5 Create src/components/tools/print-template/panels/layers-panel.tsx listing elements in z-order (top first), with visibility toggle (eye), lock toggle, click-to-select, drag-to-reorder ← (verify: palette drag creates elements on canvas, properties panel shows correct fields per element type, property changes update element immediately, layers panel reflects z-order and toggles work)

## 8. Toolbar & Status Bar

- [ ] 8.1 Create src/components/tools/print-template/toolbar/designer-toolbar.tsx with: tool selector (Select/Pan), zoom controls (in/out/fit/percentage), undo/redo buttons, grid toggle, canvas size preset selector, export button, save/load buttons, templates button
- [ ] 8.2 Create src/components/tools/print-template/toolbar/alignment-tools.tsx with alignment buttons (left/center/right/top/middle/bottom) visible when 2+ elements selected, dispatching ELEMENT_MOVE to align
- [ ] 8.3 Create src/components/tools/print-template/toolbar/status-bar.tsx showing cursor position (mm), selection dimensions, element count, zoom percentage ← (verify: toolbar buttons trigger correct actions, alignment tools align elements correctly, status bar updates on cursor move and selection change)

## 9. Export

- [ ] 9.1 Create src/components/tools/print-template/export/export-pdf.ts implementing PDF generation via pdf-lib: create page with exact mm dimensions (converted to pt), draw text elements as vector text with embedded font, draw images as embedded PNG/JPEG, draw shapes as vector paths, draw QR/barcodes as embedded images
- [ ] 9.2 Create src/components/tools/print-template/export/export-png.ts implementing PNG export by rendering Konva stage to dataURL at configurable DPI (150/300), converting pixel ratio appropriately
- [ ] 9.3 Create src/components/tools/print-template/export/export-json.ts implementing save (serialize TemplateDocument to JSON, trigger download) and load (parse JSON file, validate structure, dispatch DOCUMENT_LOAD)
- [ ] 9.4 Create src/components/tools/print-template/export/export-dialog.tsx as modal with format selector (PDF/PNG), DPI selector (PNG only), filename input, Export/Cancel buttons, loading state during generation
- [ ] 9.5 Implement localStorage auto-save (debounced 500ms on any change) and restore prompt on load ← (verify: PDF export produces correct dimensions with vector text, PNG export at 300 DPI has correct pixel dimensions, JSON save/load roundtrips without data loss, localStorage persistence works)

## 10. Templates & Polish

- [ ] 10.1 Create src/components/tools/print-template/templates/presets.ts with canvas size presets (Business Card 85×55mm, A4 210×297mm, Badge 86×54mm, Label 100×50mm) and 4 starter template documents (business card, badge, label, certificate with sample elements)
- [ ] 10.2 Create src/components/tools/print-template/templates/template-gallery.tsx as modal showing template previews with descriptions, load-on-click with unsaved changes confirmation
- [ ] 10.3 Create src/components/tools/print-template/canvas/rulers.tsx rendering top and left rulers with mm/cm markings that respond to zoom level

## 11. Entry Point & Integration

- [ ] 11.1 Create src/components/tools/print-template/index.tsx composing the full layout: DesignerProvider wrapping toolbar (top), element palette (left), canvas area (center), properties panel (right), layers panel (collapsible), status bar (bottom), export dialog, template gallery
- [ ] 11.2 Verify full integration: tool loads from /tools/print-template-designer, all panels render, elements can be added/moved/resized/rotated, export produces valid PDF/PNG, save/load works ← (verify: complete tool functions end-to-end — add elements, manipulate them, export PDF with vector text, save/load JSON, undo/redo across all operations, keyboard shortcuts all work, template gallery loads presets)
