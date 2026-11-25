---
title: Types
---

# Types

Every type exported from `react-table-mapping`. The headless entry re-exports the ones it uses; see [Headless API](./headless).

## Exports

| Name | Type | Description |
| --- | --- | --- |
| `TableMapping` | `component` | The component. Default export, also exported by name. |
| `LineType` | `type` | `'bezier' | 'straight' | 'step'`. |
| `HeaderColumnProps` | `interface` | A column of a table. |
| `OuterFieldItem` | `interface` | The other fields a row can carry. |
| `FieldItem` | `interface` | A row of the source or target table. |
| `Mapping` | `interface` | One connection between a source and a target. |
| `FieldItemInput` | `type` | `Partial<FieldItem>`. A row without internal properties, for user input. |
| `FieldItemDraft` | `interface` | A row handed to `appendSource` / `appendTarget`. |
| `TableMappingState` | `interface` | Sources, targets and mappings. |
| `TableMappingActionType` | `type` | The kinds of change that can be reported. |
| `NotifyAction` | `type` | The change that was made, with its payload. |
| `TableMappingStateWithAction` | `interface` | The state plus the action that produced it. |
| `TableMappingRef` | `interface` | What `ref` gives you. See [Ref methods](./ref). |
| `TableMappingProps` | `interface` | Props of `TableMapping`. See [TableMapping props](./table-mapping). |

## Data

### `HeaderColumnProps`

A column of a table.

| Member | Type | Description |
| --- | --- | --- |
| `title` | `string` | The column title. |
| `key` | `string` | The column key. Matched with `FieldItem.key`, and what `sameNameMapping` pairs on. |

### `FieldItem`

A row of the source or target table. It also carries `Partial<OuterFieldItem>`: one entry per column key.

| Member | Type | Description |
| --- | --- | --- |
| `id` | `string` | The row's id: `source-${randomID}` or `target-${randomID}`. |
| `key` | `string` | Matched with `HeaderColumnProps.key`. |

### `FieldItemDraft`

A row handed to `appendSource` / `appendTarget`. It also carries `Partial<OuterFieldItem>`.

| Member | Type | Description |
| --- | --- | --- |
| `id` | `string \| undefined` | Optional here and only here: leave it out and one is generated, prefixed with the side the field is added to. |
| `key` | `string` | Required, since nothing else is filled in for you. |

### `Mapping`

One connection between a source and a target.

| Member | Type | Description |
| --- | --- | --- |
| `id` | `string` | `mapping-${source.id}-${target.id}`. |
| `source` | `string` | The source field id. |
| `target` | `string` | The target field id. |


### `OuterFieldItem`

An index signature: each key is a column key and each value is one of three cell shapes, or a plain `string`.

#### `type: 'string'`

| Member | Type | Description |
| --- | --- | --- |
| `type` | `'string'` | A plain value. |
| `columnKey` | `string` | Matched with `HeaderColumnProps.key`. |
| `value` | `string` | The value shown. |

#### `type: 'input'`

| Member | Type | Description |
| --- | --- | --- |
| `type` | `'input'` | An editable text cell. |
| `columnKey` | `string` | Matched with `HeaderColumnProps.key`. |
| `value` | `string` | The controlled value. |
| `defaultValue` | `string` | The initial value. |
| `attributes` | `Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>` | Attributes passed to the `<input>`. |
| `onChange` | `(value: string) => void` | Called with the new value. |

#### `type: 'select'`

| Member | Type | Description |
| --- | --- | --- |
| `type` | `'select'` | A select cell. |
| `columnKey` | `string` | Matched with `HeaderColumnProps.key`. |
| `value` | `string` | The controlled value. |
| `defaultValue` | `string` | The initial value. |
| `attributes` | `Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'>` | Attributes passed to the `<select>`. |
| `options` | `{ label: string; value: string; disabled?: boolean }[]` | The choices. |
| `onChange` | `(value: string) => void` | Called with the new value. |

## Change reporting

### `TableMappingState`

Sources, targets and mappings.

| Member | Type | Description |
| --- | --- | --- |
| `sources` | `FieldItemInput[]` | The source rows. |
| `targets` | `FieldItemInput[]` | The target rows. |
| `mappings` | `Mapping[]` | The mappings. |

### `TableMappingStateWithAction`

Extends `TableMappingState`. What `onMappingChange` receives.

| Member | Type | Description |
| --- | --- | --- |
| `action` | `NotifyAction` | What caused the change. |

### `TableMappingActionType`

One of: `ADD_MAPPING`, `REMOVE_MAPPING`, `CLEAR_MAPPINGS`, `UPDATE_MAPPINGS`, `SAME_LINE_MAPPING`, `SAME_NAME_MAPPING`, `APPEND_SOURCE`, `REMOVE_SOURCE`, `UPDATE_SOURCE_FIELDS`, `UPDATE_SOURCE_FIELD_VALUE`, `APPEND_TARGET`, `REMOVE_TARGET`, `UPDATE_TARGET_FIELDS`, `UPDATE_TARGET_FIELD_VALUE`.

### `NotifyAction`

A union keyed by `type`. Each member is `{ type, payload }`:

| type | payload keys |
| --- | --- |
| `ADD_MAPPING` | `sourceId`, `targetId`, `mapping` |
| `REMOVE_MAPPING` | `mappingId`, `removedMapping` |
| `CLEAR_MAPPINGS` | `clearedMappings` |
| `UPDATE_MAPPINGS` | `previousMappings`, `newMappings` |
| `SAME_LINE_MAPPING` | `previousMappings`, `newMappings` |
| `SAME_NAME_MAPPING` | `name`, `previousMappings`, `newMappings` |
| `APPEND_SOURCE` | `source` |
| `REMOVE_SOURCE` | `sourceId`, `removedMappings` |
| `UPDATE_SOURCE_FIELDS` | `previousSources`, `newSources` |
| `UPDATE_SOURCE_FIELD_VALUE` | `sourceId`, `fieldKey`, `newValue` |
| `APPEND_TARGET` | `target` |
| `REMOVE_TARGET` | `targetId`, `removedMappings` |
| `UPDATE_TARGET_FIELDS` | `previousTargets`, `newTargets` |
| `UPDATE_TARGET_FIELD_VALUE` | `targetId`, `fieldKey`, `newValue` |

### `LineType`

One of: `'bezier'`, `'straight'`, `'step'`. The default is `straight`.

### `FieldItemInput`

`Partial<FieldItem>`. A row without internal properties, for user input.
