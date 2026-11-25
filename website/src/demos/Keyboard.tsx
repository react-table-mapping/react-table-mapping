import { useState } from 'react';
import { TableMapping } from 'react-table-mapping';
import type { FieldItemInput, Mapping } from 'react-table-mapping';
import 'react-table-mapping/styles';

const columns = [{ title: 'Name', key: 'name' }];

const row = (id: string, value: string) => ({ id, key: id, name: { type: 'string' as const, columnKey: 'name', value } });

const sources = [
  row('source-0', 'USER_ID'),
  row('source-1', 'EMAIL'),
  row('source-2', 'CREATED_AT'),
  row('source-3', 'STATUS'),
] satisfies FieldItemInput[];

const targets = [row('target-0', 'id'), row('target-1', 'email'), row('target-2', 'created')] satisfies FieldItemInput[];

const initialMappings: Mapping[] = [{ id: 'mapping-source-0-target-0', source: 'source-0', target: 'target-0' }];

export default function Keyboard() {
  const [mappings, setMappings] = useState(initialMappings);

  return (
    <>
      <p>Tab into the board, then press Enter on a source connector to start connecting.</p>
      <TableMapping
        aria-label="Keyboard demo"
        sourceColumns={columns}
        targetColumns={columns}
        sources={sources}
        targets={targets}
        mappings={mappings}
        onMappingChange={(next) => setMappings(next.mappings)}
      />
    </>
  );
}
