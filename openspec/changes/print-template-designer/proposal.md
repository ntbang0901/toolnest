## Why

Toolnest lacks a visual design tool for creating printable templates. Users who need to design labels, business cards, invoices, certificates, or badges currently rely on external tools (Canva, Adobe Express) or manual code. A browser-based, client-side drag-and-drop print template designer fills this gap — enabling users to visually compose templates with precise mm-based dimensions and export production-ready PDFs with vector text and embedded fonts.

## What Changes

- Add a new "Print Template Designer" tool with a full drag-and-drop canvas editor
- Introduce Konva.js + react-konva as the canvas rendering engine (new dependency)
- Add pdf-lib + @pdf-lib/fontkit for client-side PDF generation (new dependency)
- Add qrcode and jsbarcode libraries for element generation (new dependencies)
- Add nanoid for element ID generation (new dependency)
- Register the tool in tools-registry.ts under the "generator" category
- Create a new Astro page at /tools/print-template-designer
- Implement a complex tool using the subfolder pattern (src/components/tools/print-template/)

## Capabilities

### New Capabilities

- `print-template-canvas`: Core canvas engine with Konva.js — zoom/pan (25%-400%), grid overlay, rulers, page size management (mm-based coordinates), snap-to-grid
- `print-template-elements`: Element system — Text, Image, Shape (rect/circle/ellipse/line/triangle), QR Code, Barcode with drag-to-place, resize (8-point handles), rotation, multi-select, and inline editing
- `print-template-state`: State management with useReducer + Context — element CRUD, selection, history (undo/redo 50 levels), clipboard (copy/paste/duplicate), z-order management
- `print-template-panels`: UI panels — element palette (left sidebar, drag to add), properties panel (right sidebar, contextual per element type), layers panel (z-order, visibility, lock), toolbar (top), status bar (bottom)
- `print-template-export`: Export pipeline — PDF via pdf-lib (vector text, font embedding, exact mm dimensions), PNG (configurable DPI 150/300), JSON save/load (full document serialization)
- `print-template-interactions`: Canvas interactions — keyboard shortcuts (Del, Ctrl+Z/Y, arrows, Ctrl+D), alignment tools (left/center/right/top/middle/bottom), smart guides, selection marquee

### Modified Capabilities

(none — this is a new standalone tool with no changes to existing capabilities)

## Impact

- **New dependencies**: konva, react-konva, pdf-lib, @pdf-lib/fontkit, qrcode, jsbarcode, nanoid (~6 packages)
- **Bundle size**: Konva ~150KB + pdf-lib ~200KB gzipped (loaded only on this tool's page via React island)
- **Files created**: ~35+ new files under src/components/tools/print-template/
- **Files modified**: src/lib/tools-registry.ts (add entry), new page src/pages/tools/print-template-designer.astro
- **No breaking changes** to existing tools or functionality
- **Build**: No changes to Astro/Vite config needed — React islands handle client-side hydration
