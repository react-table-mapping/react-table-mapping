import { useCallback, useRef, useState } from 'react';

import { MappingCanvas, useMappingBoard } from '@/headless';
import type { FieldItem, FieldItemInput, Mapping } from '@/types/table-mapping';

/**
 * The same field-mapping UI as `TableMapping`, built on `react-table-mapping/headless`.
 *
 * Nothing here comes from `components/`, and `lib/system.css` is never loaded — every element,
 * class and colour below belongs to this file. What the library contributes is the state, the
 * measuring and the gestures; what it renders is up to the caller.
 *
 * Deliberately plain: a `<ul>` on each side and one canvas between them. A real consumer would
 * bring their own table, their own virtualiser, their own design system — none of which the
 * hook cares about.
 */

const SOURCES: FieldItemInput[] = [
  { id: 'source-1', key: '1', name: 'customer_id' },
  { id: 'source-2', key: '2', name: 'first_name' },
  { id: 'source-3', key: '3', name: 'last_name' },
  { id: 'source-4', key: '4', name: 'signup_date' },
];

const TARGETS: FieldItemInput[] = [
  { id: 'target-1', key: '1', name: 'id' },
  { id: 'target-2', key: '2', name: 'full_name' },
  { id: 'target-3', key: '3', name: 'created_at' },
];

const INITIAL_MAPPINGS: Mapping[] = [{ id: 'mapping-source-1-target-1', source: 'source-1', target: 'target-1' }];

/** These rows keep their label in a plain `name` string, so reading one is this short. */
const labelOf = (field: FieldItem) => String(field.name ?? field.key);

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 16, padding: 24, fontFamily: 'system-ui, sans-serif' },
  toolbar: { display: 'flex', gap: 8, alignItems: 'center' },
  // Only as wide as the two columns and the gap between them. The root is the frame every
  // anchor is measured against, so letting it stretch to the full page would put a few hundred
  // pixels of empty board to the right of the last column — nothing to connect to, and a drag
  // preview that trails off into it.
  board: { display: 'flex', gap: 160, alignItems: 'flex-start', width: 'fit-content' },
  column: { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 8, width: 200 },
  row: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    height: 40,
    padding: '0 12px',
    border: '1px solid #d7dae5',
    borderRadius: 8,
    background: '#fff',
  },
  connector: {
    position: 'absolute',
    top: '50%',
    width: 14,
    height: 14,
    padding: 0,
    borderRadius: '50%',
    border: '2px solid #fff',
    background: '#2f6fed',
    boxShadow: '0 0 0 1px #b9c6e8',
    cursor: 'pointer',
    appearance: 'none',
    transform: 'translateY(-50%)',
    touchAction: 'none',
  },
  srOnly: {
    position: 'absolute',
    width: 1,
    height: 1,
    overflow: 'hidden',
    clip: 'rect(0 0 0 0)',
    whiteSpace: 'nowrap',
  },
} satisfies Record<string, React.CSSProperties>;

/** What a connector looks like right now, given what the board says about it. */
const connectorTone = (props: { 'data-connecting'?: true; 'data-candidate'?: true }) => {
  if (props['data-connecting']) return '#f59e0b';
  if (props['data-candidate']) return '#16a34a';

  return '#2f6fed';
};

/** Where a skip link lands. The demo page's links point at this and at the styled board. */
export const HEADLESS_BOARD_ID = 'headless-board';

export default function HeadlessMapper() {
  const [lastAction, setLastAction] = useState('—');

  // A ref of this component's own, handed to the getter rather than written on the tag — the
  // getter merges it with the registration instead of replacing it. Writing `ref` on the
  // element directly would drop the registration and the lines to that row would stop being
  // drawn, with nothing reported.
  const firstConnectorRef = useRef<HTMLElement>(null);

  const board = useMappingBoard({
    sources: SOURCES,
    targets: TARGETS,
    mappings: INITIAL_MAPPINGS,
    lineType: 'bezier',
    onMappingChange: ({ action }) => setLastAction(action.type),
    // What a row is called when it is read out, and what the connector is named after.
    describeField: (field) => labelOf(field),
    // What a line is called, and what the list at the bottom shows.
    describeMapping: (mapping, { sources, targets }) => {
      const name = (fields: FieldItem[], id: string) => {
        const field = fields.find((candidate) => candidate.id === id);

        return field ? labelOf(field) : id;
      };

      return `${name(sources, mapping.source)} to ${name(targets, mapping.target)}`;
    },
  });

  const flashFirstConnector = useCallback(() => {
    firstConnectorRef.current?.animate([{ transform: 'scale(2.2)' }, { transform: 'scale(1)' }], 400);
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <button type="button" onClick={() => board.actions.sameLineMapping()}>
          Pair by position
        </button>
        <button type="button" onClick={() => board.actions.clearMappings()}>
          Clear
        </button>
        <button type="button" onClick={flashFirstConnector}>
          Flash first connector
        </button>
        <span style={{ color: '#6b7280' }}>
          {board.mappings.length} mapped · last action: {lastAction}
        </span>
      </div>

      {/* Named apart from the styled board: two landmarks with one name are two entries a
          screen reader cannot tell from each other. */}
      <div
        {...board.getRootProps({ label: 'Field mapping, built on headless' })}
        id={HEADLESS_BOARD_ID}
        style={{ ...styles.board, position: 'relative' }}
      >
        {/* A toolbar rather than a plain list: that is the role a screen reader hands the
            arrow keys to. Under a bare <ul> the reader keeps them for its own navigation and
            the connectors cannot be walked at all. */}
        <ul {...board.getConnectorGroupProps({ side: 'source', label: 'Source fields' })} style={styles.column}>
          {board.sources.map((field, index) => {
            const props = board.getConnectorProps({
              side: 'source',
              id: field.id,
              ref: index === 0 ? firstConnectorRef : undefined,
            });

            return (
              <li key={field.id} style={styles.row}>
                {labelOf(field)}
                <button {...props} style={{ ...styles.connector, right: -7, background: connectorTone(props) }} />
              </li>
            );
          })}
        </ul>

        <ul {...board.getConnectorGroupProps({ side: 'target', label: 'Target fields' })} style={styles.column}>
          {board.targets.map((field) => {
            const props = board.getConnectorProps({ side: 'target', id: field.id });

            return (
              <li key={field.id} style={styles.row}>
                {labelOf(field)}
                <button
                  {...props}
                  style={{
                    ...styles.connector,
                    left: -7,
                    // Green while the keyboard is standing on it, or while a drag hovers it.
                    background: board.dragLine?.hoveredTargetId === field.id ? '#16a34a' : connectorTone(props),
                  }}
                />
              </li>
            );
          })}
        </ul>

        <MappingCanvas {...board.getCanvasProps()} markers={board.markers} lineColor="#2f6fed" hoverLineColor="#1d4ed8">
          {board.lines.map((line) => (
            <g key={line.id} {...board.getMappingLineProps({ id: line.id })}>
              <path d={line.path} stroke="#2f6fed" strokeWidth={1.7} fill="none" markerEnd={board.markers.normal} />
              {/* A wider invisible stroke, so the line is not a one-pixel target. */}
              <path d={line.path} stroke="transparent" strokeWidth={12} fill="none" />
            </g>
          ))}

          {board.dragLine && (
            <path
              d={`M ${board.dragLine.from.x} ${board.dragLine.from.y} C ${board.dragLine.from.x} ${board.dragLine.from.y}, ${board.dragLine.to.x - 100} ${board.dragLine.to.y}, ${board.dragLine.to.x} ${board.dragLine.to.y}`}
              stroke="#2f6fed"
              strokeWidth={1.7}
              strokeDasharray="5,5"
              fill="none"
            />
          )}
        </MappingCanvas>
      </div>

      {/* The drawing is hidden from screen readers, so the connections are given as text as
          well. Someone who cannot see the curves still gets the whole picture, in a list they
          can move through. */}
      <ul aria-label="Current connections" style={styles.srOnly}>
        {board.mappingDescriptions.map((entry) => (
          <li key={entry.id}>
            {entry.label}
            <button {...board.getRemoveMappingProps({ id: entry.id, standalone: true })}>Remove</button>
          </li>
        ))}
      </ul>

      {/* Announced as it changes, so a screen reader hears the result of a connection it
          cannot see being drawn. Always in the DOM: a live region added at the moment it has
          something to say is often not announced at all. */}
      <div role="status" aria-live="polite" aria-atomic style={styles.srOnly}>
        {board.announcement}
      </div>
    </div>
  );
}
