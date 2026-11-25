import { useState } from 'react';
import { TableMapping } from 'react-table-mapping';
import type { FieldItemInput, Mapping, NotifyAction } from 'react-table-mapping';
import 'react-table-mapping/styles';

const columns = [{ title: 'Name', key: 'name' }];

const sources = [
  { id: 'source-0', key: 'source-0', name: { type: 'string', columnKey: 'name', value: 'USER_ID' } },
  { id: 'source-1', key: 'source-1', name: { type: 'string', columnKey: 'name', value: 'EMAIL' } },
  { id: 'source-2', key: 'source-2', name: { type: 'string', columnKey: 'name', value: 'CREATED_AT' } },
] satisfies FieldItemInput[];

const targets = [
  { id: 'target-0', key: 'target-0', name: { type: 'string', columnKey: 'name', value: 'id' } },
  { id: 'target-1', key: 'target-1', name: { type: 'string', columnKey: 'name', value: 'email' } },
  { id: 'target-2', key: 'target-2', name: { type: 'string', columnKey: 'name', value: 'created' } },
] satisfies FieldItemInput[];

const initialMappings: Mapping[] = [{ id: 'mapping-source-0-target-0', source: 'source-0', target: 'target-0' }];

export default function Controlled() {
  const [mappings, setMappings] = useState(initialMappings);
  const [action, setAction] = useState<NotifyAction | null>(null);

  return (
    <>
      <TableMapping
        sourceColumns={columns}
        targetColumns={columns}
        sources={sources}
        targets={targets}
        mappings={mappings}
        onMappingChange={(next) => {
          setMappings(next.mappings);
          setAction(next.action);
        }}
      />
      <pre>{JSON.stringify({ action, mappings }, null, 2)}</pre>
    </>
  );
}
