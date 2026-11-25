---
title: Ref methods
---

# Ref methods

`ref` on `TableMapping` gives you a `TableMappingRef`: the component's data as it stands, plus every mutation you can drive from outside it. The `actions` object returned by `useMappingBoard` is the same type.

```tsx
const ref = useRef<TableMappingRef>(null);

<TableMapping ref={ref} sourceColumns={columns} targetColumns={columns} />;

ref.current?.addMapping('source-1', 'target-1');
```

### `TableMappingRef`

| Member | Type | Description |
| --- | --- | --- |
| `sourceFields` | `FieldItem[]` | The source rows as they stand. Re-read after a mutation rather than held onto. |
| `targetFields` | `FieldItem[]` | The target rows as they stand. |
| `mappings` | `Mapping[]` | The mappings as they stand. |
| `redrawCount` | `number` | How many times `redraw` has been called. Only ever increases. |
| `getSourceFields` | `() => FieldItem[]` | Reads the current source rows without waiting for a render. |
| `getTargetFields` | `() => FieldItem[]` | Reads the current target rows without waiting for a render. |
| `getMappings` | `() => Mapping[]` | Reads the current mappings without waiting for a render. |
| `addMapping` | `(sourceId: string, targetId: string) => void` | Adds a mapping between the two rows. |
| `removeMapping` | `(mappingId: string) => void` | Removes one mapping. |
| `clearMappings` | `() => void` | Removes every mapping. |
| `updateMappings` | `(next: Mapping[]) => void` | Replaces the mappings with the given list. |
| `sameLineMapping` | `() => void` | Pairs rows by position, stopping at whichever table is shorter. |
| `sameNameMapping` | `(name: string) => void` | Pairs rows whose value in the given column matches. Replaces any existing mappings. |
| `appendSource` | `(source: FieldItemDraft) => void` | Adds a source row to the end. Leave the `id` out and one is generated. |
| `removeSource` | `(sourceId: string) => void` | Removes the source row and any mappings that referenced it. |
| `updateSourceFields` | `(next: FieldItem[]) => void` | Replaces the whole source list. Unlike `removeSource`, leaves mappings alone. |
| `updateSourceFieldValue` | `(sourceId: string, fieldKey: string, newValue: string) => void` | Sets one cell value of a source row. |
| `appendTarget` | `(target: FieldItemDraft) => void` | Adds a target row to the end. Leave the `id` out and one is generated. |
| `removeTarget` | `(targetId: string) => void` | Removes the target row and any mappings that referenced it. |
| `updateTargetFields` | `(next: FieldItem[]) => void` | Replaces the whole target list. Unlike `removeTarget`, leaves mappings alone. |
| `updateTargetFieldValue` | `(targetId: string, fieldKey: string, newValue: string) => void` | Sets one cell value of a target row. |
| `redraw` | `() => void` | Re-measures every line. For a move no observer can see. |
| `_store` | `TableMappingStore` | Internal. Reachable, but not part of what this package supports. |
