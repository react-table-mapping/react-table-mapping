import { MinusIcon } from 'lucide-react';
import { memo } from 'react';

import EditableCell from '@/components/EditableCell';
import { Button } from '@/components/ui/button';
import type { ConnectorProps, GetConnectorPropsParams } from '@/headless/internal/useConnectorProps';
import type { FieldItem, HeaderColumnProps, TableMappingRef } from '@/types/table-mapping';

import NoData from './ui/nodata';

interface SourceTableProps {
  sourceTableRef: React.RefObject<HTMLDivElement | null>;
  sourceColumns: Array<Omit<HeaderColumnProps, 'type'>>;
  disabled?: boolean;
  noDataComponent?: React.ReactNode;
  onBeforeSourceFieldRemove?: (sourceId: string) => void | boolean;
  onAfterSourceFieldRemove?: (removedSourceId: string) => void;
  getConnectorProps: (params: GetConnectorPropsParams) => ConnectorProps;
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
    tableMappingHook,
  } = props;

  const { sourceFields, removeSource } = tableMappingHook;

  const handleSourceFieldRemove = (sourceId: string) => {
    const shouldRemove = onBeforeSourceFieldRemove?.(sourceId);
    if (shouldRemove === false) return;
    removeSource(sourceId);
    onAfterSourceFieldRemove?.(sourceId);
  };

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
