import { useState } from 'react';

/**
 * Makes one column's row remove buttons a single tab stop, the way the connectors are.
 *
 * Without it every row's button is a stop of its own, so getting past a column costs one Tab
 * per row. With it the column is one stop; the arrow keys, Home and End walk the buttons, and
 * Enter or Space still removes the row the button belongs to.
 *
 * The stop follows focus, so leaving the column and coming back lands where it was left. When
 * the row that held it is removed, it falls back to the first row — until focus, which removal
 * puts on the next row's button, moves it there.
 */
export function useRemoveButtonStop(ids: string[], table: React.RefObject<HTMLElement | null>) {
  const [held, setHeld] = useState<string | null>(null);
  const stop = held && ids.includes(held) ? held : (ids[0] ?? null);

  /** Matched by attribute rather than a built selector: ids are the consumer's. */
  const focusButton = (id: string) => {
    const button = Array.from(table.current?.querySelectorAll<HTMLElement>('[data-remove-row]') ?? []).find(
      (candidate) => candidate.getAttribute('data-remove-row') === id,
    );

    // Only as far as it takes to bring it into view, as the connectors do: a plain focus()
    // may centre it, jumping the page under the person walking the column.
    button?.focus({ preventScroll: true });
    button?.scrollIntoView?.({ block: 'nearest' });
  };

  return (id: string) => ({
    tabIndex: id === stop ? 0 : -1,
    onFocus: () => setHeld(id),
    onKeyDown: (event: React.KeyboardEvent<HTMLElement>) => {
      // Alt+Arrow is the browser's Back, Ctrl+Home the top of the page: not this column's.
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const index = ids.indexOf(id);
      const next =
        event.key === 'ArrowDown'
          ? ids[(index + 1) % ids.length]
          : event.key === 'ArrowUp'
            ? ids[(index - 1 + ids.length) % ids.length]
            : event.key === 'Home'
              ? ids[0]
              : event.key === 'End'
                ? ids[ids.length - 1]
                : undefined;

      if (next === undefined) return;

      // Otherwise the same key also scrolls the page.
      event.preventDefault();
      focusButton(next);
    },
  });
}
