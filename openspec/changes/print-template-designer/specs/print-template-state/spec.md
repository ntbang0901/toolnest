## ADDED Requirements

### Requirement: Document state management
The system SHALL manage the template document state via a central useReducer + React Context, providing dispatch for all element and canvas operations.

#### Scenario: State initialization
- **WHEN** the designer component mounts
- **THEN** state initializes with a default TemplateDocument containing one page (A4), empty elements array, and default UI state (zoom 100%, select tool active)

#### Scenario: State persistence
- **WHEN** user makes any change to the document
- **THEN** the full document state is serializable to JSON and can be restored from JSON without data loss

### Requirement: Element CRUD operations
The system SHALL support adding, updating, deleting, and duplicating elements via dispatched actions.

#### Scenario: Add element
- **WHEN** ELEMENT_ADD action is dispatched with an element definition
- **THEN** the element is appended to the current page's elements array with a unique nanoid

#### Scenario: Update element
- **WHEN** ELEMENT_UPDATE action is dispatched with element id and partial changes
- **THEN** the specified element's properties are merged with the changes

#### Scenario: Delete elements
- **WHEN** ELEMENT_DELETE action is dispatched with one or more element ids
- **THEN** those elements are removed from the elements array and deselected

#### Scenario: Duplicate elements
- **WHEN** user triggers duplicate (Ctrl+D) on selected elements
- **THEN** new elements are created with identical properties but new ids, offset by 5mm right and 5mm down from originals

### Requirement: Undo/redo history
The system SHALL maintain an undo/redo history stack of up to 50 state snapshots, supporting Ctrl+Z (undo) and Ctrl+Shift+Z / Ctrl+Y (redo).

#### Scenario: Undo after element move
- **WHEN** user moves an element then presses Ctrl+Z
- **THEN** the element returns to its previous position and the action moves to the redo stack

#### Scenario: Redo after undo
- **WHEN** user presses Ctrl+Shift+Z after undoing
- **THEN** the undone action is re-applied and moves back to the past stack

#### Scenario: History limit
- **WHEN** the history stack reaches 50 entries and a new action occurs
- **THEN** the oldest history entry is discarded to maintain the 50-entry limit

#### Scenario: New action clears redo
- **WHEN** user performs a new action after undoing
- **THEN** the redo (future) stack is cleared

### Requirement: Selection state management
The system SHALL track which elements are selected, supporting single select, multi-select (shift-click), and select-all (Ctrl+A).

#### Scenario: Single select
- **WHEN** user clicks an element without holding Shift
- **THEN** that element becomes the sole selected element, previous selection is cleared

#### Scenario: Multi-select via shift-click
- **WHEN** user shift-clicks an element
- **THEN** that element is added to (or removed from) the current selection

#### Scenario: Select all
- **WHEN** user presses Ctrl+A
- **THEN** all visible, unlocked elements on the current page are selected

#### Scenario: Deselect
- **WHEN** user clicks empty canvas area
- **THEN** all elements are deselected

### Requirement: Clipboard operations
The system SHALL support copy (Ctrl+C), cut (Ctrl+X), and paste (Ctrl+V) of selected elements within the same document.

#### Scenario: Copy and paste
- **WHEN** user copies selected elements (Ctrl+C) then pastes (Ctrl+V)
- **THEN** duplicated elements appear offset 5mm from originals with new ids, and become the new selection

#### Scenario: Cut and paste
- **WHEN** user cuts selected elements (Ctrl+X) then pastes (Ctrl+V)
- **THEN** elements are removed from original position and re-inserted at paste offset with same ids

### Requirement: Z-order management
The system SHALL support changing element z-order: bring forward, send backward, bring to front, send to back.

#### Scenario: Bring to front
- **WHEN** user triggers "Bring to Front" on a selected element
- **THEN** the element moves to the highest z-index (last in the elements array, rendered on top)

#### Scenario: Send to back
- **WHEN** user triggers "Send to Back" on a selected element
- **THEN** the element moves to the lowest z-index (first in the elements array, rendered behind all others)
