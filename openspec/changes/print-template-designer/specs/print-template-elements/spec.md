## ADDED Requirements

### Requirement: Text element rendering and editing
The system SHALL support text elements with configurable font family, size, weight, color, alignment, and line height. Text elements SHALL be editable via double-click.

#### Scenario: Add text element
- **WHEN** user drags a text element from the palette onto the canvas
- **THEN** a text element appears at the drop position with default content "Text" and default styling (Inter, 14pt, black, left-aligned)

#### Scenario: Edit text inline
- **WHEN** user double-clicks a text element
- **THEN** a text input overlay appears over the element allowing direct text editing with cursor and selection support

#### Scenario: Text wrapping within bounds
- **WHEN** text content exceeds the element width
- **THEN** text wraps to the next line within the element bounds

### Requirement: Image element rendering
The system SHALL support image elements loaded from local file upload. Images SHALL respect their container bounds with configurable fit mode.

#### Scenario: Add image via file upload
- **WHEN** user drags an image element from palette and uploads a file (PNG, JPG, SVG, WebP)
- **THEN** the image appears on the canvas with dimensions proportional to the original aspect ratio, fitted within a default 50×50mm bounding box

#### Scenario: Image fit modes
- **WHEN** user changes the image fit mode (contain, cover, fill)
- **THEN** the image rendering within its bounds adjusts: contain shows full image with letterboxing, cover fills bounds and clips, fill stretches to fill

### Requirement: Shape element rendering
The system SHALL support shape elements of types: rectangle, circle, ellipse, line, and triangle with configurable fill, stroke, and border radius.

#### Scenario: Add rectangle shape
- **WHEN** user drags a rectangle from the palette onto the canvas
- **THEN** a rectangle appears at the drop position with default 40×30mm size, gray fill, 1px black stroke

#### Scenario: Configure shape properties
- **WHEN** user selects a shape and modifies fill color, stroke color, stroke width, or border radius
- **THEN** the shape updates its visual appearance immediately

#### Scenario: Line element
- **WHEN** user adds a line element
- **THEN** a horizontal line appears with configurable stroke color, width, and length

### Requirement: QR Code element rendering
The system SHALL support QR code elements generated from user-provided text data, with configurable error correction level and colors.

#### Scenario: Add QR code
- **WHEN** user drags a QR code element from palette and enters data text
- **THEN** a QR code renders on canvas with the encoded data, default size 30×30mm, black on white

#### Scenario: QR code configuration
- **WHEN** user changes QR code data, error correction (L/M/Q/H), foreground color, or background color
- **THEN** the QR code re-renders immediately with the new settings

### Requirement: Barcode element rendering
The system SHALL support barcode elements in formats: CODE128, EAN-13, EAN-8, UPC, CODE39 with configurable colors and display value toggle.

#### Scenario: Add barcode
- **WHEN** user drags a barcode element from palette and enters data
- **THEN** a CODE128 barcode renders on canvas with the encoded data, default width 50mm

#### Scenario: Barcode format change
- **WHEN** user changes barcode format (e.g., from CODE128 to EAN-13)
- **THEN** the barcode re-renders in the new format, displaying a validation error if the data is incompatible with the chosen format

#### Scenario: Barcode display value
- **WHEN** user toggles "Show value" on a barcode element
- **THEN** the human-readable data text appears/disappears below the barcode

### Requirement: Element base properties
All elements SHALL have common properties: position (x, y in mm), size (width, height in mm), rotation (degrees), opacity (0-1), locked state, visibility, and a user-editable name.

#### Scenario: Element positioning
- **WHEN** an element is placed on the canvas
- **THEN** its x, y coordinates represent the top-left corner position relative to the page origin, stored in millimeters

#### Scenario: Element rotation
- **WHEN** user rotates an element via the rotation handle
- **THEN** the element rotates around its center point, rotation value stored in degrees (0-360)

#### Scenario: Element opacity
- **WHEN** user adjusts element opacity slider
- **THEN** the element renders with the specified opacity (0 = fully transparent, 1 = fully opaque)

#### Scenario: Locked element
- **WHEN** an element is locked
- **THEN** it cannot be moved, resized, rotated, or deleted until unlocked. It can still be selected to view properties.
