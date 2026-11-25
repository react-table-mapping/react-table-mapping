import { useRef, useState } from 'react';

import TableMapping from '@/components/TableMapping';
import HeadlessMapper, { HEADLESS_BOARD_ID } from '@/examples/HeadlessMapper';
import type {
  FieldItemInput,
  LineType,
  Mapping,
  TableMappingRef,
  TableMappingStateWithAction,
} from '@/types/table-mapping';

const btnStyle: React.CSSProperties = {
  padding: '8px 16px',
  borderRadius: '4px',
  border: '1px solid #ccc',
  cursor: 'pointer',
};

const STYLED_BOARD_ID = 'styled-board';

/**
 * Out of the way until it has focus, and in front of everything once it does.
 *
 * A skip link that is always visible is a design decision most pages do not want; one that is
 * `display: none` is not focusable and so never appears at all. Moving it off-screen and back
 * is the arrangement that satisfies both.
 */
const skipLinkStyle: React.CSSProperties = {
  position: 'absolute',
  left: 8,
  top: -60,
  zIndex: 100,
  padding: '10px 16px',
  background: '#151826',
  color: '#fff',
  borderRadius: 6,
  textDecoration: 'none',
  font: '500 14px system-ui',
  transition: 'top 120ms ease-out',
};

/**
 * The half of a skip link a component cannot provide.
 *
 * It has to sit before everything it skips past, which is the page's business rather than the
 * board's. What the board provides is somewhere to land — a landmark that takes focus, named
 * by `aria-label` and addressed by `id`.
 *
 * Measured on this page: eight tab presses to reach the first connector, or one.
 */
function SkipLinks() {
  return (
    <nav aria-label="Skip links" style={{ position: 'relative', height: 0 }}>
      {[
        [STYLED_BOARD_ID, 'Skip to the styled board'],
        [HEADLESS_BOARD_ID, 'Skip to the headless board'],
      ].map(([id, label], index) => (
        <a
          key={id}
          href={`#${id}`}
          style={skipLinkStyle}
          onFocus={(event) => {
            event.currentTarget.style.top = `${8 + index * 48}px`;
          }}
          onBlur={(event) => {
            event.currentTarget.style.top = '-60px';
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}

const sourceColumns = [{ title: 'Name', key: 'name' }];

const targetColumns = [
  { title: 'Name', key: 'name' },
  { title: 'Data', key: 'data' },
  { title: 'Function', key: 'func' },
];

const initialSourceFields = [
  { name: { type: 'string', columnKey: 'name', value: 'KEY' }, id: '0', key: '0' },
  { name: { type: 'string', columnKey: 'name', value: 'COL1' }, id: '1', key: '1' },
  { name: { type: 'string', columnKey: 'name', value: 'COL2' }, id: '2', key: '2' },
  { name: { type: 'string', columnKey: 'name', value: 'COL3' }, id: '3', key: '3' },
  { name: { type: 'string', columnKey: 'name', value: 'COL4' }, id: '4', key: '4' },
] satisfies FieldItemInput[];

const initialTargetFields = [
  {
    id: '0',
    key: '0',
    name: { type: 'input', columnKey: 'name', value: 'KEY', onChange: (v) => console.log('target name changed:', v) },
    data: { type: 'input', columnKey: 'data', value: '', onChange: (v) => console.log('target data changed:', v) },
    func: {
      type: 'select',
      columnKey: 'func',
      value: 'NONE',
      options: [
        { label: 'NONE', value: 'NONE' },
        { label: 'CONCAT', value: 'CONCAT' },
        { label: 'SUM', value: 'SUM' },
      ],
      onChange: (v) => console.log('target func changed:', v),
    },
  },
  {
    id: '1',
    key: '1',
    name: {
      type: 'input',
      columnKey: 'name',
      value: 'CONCAT_COL',
      onChange: (v) => console.log('target name changed:', v),
    },
    data: {
      type: 'input',
      columnKey: 'data',
      value: 'CONCAT(COL1,COL2)',
      onChange: (v) => console.log('target data changed:', v),
    },
    func: {
      type: 'select',
      columnKey: 'func',
      value: 'CONCAT',
      options: [
        { label: 'NONE', value: 'NONE' },
        { label: 'CONCAT', value: 'CONCAT' },
        { label: 'SUM', value: 'SUM' },
      ],
      onChange: (v) => console.log('target func changed:', v),
    },
  },
  {
    id: '2',
    key: '2',
    name: {
      type: 'input',
      columnKey: 'name',
      value: 'SUM_COL',
      onChange: (v) => console.log('target name changed:', v),
    },
    data: {
      type: 'input',
      columnKey: 'data',
      value: 'SUM(,)',
      onChange: (v) => console.log('target data changed:', v),
    },
    func: {
      type: 'select',
      columnKey: 'func',
      value: 'SUM',
      options: [
        { label: 'NONE', value: 'NONE' },
        { label: 'CONCAT', value: 'CONCAT' },
        { label: 'SUM', value: 'SUM' },
      ],
      onChange: (v) => console.log('target func changed:', v),
    },
  },
] satisfies FieldItemInput[];

const initialMappings: Mapping[] = [{ id: 'mapping-4-2', source: '4', target: '2' }];

function App() {
  const tableMethodRef = useRef<TableMappingRef | null>(null);

  const [sources, setSources] = useState<FieldItemInput[]>(initialSourceFields);
  const [targets, setTargets] = useState<FieldItemInput[]>(initialTargetFields);
  const [mappings, setMappings] = useState<Mapping[]>(initialMappings);
  const [lineType, setLineType] = useState<LineType>('bezier');
  const [disabled, setDisabled] = useState(false);

  const handleMappingChange = (stateWithAction: TableMappingStateWithAction) => {
    console.info('Action:', stateWithAction.action.type);
    console.info('Payload:', stateWithAction.action.payload);
    console.info('New state:', stateWithAction);
    setSources(stateWithAction.sources);
    setTargets(stateWithAction.targets);
    setMappings(stateWithAction.mappings);
  };

  const handleAddSource = () => {
    const newId = `source-${Date.now()}`;
    tableMethodRef.current?.appendSource({
      name: { type: 'string', columnKey: 'name', value: `NEW_${newId.slice(-3).toUpperCase()}` },
      id: newId,
      key: newId,
    });
  };

  const handleAddTarget = () => {
    const newId = `target-${Date.now()}`;
    tableMethodRef.current?.appendTarget({
      name: {
        type: 'input',
        columnKey: 'name',
        value: `NEW_${newId.slice(-3).toUpperCase()}`,
        onChange: (v) => console.log('New target name changed:', v),
      },
      data: {
        type: 'input',
        columnKey: 'data',
        value: '',
        onChange: (v) => console.log('New target data changed:', v),
      },
      func: {
        type: 'select',
        columnKey: 'func',
        value: 'NONE',
        options: [
          { label: 'NONE', value: 'NONE' },
          { label: 'CONCAT', value: 'CONCAT' },
          { label: 'SUM', value: 'SUM' },
        ],
        onChange: (v) => console.log('New target func changed:', v),
      },
      id: newId,
      key: newId,
    });
  };

  return (
    <div>
      <SkipLinks />

      <div
        style={{
          padding: '20px 20px 0',
          marginBottom: '16px',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          style={{ ...btnStyle, background: '#f5f5f5' }}
          onClick={() => console.log('ref:', tableMethodRef.current)}
        >
          Console Log Ref
        </button>
        <button
          style={{ ...btnStyle, background: '#f5f5f5' }}
          onClick={() => tableMethodRef.current?.sameLineMapping()}
        >
          Same Line Mapping
        </button>
        <button
          style={{ ...btnStyle, background: '#f5f5f5' }}
          onClick={() => tableMethodRef.current?.sameNameMapping('name')}
        >
          Same Name Mapping
        </button>
        <button style={{ ...btnStyle, background: '#ffe6e6' }} onClick={() => tableMethodRef.current?.clearMappings()}>
          Clear Mappings
        </button>
        <button style={{ ...btnStyle, background: '#e6f3ff' }} onClick={handleAddSource}>
          Add Source
        </button>
        <button style={{ ...btnStyle, background: '#e6ffe6' }} onClick={handleAddTarget}>
          Add Target
        </button>

        <select
          value={lineType}
          onChange={(e) => setLineType(e.target.value as LineType)}
          style={{ ...btnStyle, background: '#fff' }}
        >
          <option value="bezier">Bezier</option>
          <option value="straight">Straight</option>
          <option value="step">Step</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
          <input type="checkbox" checked={disabled} onChange={(e) => setDisabled(e.target.checked)} />
          Disabled
        </label>
      </div>

      <div style={{ height: '400px', width: '100%', margin: '0 auto' }}>
        <TableMapping
          id={STYLED_BOARD_ID}
          ref={tableMethodRef}
          sources={sources}
          targets={targets}
          mappings={mappings}
          lineType={lineType}
          disabled={disabled}
          sourceColumns={sourceColumns}
          targetColumns={targetColumns}
          onMappingChange={handleMappingChange}
        />
      </div>

      {/* The same board a second time, built on `/headless` instead. Rendered together on
          purpose: two instances on one page is the case that used to make both share one
          arrowhead, and having it on the dev page means that class of bug shows up while
          working rather than in a consumer's app. */}
      <section style={{ borderTop: '1px solid #e4e6fa', marginTop: 32 }}>
        <h2 style={{ font: '600 14px system-ui', color: '#676a7b', padding: '20px 24px 0', margin: 0 }}>
          Built on /headless — same behaviour, none of the styling
        </h2>
        <HeadlessMapper />
      </section>
    </div>
  );
}

export default App;
