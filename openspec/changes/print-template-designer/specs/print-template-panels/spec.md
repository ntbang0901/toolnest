## ADDED Requirements

### Requirement: Element palette panel
The system SHALL provide a left sidebar panel containing draggable element sources (Text, Image, Shape, QR Code, Barcode) that users can drag onto the canvas to add new elements.

#### Scenario: Drag element from palette
- **WHEN** user drags an element type from the left palette onto the canvas
- **THEN** a new element of that type is created at the drop position with default properties

#### Scenario: Palette element types
- **WHEN** the palette is visible
- **THEN** it displays icons and labels for: Text, Image, Rectangle, Circle, Line, Triangle, QR Code, Barcode

#### Scenario: Palette collapsible
- **WHEN** user clicks the collapse toggle on the palette panel
- **THEN** the palette collapses to icon-only mode, freeing canvas space

### Requirement: Properties panel
The system SHALL provide a right sidebar panel that displays and allows editing of the selected element's properties. The panel content SHALL change based on the element type selected.

#### Scenario: No selection
- **WHEN** no element is selected
- **THEN** the properties panel shows canvas/page settings (size, background color, grid)

#### Scenario: Text element selected
- **WHEN** a text element is selected
- **THEN** the properties panel shows: content, font family, font size, font weight, font style, color, background color, text align, vertical align, line height, letter spacing, padding

#### Scenario: Image element selected
- **WHEN** an image element is selected
- **THEN** the properties panel shows: image source (with replace button), fit mode, border radius, border width, border color

#### Scenario: Shape element selected
- **WHEN** a shape element is selected
- **THEN** the properties panel shows: shape type, fill color, stroke color, stroke width, border radius (for rectangles)

#### Scenario: QR code element selected
- **WHEN** a QR code element is selected
- **THEN** the properties panel shows: data text, error correction level (L/M/Q/H), foreground color, background color

#### Scenario: Barcode element selected
- **WHEN** a barcode element is selected
- **THEN** the properties panel shows: data text, format selector, display value toggle, line color, background color

#### Scenario: Common properties for all elements
- **WHEN** any element is selected
- **THEN** the properties panel always shows: position (x, y), size (width, height), rotation, opacity, name field, lock toggle

### Requirement: Layers panel
The system SHALL provide a layers panel listing all elements on the current page in z-order (top-most element first), with controls for visibility, lock, and reordering.

#### Scenario: Layer list display
- **WHEN** the layers panel is visible
- **THEN** it shows all elements listed from top (highest z-index) to bottom, each with: element name, type icon, visibility toggle (eye), lock toggle (lock)

#### Scenario: Reorder via drag in layers
- **WHEN** user drags a layer entry to a new position in the list
- **THEN** the element's z-order changes accordingly on the canvas

#### Scenario: Select via layers
- **WHEN** user clicks a layer entry
- **THEN** the corresponding element is selected on the canvas and scrolled into view

#### Scenario: Toggle visibility
- **WHEN** user clicks the eye icon on a layer entry
- **THEN** the element becomes invisible on canvas (but remains in the document) or becomes visible again

#### Scenario: Toggle lock
- **WHEN** user clicks the lock icon on a layer entry
- **THEN** the element's locked state toggles, preventing or allowing interaction

### Requirement: Designer toolbar
The system SHALL provide a top toolbar containing: active tool selector (select/pan), zoom controls, undo/redo buttons, grid toggle, canvas size selector, and export button.

#### Scenario: Tool selector
- **WHEN** user clicks the Select tool or Pan tool in the toolbar
- **THEN** the active tool mode changes, affecting how mouse interactions behave on the canvas

#### Scenario: Undo/redo buttons
- **WHEN** undo is available (history has past entries)
- **THEN** the undo button is enabled; clicking it dispatches HISTORY_UNDO

#### Scenario: Export button
- **WHEN** user clicks the Export button in the toolbar
- **THEN** the export dialog modal opens

### Requirement: Status bar
The system SHALL display a bottom status bar showing: current cursor position in mm, selected element dimensions, element count, and current zoom percentage.

#### Scenario: Cursor position display
- **WHEN** user moves the cursor over the canvas
- **THEN** the status bar shows the cursor position in mm relative to the page origin (e.g., "X: 105.0 Y: 148.5")

#### Scenario: Selection info
- **WHEN** one or more elements are selected
- **THEN** the status bar shows the selection dimensions (e.g., "W: 85.0 H: 55.0 mm") and element count in selection
