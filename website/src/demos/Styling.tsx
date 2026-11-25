import { useState } from 'react';
import { TableMapping } from 'react-table-mapping';
import type { FieldItemInput, LineType, Mapping } from 'react-table-mapping';
import 'react-table-mapping/styles';

const sourceColumns = [{ title: 'Name', key: 'name' }];
const targetColumns = [{ title: 'Name', key: 'name' }];

const initialSources = [
  { id: 'source-0', key: 'source-0', name: { type: 'string', columnKey: 'name', value: 'USER_ID' } },
  { id: 'source-1', key: 'source-1', name: { type: 'string', columnKey: 'name', value: 'EMAIL' } },
  { id: 'source-2', key: 'source-2', name: { type: 'string', columnKey: 'name', value: 'STATUS' } },
] satisfies FieldItemInput[];

const initialTargets = [
  { id: 'target-0', key: 'target-0', name: { type: 'string', columnKey: 'name', value: 'id' } },
  { id: 'target-1', key: 'target-1', name: { type: 'string', columnKey: 'name', value: 'email' } },
  { id: 'target-2', key: 'target-2', name: { type: 'string', columnKey: 'name', value: 'status' } },
] satisfies FieldItemInput[];

const initialMappings: Mapping[] = [
  { id: 'mapping-source-0-target-1', source: 'source-0', target: 'target-1' },
  { id: 'mapping-source-1-target-0', source: 'source-1', target: 'target-0' },
];

export default function Styling() {
  const [lineType, setLineType] = useState<LineType>('bezier');
  const [lineColor, setLineColor] = useState('#009bff');
  const [lineWidth, setLineWidth] = useState(1.7);
  const [mappings, setMappings] = useState(initialMappings);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 12 }}>
        <label>
          lineType{' '}
          <select value={lineType} onChange={(e) => setLineType(e.target.value as LineType)}>
            <option value="bezier">bezier</option>
            <option value="straight">straight</option>
            <option value="step">step</option>
          </select>
        </label>
        <label>
          lineColor <input type="color" value={lineColor} onChange={(e) => setLineColor(e.target.value)} />
        </label>
        <label>
          lineWidth{' '}
          <input
            type="range"
            min={1}
            max={6}
            step={0.1}
            value={lineWidth}
            onChange={(e) => setLineWidth(Number(e.target.value))}
          />
        </label>
      </div>
      <TableMapping
        lineType={lineType}
        lineColor={lineColor}
        lineWidth={lineWidth}
        sourceColumns={sourceColumns}
        targetColumns={targetColumns}
        sources={initialSources}
        targets={initialTargets}
        mappings={mappings}
        onMappingChange={(next) => setMappings(next.mappings)}
      />
    </div>
  );
}
