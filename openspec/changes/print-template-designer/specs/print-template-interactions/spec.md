## ADDED Requirements

### Requirement: Keyboard shortcuts
The system SHALL support keyboard shortcuts for common operations when the canvas is focused.

#### Scenario: Delete selected elements
- **WHEN** user presses Delete or Backspace with elements selected
- **THEN** all selected elements are removed from the document

#### Scenario: Undo/Redo shortcuts
- **WHEN** user presses Ctrl+Z or Ctrl+Shift+Z / Ctrl+Y
- **THEN** the corresponding undo or redo action is performed

#### Scenario: Duplicate shortcut
- **WHEN** user presses Ctrl+D with elements selected
- **THEN** selected elements are duplicated (offset 5mm right and down)

#### Scenario: Select all shortcut
- **WHEN** user presses Ctrl+A
- **THEN** all visible, unlocked elements on the current page are selected

#### Scenario: Arrow key nudge
- **WHEN** user presses arrow keys with elements selected
- **THEN** selected elements move 1mm in the arrow direction (10mm with Shift held)

#### Scenario: Copy/Cut/Paste shortcuts
- **WHEN** user presses Ctrl+C, Ctrl+X, or Ctrl+V
- **THEN** the corresponding clipboard operation is performed

#### Scenario: Save shortcut
- **WHEN** user presses Ctrl+S
- **THEN** the document is saved (JSON download)

### Requirement: Element resize via handles
The system SHALL display 8 resize handles (corners + edge midpoints) around selected elements, allowing proportional and free resizing.

#### Scenario: Corner resize
- **WHEN** user drags a corner resize handle
- **THEN** the element resizes from that corner, maintaining aspect ratio by default (free resize with Shift held)

#### Scenario: Edge resize
- **WHEN** user drags an edge midpoint handle
- **THEN** the element resizes only in that axis (width for left/right edges, height for top/bottom edges)

#### Scenario: Minimum size enforcement
- **WHEN** user resizes an element below 2×2mm
- **THEN** the element size is clamped at minimum 2mm width and 2mm height

### Requirement: Element rotation via handle
The system SHALL display a rotation handle above the selected element, allowing free rotation in 1-degree increments (15-degree snapping with Shift held).

#### Scenario: Free rotation
- **WHEN** user drags the rotation handle
- **THEN** the element rotates around its center in 1-degree increments following the cursor angle

#### Scenario: Constrained rotation
- **WHEN** user drags the rotation handle while holding Shift
- **THEN** the rotation snaps to 15-degree increments (0, 15, 30, 45, 60, 75, 90, etc.)

### Requirement: Smart alignment guides
The system SHALL display alignment guide lines when a dragged element aligns with other elements' edges or centers.

#### Scenario: Edge alignment guide
- **WHEN** user drags an element and its left/right/top/bottom edge aligns with another element's corresponding edge (within 2px threshold)
- **THEN** a cyan guide line appears at the aligned position and the dragged element snaps to that position

#### Scenario: Center alignment guide
- **WHEN** user drags an element and its center aligns with another element's center (horizontal or vertical)
- **THEN** a cyan guide line appears at the center position and the element snaps

#### Scenario: Page center guide
- **WHEN** user drags an element near the horizontal or vertical center of the page
- **THEN** a guide line appears at the page center and the element snaps to center

#### Scenario: Guides disappear after drag
- **WHEN** user releases the drag
- **THEN** all alignment guide lines disappear immediately

### Requirement: Selection marquee
The system SHALL support rubber-band (marquee) selection by clicking and dragging on empty canvas area.

#### Scenario: Marquee selection
- **WHEN** user clicks on empty canvas and drags
- **THEN** a blue semi-transparent rectangle appears following the cursor, and all elements fully enclosed within the rectangle become selected upon release

#### Scenario: Marquee with Shift
- **WHEN** user shift-clicks on empty canvas and drags a marquee
- **THEN** enclosed elements are added to the existing selection (not replaced)

### Requirement: Alignment tools
The system SHALL provide alignment tools for positioning multiple selected elements relative to each other or to the canvas.

#### Scenario: Align left
- **WHEN** user selects 2+ elements and clicks "Align Left"
- **THEN** all selected elements move their left edge to match the leftmost element's left edge

#### Scenario: Align center horizontal
- **WHEN** user selects 2+ elements and clicks "Align Center"
- **THEN** all selected elements move to share the same horizontal center point (average of selection bounds center)

#### Scenario: Align right
- **WHEN** user selects 2+ elements and clicks "Align Right"
- **THEN** all selected elements move their right edge to match the rightmost element's right edge

#### Scenario: Align top
- **WHEN** user selects 2+ elements and clicks "Align Top"
- **THEN** all selected elements move their top edge to match the topmost element's top edge

#### Scenario: Align middle vertical
- **WHEN** user selects 2+ elements and clicks "Align Middle"
- **THEN** all selected elements move to share the same vertical center point

#### Scenario: Align bottom
- **WHEN** user selects 2+ elements and clicks "Align Bottom"
- **THEN** all selected elements move their bottom edge to match the bottommost element's bottom edge

### Requirement: Template gallery
The system SHALL provide a gallery of pre-built starter templates that users can load as a starting point.

#### Scenario: Open template gallery
- **WHEN** user clicks "Templates" button or when canvas is empty
- **THEN** a modal appears showing template previews (Business Card, Badge, Label, Certificate) with descriptions

#### Scenario: Load template
- **WHEN** user clicks a template in the gallery
- **THEN** the current document is replaced with the template's elements and canvas settings (with confirmation if current document has unsaved changes)
