## ADDED Requirements

### Requirement: PDF export with vector text
The system SHALL export the template to a PDF file using pdf-lib, rendering text as vector PDF text operators (not rasterized), with exact mm-based positioning and embedded fonts.

#### Scenario: Export to PDF
- **WHEN** user clicks Export and selects PDF format
- **THEN** a PDF file is generated and downloaded with: exact page dimensions matching canvas size, all elements positioned at their mm coordinates converted to PDF points, text rendered as selectable vector text

#### Scenario: Font embedding
- **WHEN** a text element uses a supported font (Inter, system fonts)
- **THEN** the font is embedded in the PDF file, ensuring consistent rendering on any device

#### Scenario: Image embedding in PDF
- **WHEN** the template contains image elements
- **THEN** images are embedded in the PDF at their native resolution (up to 300 DPI for print quality)

#### Scenario: Shape rendering in PDF
- **WHEN** the template contains shape elements
- **THEN** shapes are rendered as vector PDF drawing operations (not rasterized), maintaining crispness at any zoom

#### Scenario: QR/Barcode in PDF
- **WHEN** the template contains QR code or barcode elements
- **THEN** they are rendered as vector graphics in the PDF (drawn as paths, not images)

### Requirement: PNG export
The system SHALL export the template to a PNG image at configurable DPI (150 or 300).

#### Scenario: Export to PNG at 300 DPI
- **WHEN** user clicks Export, selects PNG format, and chooses 300 DPI
- **THEN** a PNG file is generated with pixel dimensions = (mm_width × 300/25.4) × (mm_height × 300/25.4), maintaining visual fidelity

#### Scenario: Export to PNG at 150 DPI
- **WHEN** user clicks Export, selects PNG format, and chooses 150 DPI
- **THEN** a PNG file is generated at 150 DPI resolution (smaller file size, suitable for screen/web use)

### Requirement: JSON save and load
The system SHALL serialize the complete template document to JSON for saving and loading, supporting both file download and localStorage persistence.

#### Scenario: Save to file
- **WHEN** user clicks Save (or Ctrl+S)
- **THEN** the complete document state is serialized to JSON and downloaded as a .json file with the document name

#### Scenario: Load from file
- **WHEN** user clicks Load and selects a .json file
- **THEN** the file is parsed, validated, and the document state is restored (all pages, elements, settings)

#### Scenario: Auto-save to localStorage
- **WHEN** user makes any change to the document
- **THEN** the document state is debounced (500ms) and saved to localStorage under key "print-template-autosave"

#### Scenario: Restore from localStorage
- **WHEN** the tool loads and localStorage contains "print-template-autosave"
- **THEN** the user is prompted to restore the previous session or start fresh

#### Scenario: Invalid JSON handling
- **WHEN** user attempts to load an invalid or incompatible JSON file
- **THEN** an error message is shown describing the issue, and the current document remains unchanged

### Requirement: Export dialog
The system SHALL display a modal dialog for export configuration, allowing format selection (PDF/PNG), DPI selection (for PNG), and filename input.

#### Scenario: Open export dialog
- **WHEN** user clicks the Export button
- **THEN** a modal appears with: format selector (PDF/PNG), filename input (pre-filled with document name), DPI selector (visible only for PNG), and Export/Cancel buttons

#### Scenario: Export progress
- **WHEN** export is processing (especially for complex templates)
- **THEN** the Export button shows a loading state until the file download triggers
