## ADDED Requirements

### Requirement: Canvas renders a fixed-size page
The system SHALL render a canvas representing a printable page with configurable dimensions in millimeters. The canvas SHALL display a white page area on a neutral gray background.

#### Scenario: Default canvas initialization
- **WHEN** the tool loads for the first time
- **THEN** the canvas displays an A4-sized page (210×297mm) centered in the viewport with zoom-to-fit applied

#### Scenario: Canvas size change via preset
- **WHEN** user selects a page size preset (Business Card 85×55mm, A4 210×297mm, Badge 86×54mm, Label 100×50mm)
- **THEN** the canvas resizes to the selected dimensions and re-centers in the viewport

#### Scenario: Custom canvas size
- **WHEN** user enters custom width and height values in mm
- **THEN** the canvas resizes to the exact specified dimensions

### Requirement: Canvas supports zoom
The system SHALL support zooming the canvas view from 25% to 400% via mouse wheel (with Ctrl/Cmd held), pinch gesture, or zoom controls in the toolbar.

#### Scenario: Zoom via mouse wheel
- **WHEN** user holds Ctrl/Cmd and scrolls the mouse wheel up
- **THEN** the canvas zoom level increases by 10% increments, centered on the cursor position

#### Scenario: Zoom via toolbar controls
- **WHEN** user clicks the zoom-in/zoom-out buttons or selects a zoom percentage from the dropdown
- **THEN** the canvas zoom level adjusts to the selected value, centered on the viewport center

#### Scenario: Zoom to fit
- **WHEN** user clicks "Fit" button or presses Ctrl+0
- **THEN** the canvas zooms to fit the entire page within the visible viewport with padding

### Requirement: Canvas supports pan
The system SHALL allow panning the canvas view via middle-mouse-button drag, Space+drag, or scroll on trackpad.

#### Scenario: Pan via Space+drag
- **WHEN** user holds Space and drags the mouse
- **THEN** the canvas viewport pans in the drag direction, cursor changes to grab hand

#### Scenario: Pan via scroll
- **WHEN** user scrolls without Ctrl/Cmd held
- **THEN** the canvas pans vertically (scroll) and horizontally (shift+scroll)

### Requirement: Canvas displays grid overlay
The system SHALL optionally display a grid overlay on the canvas to assist with element alignment.

#### Scenario: Toggle grid
- **WHEN** user toggles the grid button in the toolbar
- **THEN** a grid overlay appears/disappears on the canvas with the configured spacing (default 5mm)

#### Scenario: Grid spacing configuration
- **WHEN** user changes the grid spacing value
- **THEN** the grid redraws with the new spacing

### Requirement: Canvas displays snap-to-grid behavior
The system SHALL snap element positions to the grid when grid is enabled and elements are being dragged.

#### Scenario: Snap during drag
- **WHEN** user drags an element with grid enabled
- **THEN** the element position snaps to the nearest grid intersection (quantized to grid spacing)

#### Scenario: Snap during resize
- **WHEN** user resizes an element with grid enabled
- **THEN** the resize handle snaps to the nearest grid line
