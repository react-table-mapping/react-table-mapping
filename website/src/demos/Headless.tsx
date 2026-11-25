import { useRef, useState } from 'react';
import { MappingCanvas, useMappingBoard } from 'react-table-mapping/headless';
import type { FieldItem, FieldItemInput, Mapping } from 'react-table-mapping/headless';

// Nothing below comes from the styled layer, and no stylesheet is imported: every element,
// class and colour belongs to this file.

const sources: FieldItemInput[] = [
  { id: 'source-1', key: '1', name: 'customer_id' },
  { id: 'source-2', key: '2', name: 'first_name' },
  { id: 'source-3', key: '3', name: 'last_name' },
  { id: 'source-4', key: '4', name: 'signup_date' },
];

const targets: FieldItemInput[] = [
  { id: 'target-1', key: '1', name: 'id' },
  { id: 'target-2', key: '2', name: 'full_name' },
  { id: 'target-3', key: '3', name: 'created_at' },
];

const initialMappings: Mapping[] = [{ id: 'mapping-source-1-target-1', source: 'source-1', target: 'target-1' }];

const labelOf = (field: FieldItem) => String(field.name ?? field.key);

const styles = {
  page: { display: 'flex', flexDirection: 'column', gap: 16, padding: 24, fontFamily: 'system-ui, sans-serif' },
  toolbar: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' },
  board: { display: 'flex', gap: 160, alignItems: 'flex-start', width: 'fit-content', position: 'relative' },
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
    color: '#1f2937',
  },
  connector: {
    position: 'absolute',
    top: '50%',
    width: 14,
    height: 14,
    padding: 0,
    borderRadius: '50%',
    border: '2px solid #fff',
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

const connectorTone = (props: { 'data-connecting'?: true; 'data-candidate'?: true }) => {
  if (props['data-connecting']) return '#f59e0b';
  if (props['data-candidate']) return '#16a34a';

  return '#2f6fed';
};

export default function Headless() {
  const [lastAction, setLastAction] = useState('none');

  // Our own ref goes through the getter, which merges it with the library's registration.
  const firstConnectorRef = useRef<HTMLElement>(null);

  const board = useMappingBoard({
    sources,
    targets,
    mappings: initialMappings,
    lineType: 'bezier',
    onMappingChange: ({ action }) => setLastAction(action.type),
    describeField: (field) => labelOf(field),
    describeMapping: (mapping, context) => {
      const name = (fields: FieldItem[], id: string) => {
        const field = fields.find((candidate) => candidate.id === id);

        return field ? labelOf(field) : id;
      };

      return `${name(context.sources, mapping.source)} to ${name(context.targets, mapping.target)}`;
    },
  });

  return (
    <div style={styles.page}>
      <div style={styles.toolbar}>
        <button type="button" onClick={() => board.actions.sameLineMapping()}>
          Pair by position
        </button>
        <button type="button" onClick={() => board.actions.clearMappings()}>
          Clear
        </button>
        <button
          type="button"
          onClick={() => firstConnectorRef.current?.animate([{ transform: 'scale(2.2)' }, { transform: 'scale(1)' }], 400)}
        >
          Flash first connector
        </button>
        <span style={{ color: '#6b7280' }}>
          {board.mappings.length} mapped, last action: {lastAction}
        </span>
      </div>

      <div {...board.getRootProps({ label: 'Field mapping, built on headless' })} style={styles.board}>
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

      {/* The connections as text, for readers that cannot see the lines. */}
      <ul aria-label="Current connections" style={styles.srOnly}>
        {board.mappingDescriptions.map((entry) => (
          <li key={entry.id}>
            {entry.label}
            <button {...board.getRemoveMappingProps({ id: entry.id, standalone: true })}>Remove</button>
          </li>
        ))}
      </ul>

      <div role="status" aria-live="polite" aria-atomic style={styles.srOnly}>
        {board.announcement}
      </div>
    </div>
  );
}
