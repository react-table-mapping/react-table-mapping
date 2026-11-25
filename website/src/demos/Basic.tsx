import { useState } from 'react';
import { TableMapping } from 'react-table-mapping';
import type { FieldItemInput, Mapping } from 'react-table-mapping';
import 'react-table-mapping/styles';

const sourceColumns = [{ title: 'Name', key: 'name' }];
const targetColumns = [
  { title: 'Name', key: 'name' },
  { title: 'Type', key: 'type' },
];

const initialSources = [
  { id: 'source-0', key: 'source-0', name: { type: 'string', columnKey: 'name', value: 'USER_ID' } },
  { id: 'source-1', key: 'source-1', name: { type: 'string', columnKey: 'name', value: 'EMAIL' } },
  { id: 'source-2', key: 'source-2', name: { type: 'string', columnKey: 'name', value: 'CREATED_AT' } },
  { id: 'source-3', key: 'source-3', name: { type: 'string', columnKey: 'name', value: 'STATUS' } },
] satisfies FieldItemInput[];

const typeOptions = [
  { label: 'TEXT', value: 'TEXT' },
  { label: 'NUMBER', value: 'NUMBER' },
];

const initialTargets = [
  {
    id: 'target-0',
    key: 'target-0',
    name: { type: 'string', columnKey: 'name', value: 'id' },
    type: { type: 'select', columnKey: 'type', defaultValue: 'NUMBER', options: typeOptions },
  },
  {
    id: 'target-1',
    key: 'target-1',
    name: { type: 'string', columnKey: 'name', value: 'email' },
    type: { type: 'select', columnKey: 'type', defaultValue: 'TEXT', options: typeOptions },
  },
  {
    id: 'target-2',
    key: 'target-2',
    name: { type: 'string', columnKey: 'name', value: 'created' },
    type: { type: 'select', columnKey: 'type', defaultValue: 'TEXT', options: typeOptions },
  },
] satisfies FieldItemInput[];

const initialMappings: Mapping[] = [{ id: 'mapping-source-0-target-0', source: 'source-0', target: 'target-0' }];

export default function Basic() {
  const [mappings, setMappings] = useState(initialMappings);

  return (
    <TableMapping
      lineType="bezier"
      sourceColumns={sourceColumns}
      targetColumns={targetColumns}
      sources={initialSources}
      targets={initialTargets}
      mappings={mappings}
      onMappingChange={(next) => setMappings(next.mappings)}
    />
  );
}
