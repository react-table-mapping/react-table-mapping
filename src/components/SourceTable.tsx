import { MinusIcon } from 'lucide-react';
import { memo, useLayoutEffect, useRef } from 'react';

import EditableCell from '@/components/EditableCell';
import { Button } from '@/components/ui/button';
import type { ConnectorProps, GetConnectorPropsParams } from '@/headless';
import type { FieldItem, HeaderColumnProps, TableMappingRef } from '@/types/table-mapping';

import { focusAfterRowRemoval } from './focusAfterRowRemoval';
import NoData from './ui/nodata';
import { useRemoveButtonStop } from './useRemoveButtonStop';

interface SourceTableProps {
  sourceTableRef: React.RefObject<HTMLDivElement | null>;
  sourceColumns: Array<Omit<HeaderColumnProps, 'type'>>;
  disabled?: boolean;
  noDataComponent?: React.ReactNode;
  onBeforeSourceFieldRemove?: (sourceId: string) => void | boolean;
  onAfterSourceFieldRemove?: (removedSourceId: string) => void;
  getConnectorProps: (params: GetConnectorPropsParams) => ConnectorProps;
  describeRow: (field: FieldItem) => string;
  tableMappingHook: TableMappingRef;
}

const SourceRow = memo(
  ({
    field,
    getConnectorProps,
    disabled,
  }: {
    field: FieldItem;
    getConnectorProps: (params: GetConnectorPropsParams) => ConnectorProps;
    disabled?: boolean;
  }) => {
    const { id, key, ...rest } = field;

    const entries = Object.entries(rest ?? {}).filter(([, params]) => params);
    const columnCount = entries.length;

    const gridTemplateColumns = `repeat(${columnCount}, 1fr) auto`;

    return (
      <div key={id || key} className="source-table-row" style={{ gridTemplateColumns, flex: 1 }}>
        {Object.entries(rest ?? {}).map(([fieldKey, params]) => {
          if (params) {
            return (
              <EditableCell
                key={`${id}-${fieldKey}`}
                fieldId={id}
                fieldKey={fieldKey}
                params={params}
                disabled={disabled}
                tableType="source"
              />
            );
          }
          return null;
        })}
        <button
          {...getConnectorProps({ side: 'source', id })}
          id={`connector-source-${id}`}
          data-testid={`connector-source-${id}`}
          className="source-connector connector"
          style={{
            cursor: disabled ? 'not-allowed' : 'pointer',
            pointerEvents: disabled ? 'none' : 'auto',
            // Without this a touch drag is claimed by the browser as a scroll gesture and no
            // pointermove ever reaches the handler.
            touchAction: 'none',
          }}
        />
      </div>
    );
  },
);

const SourceTable = (props: SourceTableProps) => {
  const {
    sourceTableRef,
    sourceColumns,
    disabled,
    noDataComponent,
    onBeforeSourceFieldRemove,
    onAfterSourceFieldRemove,
    getConnectorProps,
    describeRow,
    tableMappingHook,
  } = props;

  const { sourceFields, removeSource } = tableMappingHook;

  // Decided before the row goes, because afterwards there is no index to find a neighbour by.
  const pendingFocus = useRef<{ removed: string; next: string | null } | null>(null);

  const handleSourceFieldRemove = (sourceId: string) => {
    const shouldRemove = onBeforeSourceFieldRemove?.(sourceId);
    if (shouldRemove === false) return;

    const ids = sourceFields.map((field) => field.id);
    const index = ids.indexOf(sourceId);

    pendingFocus.current = { removed: sourceId, next: ids[index + 1] ?? ids[index - 1] ?? null };
    removeSource(sourceId);
    onAfterSourceFieldRemove?.(sourceId);
  };

  useLayoutEffect(() => {
    const pending = pendingFocus.current;

    if (!pending || sourceFields.some((field) => field.id === pending.removed)) return;

    pendingFocus.current = null;
    focusAfterRowRemoval(sourceTableRef.current, pending.next, 'source');
  }, [sourceFields, sourceTableRef]);

  const removeButtonStop = useRemoveButtonStop(
    sourceFields.map((field) => field.id),
    sourceTableRef,
  );

  return (
    <div ref={sourceTableRef} className="source-table">
      <div className="source-table-header">
        <div className="source-table-header-container">
          {!disabled && sourceFields.length > 0 ? <div style={{ width: '24px', height: '24px' }} /> : null}
          {sourceColumns.map((column) => (
            <div className="source-table-header-cell" key={column.key}>
              {column.title}
            </div>
          ))}
        </div>
      </div>
      <div className="source-table-body">
        {sourceFields.map((field) => (
          <div key={field.id || field.key} className="source-table-row-container">
            {!disabled ? (
              <Button
                className="mapping-button"
                variant="outline"
                size="icon"
                aria-label={`Remove ${describeRow(field)}`}
                data-remove-row={field.id}
                {...removeButtonStop(field.id)}
                onClick={() => handleSourceFieldRemove(field.id)}
              >
                <MinusIcon width={12} height={12} />
              </Button>
            ) : null}
            <SourceRow field={field} getConnectorProps={getConnectorProps} disabled={disabled} />
          </div>
        ))}
        {sourceFields.length <= 0 ? noDataComponent ? noDataComponent : <NoData /> : null}
      </div>
    </div>
  );
};

export default SourceTable;
