/**
 * `react-table-mapping/headless` — the behaviour without the appearance.
 *
 * One hook returns what a field-mapping board needs: which rows exist, where the lines run,
 * and the props an element takes to join in. Nothing here renders a table, ships a stylesheet,
 * or assumes a layout — every element on the screen belongs to whoever calls it.
 *
 * ```tsx
 * const board = useMappingBoard({ sources, targets, mappings, onMappingChange });
 *
 * <div {...board.getRootProps()}>
 *   {board.sources.map((field) => (
 *     <button key={field.id} {...board.getConnectorProps({ side: 'source', id: field.id })} />
 *   ))}
 *
 *   <MappingCanvas {...board.getCanvasProps()} markers={board.markers}>
 *     {board.lines.map((line) => (
 *       <path key={line.id} d={line.path} {...board.getMappingLineProps({ id: line.id })} />
 *     ))}
 *   </MappingCanvas>
 * </div>
 * ```
 *
 * The single hook is the supported surface. The hooks it composes are deliberately not
 * exported: they answer to each other in ways that are not a contract — the registry's
 * `version` is what makes the geometry re-measure, and pulling one out on its own gets a
 * board that silently draws nothing.
 */

export { useMappingBoard } from './headless/useMappingBoard';
export type { DragLine, MappingBoard, UseMappingBoardParams } from './headless/useMappingBoard';

export { default as MappingCanvas } from './headless/MappingCanvas';
export type { MappingCanvasProps } from './headless/MappingCanvas';

/**
 * Binds one editable cell to one field of one row.
 *
 * A hook rather than something {@link useMappingBoard} returns, because it subscribes and a
 * hook cannot be called once per row — so it goes inside the component that renders the cell.
 * It takes a store, which is what `react-table-mapping/core` publishes.
 *
 * Most consumers will not need it: writing through `board.actions.updateSourceFieldValue`
 * re-renders nothing but the cell either way, measured. This is for a caller who is already
 * holding a store of their own.
 */
export { useFieldValueProps } from './headless/internal/useFieldValueProps';
export type { FieldValueProps, UseFieldValuePropsParams } from './headless/internal/useFieldValueProps';

export { defaultAnnouncements } from './headless/internal/useAnnouncement';
export type { AnnouncementStrings, LiveRegionProps } from './headless/internal/useAnnouncement';

export type { GeometryLine } from './headless/internal/useGeometry';
export type { LineMarkers } from './headless/internal/useLineMarkers';
export type { ConnectorSide } from './headless/internal/useConnectorRegistry';
export type { ConnectorProps, GetConnectorPropsParams } from './headless/internal/useConnectorProps';
export type {
  CanvasProps,
  ConnectorGroupProps,
  GetCanvasPropsParams,
  GetConnectorGroupPropsParams,
  GetRootPropsParams,
  RootProps,
} from './headless/internal/useLayoutProps';
export type {
  GetMappingLinePropsParams,
  GetRemoveMappingPropsParams,
  MappingLineProps,
  RemoveMappingProps,
} from './headless/internal/useMappingProps';

export type {
  FieldItem,
  FieldItemDraft,
  FieldItemInput,
  HeaderColumnProps,
  LineType,
  Mapping,
  NotifyAction,
  OuterFieldItem,
  TableMappingActionType,
  TableMappingState,
  TableMappingStateWithAction,
} from './types/table-mapping';
