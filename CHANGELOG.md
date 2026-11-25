# React Table Mapping Changelog

## Unreleased

- **Mapping lines**: The line under the pointer, or the one reached with the keyboard, now shows a red band over the area a click removes. A line pressed with the mouse but not clicked no longer stays highlighted after the pointer leaves, and hovering a line now wins over a line that holds focus. A line no longer stays highlighted when the browser misses the pointer leaving it, and moving the mouse hides the keyboard highlight until a key is pressed on the line.
- **Keyboard**: Confirming a keyboard connection returns focus to the source it started from, instead of leaving it on the target. Pressing Enter again on the source starts the next connection from the target chosen last.
- **Keyboard**: All mapping lines now share a single tab stop. Use the arrow keys, Home and End to move between lines, and Enter, Space, Delete or Backspace to remove one.
- **Keyboard**: Home and End jump to the first and last connector in a column.
- **Keyboard**: Each column's row remove buttons are now a single tab stop. Use the arrow keys, Home and End to move between them, and Enter or Space to remove a row.
- **Keyboard**: Moving focus away from the connectors while a connection is being drawn cancels it.
- **Accessibility**: Mapping lines are no longer hidden from screen readers. Connectors announce what they are already connected to, and row remove buttons have names.
- **Accessibility**: Removing a line or a row keeps focus on the board instead of dropping it to the top of the page.
- **DOM**: The board now renders a visually hidden live region as the last child of its root, which announces connections and removals to screen readers. The arrowhead markers' ids now carry a per-board suffix (`arrowhead-normal-…`, `arrowhead-hover-…`) so two boards on one page no longer share them; styles or scripts that select `#arrowhead-normal` or `#arrowhead-hover` need to match the prefix instead.
- **Layout**: Table columns line up from row to row, and the headers sit over them, even when rows hold content of different widths — a long select option no longer pushes one row's columns out of line with the rest.
- **Mapping lines**: A `straight` line now ends on the target connector like `bezier` and `step` do, instead of 7px short of it, so the arrowhead sits the same distance from the connector whichever type is drawn. `createLinePath` from `/core` is unchanged and still defaults to a 7px inset when called directly.
- **Dark theme**: Row remove buttons are dark in the dark theme, with their icon visible. They used to stay white, because they read colour tokens the stylesheet never defined.
- **Connecting**: Clicking a connector without dragging starts a connection, and clicking a target then completes it — the same as Enter. This is also how screen readers in browse mode activate a connector. A drag still works as before, and the click a drag ends with is ignored. While such a connection waits for its target, pressing a source takes over: it cancels the connection and starts a drag from there. Clicking the same source again turns the connection off, and clicking another source moves it there.

## Version 1.0.3

Released on April 28th, 2026.

- fix Mapping Component Width.

## Version 1.0.2

Released on April 28th, 2026.

- **Bug fix**: Typing rapidly across multiple `input` or `select` cells no longer causes previously-entered values to be wiped. Values are now preserved correctly during concurrent edits.

## Version 1.0.1

Released on December 9th, 2025.

- react version patch update to 19.0.1

## Version 1.0.0

Released on October 14th, 2025.

## Version 1.0.0-beta.16

- **BREAKING CHANGE**: Removed `TableMappingProvider` - now uses parent-controlled state management

- Added ref-based API for imperative method access
- Moved Radix UI components to peerDependencies for better bundle optimization
- Improved performance with reduced internal state management

## Version 1.0.0-beta.11

- `containerHeight` & `containerMinHeight` props have been deprecated.
- Enhanced line hover state for better user experience.
- `disabled` state support for read-only scenarios.
- Fixed mapping ui in multiple TableMapping Component.

## Version 1.0.0-beta.10

- Maximum re-render problem resolved.
- Container height resize issue fixed for better responsiveness.

## Version 1.0.0-beta.9

- Tailwind dependencies completely removed.
- Transitioned to pure CSS for better performance and smaller bundle size.
