import { MinusIcon } from 'lucide-react';
import { memo, useLayoutEffect, useRef } from 'react';

import EditableCell from '@/components/EditableCell';
import type { ConnectorProps, GetConnectorPropsParams } from '@/headless';
import type { FieldItem, HeaderColumnProps, TableMappingRef } from '@/types/table-mapping';

import { focusAfterRowRemoval } from './focusAfterRowRemoval';
import { Button } from './ui/button';
import NoData from './ui/nodata';
import { useRemoveButtonStop } from './useRemoveButtonStop';

interface TargetTableProps {
  targetTableRef: React.RefObject<HTMLDivElement | null>;
  targetColumns: Array<Omit<HeaderColumnProps, 'type'>>;
  disabled: boolean;
  noDataComponent?: React.ReactNode;
  onBeforeTargetFieldRemove?: (targetId: string) => void | boolean;
  onAfterTargetFieldRemove?: (removedTargetId: string) => void;
  getConnectorProps: (params: GetConnectorPropsParams) => ConnectorProps;
  describeRow: (field: FieldItem) => string;
  tableMappingHook: TableMappingRef;
}

const TargetRow = memo(
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
      <div key={id || key} className="target-table-row" style={{ gridTemplateColumns }}>
        {Object.entries(rest ?? {}).map(([fieldKey, params]) => {
          if (params) {
            return (
              <EditableCell
                key={`${id}-${fieldKey}`}
                fieldId={id}
                fieldKey={fieldKey}
                params={params}
                disabled={disabled}
                tableType="target"
              />
            );
          }
          return null;
        })}
        <button
          {...getConnectorProps({ side: 'target', id })}
          id={`connector-target-${id}`}
          data-testid={`connector-target-${id}`}
          className="target-connector connector"
          style={{ cursor: disabled ? 'not-allowed' : 'pointer', pointerEvents: disabled ? 'none' : 'auto' }}
        />
      </div>
    );
  },
);

const TargetTable = (props: TargetTableProps) => {
  const {
    targetTableRef,
    targetColumns,
    disabled,
    noDataComponent,
    onBeforeTargetFieldRemove,
    onAfterTargetFieldRemove,
    getConnectorProps,
    describeRow,
    tableMappingHook,
  } = props;

  const { targetFields, removeTarget } = tableMappingHook;

  // Decided before the row goes, because afterwards there is no index to find a neighbour by.
  const pendingFocus = useRef<{ removed: string; next: string | null } | null>(null);

  const handleTargetFieldRemove = (targetId: string) => {
    const shouldRemove = onBeforeTargetFieldRemove?.(targetId);
    if (shouldRemove === false) return;

    const ids = targetFields.map((field) => field.id);
    const index = ids.indexOf(targetId);

    pendingFocus.current = { removed: targetId, next: ids[index + 1] ?? ids[index - 1] ?? null };
    removeTarget(targetId);
    onAfterTargetFieldRemove?.(targetId);
  };

  useLayoutEffect(() => {
    const pending = pendingFocus.current;

    if (!pending || targetFields.some((field) => field.id === pending.removed)) return;

    pendingFocus.current = null;
    focusAfterRowRemoval(targetTableRef.current, pending.next, 'target');
  }, [targetFields, targetTableRef]);

  const removeButtonStop = useRemoveButtonStop(
    targetFields.map((field) => field.id),
    targetTableRef,
  );

  return (
    <div ref={targetTableRef} className="target-table">
      <div className="target-table-header">
        <div className="target-table-header-container">
          {targetColumns.map((column) => (
            <div className="target-table-header-cell" key={column.key}>
              {column.title}
            </div>
          ))}
          {!disabled && targetFields.length > 0 ? <div style={{ width: '24px', height: '24px' }} /> : null}
        </div>
      </div>
      <div className="target-table-body">
        {targetFields.map((field) => (
          <div key={field.id || field.key} className="target-table-row-container">
            <TargetRow field={field} getConnectorProps={getConnectorProps} disabled={disabled} />
            {!disabled ? (
              <Button
                className="mapping-button"
                variant="outline"
                size="icon"
                aria-label={`Remove ${describeRow(field)}`}
                data-remove-row={field.id}
                {...removeButtonStop(field.id)}
                onClick={() => handleTargetFieldRemove(field.id)}
              >
                <MinusIcon width={12} height={12} />
              </Button>
            ) : null}
          </div>
        ))}
        {targetFields.length <= 0 ? noDataComponent ? noDataComponent : <NoData /> : null}
      </div>
    </div>
  );
};

export default TargetTable;
