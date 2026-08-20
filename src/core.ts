/**
 * `react-table-mapping/core` — the framework-agnostic half of the library.
 *
 * Everything exported here is plain logic: the state store behind a mapping table, the
 * geometry that positions the lines, and the state machine behind drag and keyboard
 * connection. None of it renders anything or touches the DOM, so it can back a UI written
 * with any framework, or none.
 */

export type { Point } from './core/types';

export { createTableMappingStore } from './core/store/createTableMappingStore';
export type { StoreConfig, StoreSnapshot, StoreTopic, TableMappingStore } from './core/store/createTableMappingStore';

export { createLinePath, DEFAULT_MARKER_INSET } from './core/geometry/createLinePath';
export type { CreateLinePathParams } from './core/geometry/createLinePath';
export { resolveAnchor } from './core/geometry/resolveAnchor';
export type { AnchorSpec, ResolveAnchorParams } from './core/geometry/resolveAnchor';
export { mappingHit } from './core/geometry/mappingHit';
export type { MappingHitCandidate, MappingHitParams } from './core/geometry/mappingHit';

export { dragReducer, idleDragState } from './core/drag/dragReducer';
export type { DragEvent, DragState } from './core/drag/dragReducer';

export { createId } from './core/utils/createId';
