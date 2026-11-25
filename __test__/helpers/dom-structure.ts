/**
 * DOM structure serializer for the styled layer's frozen public contract.
 *
 * The contract (see docs/specs/2026-08-05-headless-architecture-plan.md, decision D3):
 *   - frozen:  class names, element nesting depth, sibling order, tag names
 *   - allowed: attribute additions (aria-*, data-*, role, type)
 *
 * So this serializer deliberately captures tag + class + hierarchy and nothing else,
 * except the two identifiers spec section 8 promises to preserve (`id` on connectors,
 * `data-testid`). Everything else is omitted so that phase 5's aria/role additions do
 * not show up as false regressions.
 */

/**
 * React's `useId` and Radix's own counter, in every shape they are written.
 *
 * These change with render order, so two tests rendering the same component get different
 * values and a snapshot of them is a snapshot of nothing.
 */
const GENERATED_ID = /:r[0-9a-z]+:|_r_[0-9a-z]+_|«r[0-9a-z]+»/gi;

/** Attribute values that are generated per-render and must never enter a snapshot. */
function isVolatileId(value: string): boolean {
  return value.startsWith('radix-') || (value !== '' && value.replace(GENERATED_ID, '') === '');
}

/**
 * Drops the generated part of an id that also carries a fixed one.
 *
 * An instance-scoped id — `arrowhead-normal-_r_7_` — is half contract and half render order.
 * Keeping the whole thing makes the snapshot unstable; dropping the whole thing loses the
 * evidence that the marker is there at all.
 */
function stableId(value: string): string {
  return value.replace(GENERATED_ID, '*');
}

function classOf(el: Element): string {
  const raw = el.getAttribute('class');
  if (!raw) return '';

  // Normalise whitespace, ordering and repeats so a cosmetic reshuffle is not a diff. A class
  // listed twice matches CSS exactly as it would once, so the repeat carries no contract.
  const names = [...new Set(raw.trim().split(/\s+/).filter(Boolean))].sort();

  return names.length ? `.${names.join('.')}` : '';
}

function describe(el: Element): string {
  const parts = [el.tagName.toLowerCase(), classOf(el)];

  const id = el.getAttribute('id');
  if (id && !isVolatileId(id)) parts.push(`#${stableId(id)}`);

  const testId = el.getAttribute('data-testid');
  if (testId) parts.push(`@${testId}`);

  return parts.join('');
}

/**
 * Render `root` and its descendants as an indented tag/class tree.
 */
export function serializeStructure(root: Element, depth = 0): string {
  const lines = [`${'  '.repeat(depth)}${describe(root)}`];

  for (const child of Array.from(root.children)) {
    lines.push(serializeStructure(child, depth + 1));
  }

  return lines.join('\n');
}
