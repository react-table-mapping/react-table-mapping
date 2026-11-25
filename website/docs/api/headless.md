---
title: Headless API
---

# Headless API

`react-table-mapping/headless` is the behaviour without the appearance: which rows exist, where the lines run, and the props an element takes to join in. Nothing here renders a table or ships a stylesheet.

```tsx
import { useMappingBoard, MappingCanvas } from 'react-table-mapping/headless';
```

The single hook is the supported surface. The hooks it composes are deliberately not exported.

## Exports

| Name | Type | Description |
| --- | --- | --- |
| `useMappingBoard` | `hook` | The whole behaviour of a board, as data and prop getters. |
| `MappingCanvas` | `component` | The `<svg>` the lines are drawn on. |
| `useFieldValueProps` | `hook` | Binds one editable cell to one field of one row. |
| `defaultAnnouncements` | `value` | The English announcement strings. |
| `MappingBoard` | `type` | The return type of `useMappingBoard`. |
| `UseMappingBoardParams` | `type` | The parameter object of `useMappingBoard`. |
| `DragLine` | `type` | The line being drawn during a drag. |
| `MappingCanvasProps` | `type` | Props of `MappingCanvas`. |
| `UseFieldValuePropsParams` | `type` | Parameters of `useFieldValueProps`. |
| `FieldValueProps` | `type` | What `useFieldValueProps` returns. |
| `AnnouncementStrings` | `type` | The shape of `defaultAnnouncements`. |
| `LiveRegionProps` | `type` | What `getLiveRegionProps` returns. |
| `GeometryLine` | `type` | One entry of `lines`. |
| `LineMarkers` | `type` | The type of `markers`. |
| `ConnectorSide` | `type` | `'source' | 'target'`. |
| `ConnectorProps` | `type` | What `getConnectorProps` returns. |
| `GetConnectorPropsParams` | `type` | Parameters of `getConnectorProps`. |
| `CanvasProps` | `type` | What `getCanvasProps` returns. |
| `ConnectorGroupProps` | `type` | What `getConnectorGroupProps` returns. |
| `GetCanvasPropsParams` | `type` | Parameters of `getCanvasProps`. |
| `GetConnectorGroupPropsParams` | `type` | Parameters of `getConnectorGroupProps`. |
| `GetRootPropsParams` | `type` | Parameters of `getRootProps`. |
| `RootProps` | `type` | What `getRootProps` returns. |
| `GetMappingLinePropsParams` | `type` | Parameters of `getMappingLineProps`. |
| `GetRemoveMappingPropsParams` | `type` | Parameters of `getRemoveMappingProps`. |
| `MappingLineProps` | `type` | What `getMappingLineProps` returns. |
| `RemoveMappingProps` | `type` | What `getRemoveMappingProps` returns. |
| `FieldItem` | `type` | Re-exported from the main entry. See [Types](./types). |
| `FieldItemDraft` | `type` | Re-exported from the main entry. See [Types](./types). |
| `FieldItemInput` | `type` | Re-exported from the main entry. See [Types](./types). |
| `HeaderColumnProps` | `type` | Re-exported from the main entry. See [Types](./types). |
| `LineType` | `type` | Re-exported from the main entry. See [Types](./types). |
| `Mapping` | `type` | Re-exported from the main entry. See [Types](./types). |
| `NotifyAction` | `type` | Re-exported from the main entry. See [Types](./types). |
| `OuterFieldItem` | `type` | Re-exported from the main entry. See [Types](./types). |
| `TableMappingActionType` | `type` | Re-exported from the main entry. See [Types](./types). |
| `TableMappingState` | `type` | Re-exported from the main entry. See [Types](./types). |
| `TableMappingStateWithAction` | `type` | Re-exported from the main entry. See [Types](./types). |

## useMappingBoard

```ts
function useMappingBoard(params?: UseMappingBoardParams): MappingBoard;
```

### `UseMappingBoardParams`

The parameter object. Every member is optional.

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `sources` | `FieldItemInput[]` | `[]` | Source rows. |
| `targets` | `FieldItemInput[]` | `[]` | Target rows. |
| `mappings` | `Mapping[]` | `[]` | Mappings between source and target rows. |
| `onMappingChange` | `(state: TableMappingStateWithAction) => void` | - | Called after every change, with the state as it now stands and what caused it. |
| `lineType` | `LineType` | `straight` | The shape of the lines. |
| `onBeforeConnect` | `(sourceId: string, targetId: string) => void \| boolean` | - | Asked before a drag creates a mapping. Return `false` to refuse it. A duplicate is refused before this is consulted. |
| `onBeforeDisconnect` | `(mappingId: string) => void \| boolean` | - | Asked before a line is removed, by pointer or key. Return `false` to keep it. |
| `onAfterDisconnect` | `(mappingId: string) => void` | - | Called after a line has been removed, and not at all when `onBeforeDisconnect` refused it. |
| `disabled` | `boolean` | `false` | Turns off connecting and removing. Rows and lines still render. |
| `connectRadius` | `number` | `15` | How close to a target connector a drop still counts, in px. |
| `describeMapping` | `(mapping: Mapping, context: { sources: FieldItem[]; targets: FieldItem[] }) => string` | - | What a mapping is called when it is read out. Without one a mapping is announced by its id. |
| `describeField` | `(field: FieldItem, side: ConnectorSide) => string` | - | What one row is called. Used for the connector's accessible name. |
| `announcements` | `Partial<AnnouncementStrings>` | - | What a screen reader is told as connections are made and removed. Anything left out falls back to the English default. |

### `useMappingBoard return value`

The type is exported as `MappingBoard`.

| Name | Type | Description |
| --- | --- | --- |
| `announcement` | `string` | The current message. Render it inside an element spread with `getLiveRegionProps`. |
| `getLiveRegionProps` | `() => LiveRegionProps` | Props for the live region that carries `announcement`. |
| `sources` | `FieldItem[]` | The source rows. |
| `targets` | `FieldItem[]` | The target rows. |
| `mappings` | `Mapping[]` | The mappings. |
| `mappingDescriptions` | `Array<{ id: string; label: string; mapping: Mapping }>` | Each mapping with the label `describeMapping` gives it. |
| `actions` | `TableMappingRef` | The actions that change what is connected. See [Ref methods](./ref). |
| `lines` | `GeometryLine[]` | Where the lines run, recomputed as things move. |
| `dragLine` | `DragLine \| null` | The line being drawn while a drag is in progress, otherwise `null`. |
| `markers` | `LineMarkers` | Arrowhead ids, unique to this instance. Pass to `MappingCanvas`. |
| `remeasure` | `() => void` | Re-measures every line. For a move no observer can see — a late font, a transform. |
| `getRootProps` | `(params?: GetRootPropsParams) => RootProps` | Props for the element everything is measured against. |
| `getCanvasProps` | `(params?: GetCanvasPropsParams) => CanvasProps` | Props for the canvas the lines are drawn on. |
| `getConnectorGroupProps` | `(params: GetConnectorGroupPropsParams) => ConnectorGroupProps` | Props for the element that groups one side's connectors. |
| `getConnectorProps` | `(params: GetConnectorPropsParams) => ConnectorProps` | Props for one connector. |
| `getMappingLineProps` | `(params: GetMappingLinePropsParams) => MappingLineProps` | Props for one drawn line. |
| `getRemoveMappingProps` | `(params: GetRemoveMappingPropsParams) => RemoveMappingProps` | Props for a control that removes one mapping. |
| `activeMappingId` | `string \| null` | Which mapping is under the pointer or holds focus, if any. |
| `clearHoveredMapping` | `() => void` | For a pointer that leaves the canvas without passing back over a line. |
| `activeSide` | `ConnectorSide` | Which side Tab is walking: the sources, or the targets while a connection is drawn. |

### `DragLine`

The shape of `dragLine`.

| Member | Type | Description |
| --- | --- | --- |
| `from` | `{ x: number; y: number }` | Where the drag started, in the root's coordinates. |
| `to` | `{ x: number; y: number }` | Where the pointer is now. |
| `hoveredTargetId` | `string \| null` | The target the drop would land on, if any. |

### `GeometryLine`

One entry of `lines`. `Point` is `{ x: number; y: number }`.

| Member | Type | Description |
| --- | --- | --- |
| `id` | `string` | The mapping id. |
| `source` | `string` | The source row id. |
| `target` | `string` | The target row id. |
| `path` | `string` | The SVG path string for the line. Put it on `d`. |
| `from` | `Point` | Where the line starts. |
| `to` | `Point` | Where the line ends. |
| `mid` | `Point` | The midpoint of the line. |

### `LineMarkers`

The shape of `markers`.

| Member | Type | Description |
| --- | --- | --- |
| `normalId` | `string` | Put this on the normal `<marker>` element. |
| `hoveredId` | `string` | Put this on the hovered `<marker>` element. |
| `normal` | `string` | Put this on a line's `marker-end`. |
| `hovered` | `string` | Put this on a hovered line's `marker-end`. |


## Prop getters

Spread what a getter returns onto your own element. Everything else about the element belongs to you.

### getRootProps

### `GetRootPropsParams`

Parameters.

| Member | Type | Description |
| --- | --- | --- |
| `ref` | `React.Ref<HTMLElement>` | A ref of your own. It is merged with the one the measuring needs, rather than replacing it. |
| `label` | `string` | What the board is called. A region needs a name to be a landmark. |

### `RootProps`

Returned props.

| Member | Type | Description |
| --- | --- | --- |
| `ref` | `React.RefCallback<HTMLElement>` | Registers the root for measuring. |
| `role` | `'region' \| 'group'` | `region` when a `label` is given, otherwise `group`. |
| `aria-label` | `string \| undefined` | The `label`, if given. |
| `tabIndex` | `-1` | Focusable programmatically, never by Tab. This is what makes a skip link work. |
| `style` | `React.CSSProperties` | Positions the root, since the canvas is laid over it. |

### getCanvasProps

### `GetCanvasPropsParams`

Parameters.

| Member | Type | Description |
| --- | --- | --- |
| `label` | `string` | What the drawing is, in words — "3 mappings". It names the group the lines sit in. |

### `CanvasProps`

Returned props.

| Member | Type | Description |
| --- | --- | --- |
| `role` | `'group'` | A group rather than hidden: the lines inside are buttons. |
| `aria-label` | `string \| undefined` | The `label`, if given. |
| `style` | `React.CSSProperties` | Lays the canvas over the root. It ignores the pointer; lines take their own hits back. |

### getConnectorGroupProps

### `GetConnectorGroupPropsParams`

Parameters.

| Member | Type | Description |
| --- | --- | --- |
| `side` | `ConnectorSide` | Which column the group belongs to. |
| `label` | `string` | What the column is called, for the group's own announcement. |

### `ConnectorGroupProps`

Returned props.

| Member | Type | Description |
| --- | --- | --- |
| `role` | `'toolbar'` | A toolbar, so a screen reader hands the arrow keys to the app: one tab stop for the group and arrow keys within it. |
| `aria-orientation` | `'vertical'` | The connectors are walked with the up and down arrows. |
| `aria-label` | `string \| undefined` | The `label`, if given. |
| `data-side` | `ConnectorSide` | The side this group belongs to. |

### getConnectorProps

### `GetConnectorPropsParams`

Parameters.

| Member | Type | Description |
| --- | --- | --- |
| `side` | `ConnectorSide` | Which side the connector is on. |
| `id` | `string` | The row id the connector belongs to. |
| `label` | `string` | What this connector is, in words — "customer_id". It becomes the accessible name. |
| `ref` | `React.Ref<HTMLElement>` | A ref of your own, merged with the one this getter already needs. |

### `ConnectorProps`

Returned props. Only source connectors carry the pointer handlers.

| Member | Type | Description |
| --- | --- | --- |
| `ref` | `React.RefCallback<HTMLElement>` | Registers the connector so lines to its row are drawn. |
| `type` | `'button'` | Keeps a `<button>` inside a `<form>` from submitting it. |
| `data-side` | `ConnectorSide` | The side the connector is on. |
| `onKeyDown` | `(event: React.KeyboardEvent) => void` | Keyboard connecting. |
| `onClick` | `(event: React.MouseEvent) => void` | Starts or confirms a connection, the same as Enter. |
| `onMouseDown` | `(event: React.MouseEvent) => void` | Keeps a press from moving focus while a connection is in progress. |
| `onBlur` | `(event: React.FocusEvent) => void` | Abandons a connection when focus leaves for something that is not a connector. |
| `tabIndex` | `0 \| -1` | One connector per side holds the tab stop. |
| `aria-label` | `string \| undefined` | The `label`, if given. |
| `data-connecting` | `true \| undefined` | Present on the source a connection is being drawn from. |
| `data-candidate` | `true \| undefined` | Present on the target the keyboard has walked to. |
| `onPointerDown` | `(event: React.PointerEvent) => void` | Source connectors only. Starts a drag. |
| `onPointerMove` | `(event: React.PointerEvent) => void` | Source connectors only. Follows the drag. |
| `onPointerUp` | `(event: React.PointerEvent) => void` | Source connectors only. Ends the drag. |
| `onPointerCancel` | `(event: React.PointerEvent) => void` | Source connectors only. Cancels the drag. |

### getMappingLineProps

### `GetMappingLinePropsParams`

Parameters.

| Member | Type | Description |
| --- | --- | --- |
| `id` | `string` | The mapping id. |
| `label` | `string` | What this line is, in words — "COL4 to SUM_COL". It becomes the accessible name; without it the mapping's id is used. |

### `MappingLineProps`

Returned props.

| Member | Type | Description |
| --- | --- | --- |
| `role` | `'button'` | A control, because it can be activated. |
| `ref` | `React.RefCallback<Element>` | Registers the line so the arrow keys can move focus to it. |
| `tabIndex` | `0 \| -1` | One line holds the tab stop; the arrow keys walk between them. |
| `aria-label` | `string` | The accessible name. |
| `onClick` | `(event: React.MouseEvent) => void` | Activates the line. |
| `onKeyDown` | `(event: React.KeyboardEvent) => void` | Enter, Space, Delete and Backspace activate; the arrow keys move between lines. |
| `onPointerEnter` | `() => void` | Marks the line active. |
| `onPointerLeave` | `() => void` | Clears the mark. |
| `onFocus` | `() => void` | Marks the line active. |
| `onBlur` | `() => void` | Clears the mark. |
| `style` | `React.CSSProperties` | Gives the line its hits back: `pointer-events: stroke`. |
| `data-active` | `true \| undefined` | Present while the line is under the pointer or holds focus. |

### getRemoveMappingProps

### `GetRemoveMappingPropsParams`

Parameters.

| Member | Type | Description |
| --- | --- | --- |
| `id` | `string` | The mapping id. |
| `standalone` | `boolean` | Set when the control is drawn somewhere other than on the line. It then carries a name and a place in the tab order. |

### `RemoveMappingProps`

Returned props. With `standalone` set, the object also carries an `aria-label`.

| Member | Type | Description |
| --- | --- | --- |
| `type` | `'button'` | Keeps a `<button>` inside a `<form>` from submitting it. |
| `onClick` | `(event: React.MouseEvent) => void` | Removes the mapping. |
| `aria-hidden` | `true \| undefined` | Drawn on the line, the control is kept out of the accessibility tree. `undefined` when `standalone`. |
| `tabIndex` | `-1 \| 0` | Kept out of the tab order on the line; `0` when `standalone`. |

### getLiveRegionProps

### `LiveRegionProps`

Takes no parameters. Render `announcement` inside the element you spread this onto.

| Member | Type | Description |
| --- | --- | --- |
| `role` | `'status'` | A status live region. |
| `aria-live` | `'polite'` | Announced when the reader is idle. |
| `aria-atomic` | `true` | The whole message is read, not just what changed. |
| `style` | `React.CSSProperties` | Visually hidden, but present and readable. `display: none` would silence it. |

## MappingCanvas

The `<svg>` the lines are drawn on, with the arrowheads defined inside it. It also accepts every `<svg>` prop; only its own are listed.

### `MappingCanvasProps`

Props.

| Member | Type | Description |
| --- | --- | --- |
| `markers` | `LineMarkers` | From `useMappingBoard`. Pass none and no `<defs>` is rendered. |
| `lineColor` | `string` | The color the arrowheads are drawn in, matching the lines they end. |
| `hoverLineColor` | `string` | The color of the hovered arrowhead. |
| `children` | `React.ReactNode` | The lines. |

## useFieldValueProps

Binds one editable cell to one field of one row. A hook rather than a getter, because it subscribes; call it inside the component that renders the cell. Most consumers will not need it — writing through `board.actions.updateSourceFieldValue` works as well.

### `UseFieldValuePropsParams`

Parameters.

| Member | Type | Description |
| --- | --- | --- |
| `store` | `TableMappingStore` | The store the cell is bound to. `createTableMappingStore` from `react-table-mapping/core` makes one. |
| `side` | `ConnectorSide` | Which table the row is in. |
| `id` | `string` | The row id. |
| `columnKey` | `string` | The column the cell shows. |
| `onChange` | `(value: string) => void` | Called after the store is told, with the value that was typed. |

### `FieldValueProps`

Return value.

| Member | Type | Description |
| --- | --- | --- |
| `value` | `string` | The cell's current value. |
| `onChange` | `(event: { target: { value: string } }) => void` | Takes the event so the result drops onto an `<input>`. A caller not rendering one can pass `{ target: { value } }`. |

## defaultAnnouncements

The English strings used when `announcements` leaves one out. Every one is replaceable, so translating is yours to do.

### `AnnouncementStrings`

Each member is a function that returns the message.

| Member | Type | Description |
| --- | --- | --- |
| `connectStart` | `(context: { source: string }) => string` | A keyboard connection was started. |
| `connect` | `(context: { source: string; target: string; total: number }) => string` | Two rows were connected. |
| `disconnect` | `(context: { mapping: string; total: number }) => string` | A mapping was removed. |
| `cancel` | `(context: { source: string }) => string` | A connection in progress was cancelled. |
| `clear` | `(context: { count: number }) => string` | Every mapping was removed. |
