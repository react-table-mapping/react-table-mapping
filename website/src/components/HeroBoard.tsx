import {useEffect, useState} from 'react';
import {TableMapping} from 'react-table-mapping';
import type {FieldItemInput, Mapping} from 'react-table-mapping';
import 'react-table-mapping/styles';
import {useLibraryTheme} from './useLibraryTheme';
import styles from './HeroBoard.module.css';

const sourceColumns = [{title: 'orders.csv', key: 'name'}];

const targetColumns = [
  {title: 'customers', key: 'name'},
  {title: 'Type', key: 'type'},
];

const typeOptions = [
  {label: 'TEXT', value: 'TEXT'},
  {label: 'NUMBER', value: 'NUMBER'},
  {label: 'DATE', value: 'DATE'},
];

const column = (id: string, value: string) => ({
  id,
  key: id,
  name: {type: 'string' as const, columnKey: 'name', value},
});

const sources = [
  column('order_id', 'order_id'),
  column('customer_email', 'customer_email'),
  column('full_name', 'full_name'),
  column('created_at', 'created_at'),
] satisfies FieldItemInput[];

const target = (id: string, value: string, type: string) => ({
  ...column(id, value),
  type: {type: 'select' as const, columnKey: 'type', value: type, options: typeOptions},
});

const targets = [
  target('id', 'id', 'NUMBER'),
  target('email', 'email', 'TEXT'),
  target('name', 'name', 'TEXT'),
  target('signup_date', 'signup_date', 'DATE'),
] satisfies FieldItemInput[];

const mappings: Mapping[] = [
  {id: 'hero-order_id-id', source: 'order_id', target: 'id'},
  {id: 'hero-customer_email-email', source: 'customer_email', target: 'email'},
];

// On a phone the Type column leaves no room for the names, so the narrow board drops it.
const compactTargetColumns = [{title: 'customers', key: 'name'}];
const compactTargets = targets.map(({type: _type, ...rest}) => rest) satisfies FieldItemInput[];
const COMPACT = '(max-width: 640px)';

function useCompact() {
  const [compact, setCompact] = useState(() => window.matchMedia(COMPACT).matches);
  useEffect(() => {
    const query = window.matchMedia(COMPACT);
    const update = () => setCompact(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return compact;
}

/** The cover's board: real and uncontrolled, so a visitor can draw and remove lines. */
export default function HeroBoard({label}: {label: string}) {
  const theme = useLibraryTheme();
  const compact = useCompact();
  return (
    <div className={theme ? `${styles.board} ${theme}` : styles.board}>
      <TableMapping
        key={compact ? 'compact' : 'full'}
        aria-label={label}
        lineType="bezier"
        sources={sources}
        targets={compact ? compactTargets : targets}
        mappings={mappings}
        sourceColumns={sourceColumns}
        targetColumns={compact ? compactTargetColumns : targetColumns}
      />
    </div>
  );
}
