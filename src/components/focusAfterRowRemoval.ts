/**
 * Puts focus somewhere sensible after a row's remove button took itself out of the page.
 *
 * Next row's remove button, else — `next` is null when the last row went — that side's
 * connector stop, else the board itself. The board root is focusable (`tabIndex={-1}`), so
 * the chain always ends somewhere other than the top of the document.
 *
 * Matched by attribute rather than a built selector: ids are the consumer's and may hold
 * characters a selector would need escaped.
 */
export function focusAfterRowRemoval(table: HTMLElement | null, next: string | null, side: 'source' | 'target') {
  if (!table) return;

  const button = next
    ? Array.from(table.querySelectorAll<HTMLElement>('[data-remove-row]')).find(
        (candidate) => candidate.getAttribute('data-remove-row') === next,
      )
    : undefined;

  const target =
    button ??
    table.querySelector<HTMLElement>(`.${side}-connector[tabindex="0"]`) ??
    table.closest<HTMLElement>('.mapping-container');

  target?.focus();
}
