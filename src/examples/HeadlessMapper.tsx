import { useCallback, useMemo, useRef, useState } from 'react';

import { useConnectorProps } from '@/headless/internal/useConnectorProps';
import { useConnectorRegistry } from '@/headless/internal/useConnectorRegistry';
import { useGeometry } from '@/headless/internal/useGeometry';
import { usePointerDrag } from '@/headless/internal/usePointerDrag';
import useTableMapping from '@/hooks/useTableMapping';
import type { FieldItem, FieldItemInput, Mapping } from '@/types/table-mapping';

/**
 * The same field-mapping UI as `TableMapping`, built from the headless hooks and nothing else.
 *
 * Nothing here is imported from `components/`, and `lib/system.css` is never loaded — every
 * element, class and colour below belongs to this file. What the library contributes is the
 * state, the measuring and the gesture; what it renders is up to the caller. That division is
 * the whole point of the headless layer, and this file is what it looks like when taken up.
 *
 * Deliberately plain: a `<ul>` on each side and one `<svg>` between them. A real consumer would
 * bring their own table, their own virtualiser, their own design system — none of which the
 * hooks below care about.
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
  board: { position: 'relative', display: 'flex', gap: 160, alignItems: 'flex-start' },
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
  },
  canvas: { position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' },
} satisfies Record<string, React.CSSProperties>;

export default function HeadlessMapper() {
  // ① State. The same hook the styled component uses — it owns the rows and the mappings and
  //    reports every change, and knows nothing about how any of it is displayed.
  const mapping = useTableMapping({
    sources: SOURCES,
    targets: TARGETS,
    mappings: INITIAL_MAPPINGS,
    onStateChange: ({ action }) => setLastAction(action.type),
  });

  const [lastAction, setLastAction] = useState<string>('—');

  // ② The element every coordinate is measured against. Both the lines and the drag read it,
  //    so they share one origin; put it on whichever element the two tables sit inside.
  const boardRef = useRef<HTMLDivElement>(null);

  // ③ Which DOM node belongs to which connector. Filled in by the ref the getter hands out,
  //    which is why nothing below has to be findable by id or live in a known container.
  const registry = useConnectorRegistry();

  // ④ Where each line runs, recomputed when anything moves. `lines` is empty on the first
  //    render — measuring happens after the commit — so a first paint with no lines is normal.
  const { lines } = useGeometry({
    rootRef: boardRef,
    registry,
    mappings: mapping.mappings,
    lineType: 'bezier',
  });

  const targetIds = useMemo(() => mapping.targetFields.map((field) => field.id), [mapping.targetFields]);

  // ⑤ The gesture. It only reports where a drag landed; whether that becomes a mapping is
  //    decided here — this one refuses a duplicate, and a consumer could ask, validate, or
  //    replace an existing mapping instead.
  const { drag, sourceHandlers } = usePointerDrag({
    rootRef: boardRef,
    registry,
    targetIds,
    onConnect: (sourceId, targetId) => {
      const exists = mapping.mappings.some((line) => line.source === sourceId && line.target === targetId);

      if (!exists) mapping.addMapping(sourceId, targetId);
    },
  });

  // ⑥ The props a connector element needs. Everything above meets here.
  const getConnectorProps = useConnectorProps({ registry, sourceHandlers });

  // A ref of this component's own, handed to the getter rather than written on the tag — the
  // getter merges it with the registration instead of replacing it. Writing `ref` on the
  // element directly would drop the registration and the lines to that row would stop being
  // drawn, with nothing reported.
  const firstConnectorRef = useRef<HTMLElement>(null);

  const flashFirstConnector = useCallback(() => {
    firstConnectorRef.current?.animate([{ transform: 'scale(2.2)' }, { transform: 'scale(1)' }], 400);
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <button type="button" onClick={() => mapping.sameLineMapping()}>
          Pair by position
        </button>
        <button type="button" onClick={() => mapping.clearMappings()}>
          Clear
        </button>
        <button type="button" onClick={flashFirstConnector}>
          Flash first connector
        </button>
        <span style={{ color: '#6b7280' }}>
          {mapping.mappings.length} mapped · last action: {lastAction}
        </span>
      </div>

      <div ref={boardRef} style={styles.board}>
        <ul style={styles.column}>
          {mapping.sourceFields.map((field, index) => (
            <li key={field.id} style={styles.row}>
              {labelOf(field)}
              <button
                {...getConnectorProps({
                  side: 'source',
                  id: field.id,
                  ref: index === 0 ? firstConnectorRef : undefined,
                })}
                aria-label={`Connect ${labelOf(field)}`}
                style={{ ...styles.connector, right: -7, transform: 'translateY(-50%)', touchAction: 'none' }}
              />
            </li>
          ))}
        </ul>

        <ul style={styles.column}>
          {mapping.targetFields.map((field) => (
            <li key={field.id} style={styles.row}>
              {labelOf(field)}
              <button
                {...getConnectorProps({ side: 'target', id: field.id })}
                aria-label={`Connect to ${labelOf(field)}`}
                style={{
                  ...styles.connector,
                  left: -7,
                  transform: 'translateY(-50%)',
                  background: drag.status === 'pointer' && drag.hoveredTargetId === field.id ? '#16a34a' : '#2f6fed',
                }}
              />
            </li>
          ))}
        </ul>

        {/* The canvas ignores the pointer so the rows underneath stay clickable; each line
            takes its own hits back along the stroke. */}
        <svg style={styles.canvas}>
          {lines.map((line) => (
            <g key={line.id}>
              <path d={line.path} stroke="#2f6fed" strokeWidth={1.7} fill="none" />
              <path
                d={line.path}
                stroke="transparent"
                strokeWidth={12}
                fill="none"
                style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
                onClick={() => mapping.removeMapping(line.id)}
              />
            </g>
          ))}

          {drag.status === 'pointer' && (
            <path
              d={`M ${drag.origin.x} ${drag.origin.y} C ${drag.origin.x} ${drag.origin.y}, ${drag.current.x - 100} ${drag.current.y}, ${drag.current.x} ${drag.current.y}`}
              stroke="#2f6fed"
              strokeWidth={1.7}
              strokeDasharray="5,5"
              fill="none"
            />
          )}
        </svg>
      </div>
    </div>
  );
}
