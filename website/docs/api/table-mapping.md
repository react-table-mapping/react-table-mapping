---
title: TableMapping props
---

# TableMapping props

`TableMapping` is the default export of `react-table-mapping` (also exported by name). Its props are the `TableMappingProps` type.

```tsx
import { TableMapping } from 'react-table-mapping';
import 'react-table-mapping/styles';
```

Sources, targets and mappings are reconciled into the internal store only when their **reference changes**, so pass stable references when uncontrolled.

### `TableMappingProps`

| Prop | Type | Default | Description |
| --- | --- | --- | --- |
| `ref` | `React.RefObject<TableMappingRef \| null>` | - | Gives access to the data and every mutation. See [Ref methods](./ref). |
| `id` | `string` | - | An id for the board itself, so a skip link can point at it. The element it names carries the landmark role and is focusable, so following the link moves focus onto the board. |
| `aria-label` | `string` | `Field mapping` | What this board is called, for a screen reader. It names the landmark the component becomes; two boards on one page should not share a name. |
| `sources` | `FieldItemInput[]` | `[]` | Source rows. Reconciled into the internal store whenever the reference changes. |
| `targets` | `FieldItemInput[]` | `[]` | Target rows. Reconciled into the internal store whenever the reference changes. |
| `mappings` | `Mapping[]` | `[]` | Mappings between source and target rows. Reconciled into the internal store whenever the reference changes. |
| `sourceColumns` | `Array<Omit<HeaderColumnProps, 'type'>>` | `[]` | Source table columns. Required by the type; the component falls back to an empty list. |
| `targetColumns` | `Array<Omit<HeaderColumnProps, 'type'>>` | `[]` | Target table columns. Required by the type; the component falls back to an empty list. |
| `lineType` | `LineType` | `straight` | The shape of the mapping lines. |
| `lineColor` | `string` | `#009bff` | Mapping line color. |
| `lineWidth` | `number` | `1.7` | Mapping line width. |
| `hoverLineColor` | `string` | `#e3f3ff` | Mapping line color while hovered. |
| `disabled` | `boolean` | `false` | Disables mapping and contents. |
| `noDataComponent` | `React.ReactNode` | - | Replaces the built-in empty state shown when a table has no rows. |
| `onBeforeSourceFieldRemove` | `(sourceId: string) => void \| boolean` | - | Called before a source row is removed. Return `false` to keep it. |
| `onBeforeTargetFieldRemove` | `(targetId: string) => void \| boolean` | - | Called before a target row is removed. Return `false` to keep it. |
| `onAfterSourceFieldRemove` | `(removedSourceId: string) => void` | - | Called after a source row is removed. |
| `onAfterTargetFieldRemove` | `(removedTargetId: string) => void` | - | Called after a target row is removed. |
| `onAfterMappingLineRemove` | `(removeMappingId: string) => void` | - | Called after a mapping line is removed. |
| `onBeforeMappingLineRemove` | `(removeMappingId: string) => void \| boolean` | - | Called before a mapping line is removed. Return `false` to keep it. |
| `onAfterMappingChange` | `(state: TableMappingState) => void` | - | Called with the sources, targets and mappings as they stand after the mappings change. |
| `onMappingChange` | `(stateWithAction: TableMappingStateWithAction) => void` | - | Called whenever internal state changes, with the new state and the action that caused it. Feed the values back down to use the component controlled, or just listen to it uncontrolled. |
