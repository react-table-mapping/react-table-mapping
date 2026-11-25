---
title: Headless API
---

# Headless API

`react-table-mapping/headless` is the behaviour without the appearance: which rows exist, where the lines run, and the props an element takes to join in. Nothing here renders a table or ships a stylesheet.

```tsx
import { useMappingBoard, MappingCanvas } from 'react-table-mapping/headless';
```

지원되는 진입점은 이 훅 하나입니다. 훅이 내부에서 조합하는 다른 훅은 의도적으로 내보내지 않습니다.

## Export 목록

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `useMappingBoard` | `hook` | 보드의 모든 동작을 데이터와 prop getter로 제공합니다. |
| `MappingCanvas` | `component` | 선이 그려지는 `<svg>`입니다. |
| `useFieldValueProps` | `hook` | 편집 가능한 셀 하나를 행의 필드 하나에 연결합니다. |
| `defaultAnnouncements` | `value` | 영어 안내 문구입니다. |
| `MappingBoard` | `type` | `useMappingBoard`의 반환 타입입니다. |
| `UseMappingBoardParams` | `type` | `useMappingBoard`의 파라미터 객체입니다. |
| `DragLine` | `type` | 드래그 중 그려지는 선입니다. |
| `MappingCanvasProps` | `type` | `MappingCanvas`의 props입니다. |
| `UseFieldValuePropsParams` | `type` | `useFieldValueProps`의 파라미터입니다. |
| `FieldValueProps` | `type` | `useFieldValueProps`가 반환하는 값입니다. |
| `AnnouncementStrings` | `type` | `defaultAnnouncements`의 형태입니다. |
| `LiveRegionProps` | `type` | `getLiveRegionProps`가 반환하는 값입니다. |
| `GeometryLine` | `type` | `lines`의 항목 하나입니다. |
| `LineMarkers` | `type` | `markers`의 타입입니다. |
| `ConnectorSide` | `type` | `'source' | 'target'`입니다. |
| `ConnectorProps` | `type` | `getConnectorProps`가 반환하는 값입니다. |
| `GetConnectorPropsParams` | `type` | `getConnectorProps`의 파라미터입니다. |
| `CanvasProps` | `type` | `getCanvasProps`가 반환하는 값입니다. |
| `ConnectorGroupProps` | `type` | `getConnectorGroupProps`가 반환하는 값입니다. |
| `GetCanvasPropsParams` | `type` | `getCanvasProps`의 파라미터입니다. |
| `GetConnectorGroupPropsParams` | `type` | `getConnectorGroupProps`의 파라미터입니다. |
| `GetRootPropsParams` | `type` | `getRootProps`의 파라미터입니다. |
| `RootProps` | `type` | `getRootProps`가 반환하는 값입니다. |
| `GetMappingLinePropsParams` | `type` | `getMappingLineProps`의 파라미터입니다. |
| `GetRemoveMappingPropsParams` | `type` | `getRemoveMappingProps`의 파라미터입니다. |
| `MappingLineProps` | `type` | `getMappingLineProps`가 반환하는 값입니다. |
| `RemoveMappingProps` | `type` | `getRemoveMappingProps`가 반환하는 값입니다. |
| `FieldItem` | `type` | 기본 entry에서 다시 내보냅니다. [Types](./types)를 참고하세요. |
| `FieldItemDraft` | `type` | 기본 entry에서 다시 내보냅니다. [Types](./types)를 참고하세요. |
| `FieldItemInput` | `type` | 기본 entry에서 다시 내보냅니다. [Types](./types)를 참고하세요. |
| `HeaderColumnProps` | `type` | 기본 entry에서 다시 내보냅니다. [Types](./types)를 참고하세요. |
| `LineType` | `type` | 기본 entry에서 다시 내보냅니다. [Types](./types)를 참고하세요. |
| `Mapping` | `type` | 기본 entry에서 다시 내보냅니다. [Types](./types)를 참고하세요. |
| `NotifyAction` | `type` | 기본 entry에서 다시 내보냅니다. [Types](./types)를 참고하세요. |
| `OuterFieldItem` | `type` | 기본 entry에서 다시 내보냅니다. [Types](./types)를 참고하세요. |
| `TableMappingActionType` | `type` | 기본 entry에서 다시 내보냅니다. [Types](./types)를 참고하세요. |
| `TableMappingState` | `type` | 기본 entry에서 다시 내보냅니다. [Types](./types)를 참고하세요. |
| `TableMappingStateWithAction` | `type` | 기본 entry에서 다시 내보냅니다. [Types](./types)를 참고하세요. |

## useMappingBoard

```ts
function useMappingBoard(params?: UseMappingBoardParams): MappingBoard;
```

### `UseMappingBoardParams`

파라미터 객체입니다. 모든 멤버는 선택입니다.

| 이름 | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `sources` | `FieldItemInput[]` | `[]` | 소스 행입니다. |
| `targets` | `FieldItemInput[]` | `[]` | 타깃 행입니다. |
| `mappings` | `Mapping[]` | `[]` | 소스 행과 타깃 행 사이의 매핑입니다. |
| `onMappingChange` | `(state: TableMappingStateWithAction) => void` | - | 변경이 일어날 때마다 현재 상태와 원인이 된 action과 함께 호출됩니다. |
| `lineType` | `LineType` | `straight` | 선의 모양입니다. |
| `onBeforeConnect` | `(sourceId: string, targetId: string) => void \| boolean` | - | 드래그로 매핑을 만들기 전에 호출됩니다. `false`를 반환하면 거부합니다. 중복은 이 콜백보다 먼저 거부됩니다. |
| `onBeforeDisconnect` | `(mappingId: string) => void \| boolean` | - | 포인터나 키로 선을 제거하기 전에 호출됩니다. `false`를 반환하면 선을 유지합니다. |
| `onAfterDisconnect` | `(mappingId: string) => void` | - | 선이 제거된 뒤에 호출됩니다. `onBeforeDisconnect`가 거부한 경우에는 호출되지 않습니다. |
| `disabled` | `boolean` | `false` | 연결과 제거를 끕니다. 행과 선은 그대로 렌더링됩니다. |
| `connectRadius` | `number` | `15` | 드롭이 타깃 connector에 닿은 것으로 인정되는 거리(px)입니다. |
| `describeMapping` | `(mapping: Mapping, context: { sources: FieldItem[]; targets: FieldItem[] }) => string` | - | 매핑을 읽어줄 때 쓰는 이름입니다. 없으면 매핑의 id로 안내됩니다. |
| `describeField` | `(field: FieldItem, side: ConnectorSide) => string` | - | 행 하나의 이름입니다. connector의 접근 가능한 이름에 쓰입니다. |
| `announcements` | `Partial<AnnouncementStrings>` | - | 연결이 만들어지고 제거될 때 스크린 리더에 전달할 문구입니다. 생략한 항목은 영어 기본값을 씁니다. |

### `useMappingBoard return value`

이 타입은 `MappingBoard`로 export됩니다.

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `announcement` | `string` | 현재 안내 메시지입니다. `getLiveRegionProps`를 펼친 요소 안에 렌더링하세요. |
| `getLiveRegionProps` | `() => LiveRegionProps` | `announcement`를 담는 live region의 props입니다. |
| `sources` | `FieldItem[]` | 소스 행입니다. |
| `targets` | `FieldItem[]` | 타깃 행입니다. |
| `mappings` | `Mapping[]` | 매핑입니다. |
| `mappingDescriptions` | `Array<{ id: string; label: string; mapping: Mapping }>` | 각 매핑과 `describeMapping`이 붙여준 label입니다. |
| `actions` | `TableMappingRef` | 연결 상태를 바꾸는 액션입니다. [Ref methods](./ref)를 참고하세요. |
| `lines` | `GeometryLine[]` | 선이 지나는 위치입니다. 요소가 움직이면 다시 계산됩니다. |
| `dragLine` | `DragLine \| null` | 드래그 중에 그려지는 선이며, 아니면 `null`입니다. |
| `markers` | `LineMarkers` | 이 인스턴스에 고유한 화살표 머리 id입니다. `MappingCanvas`에 전달하세요. |
| `remeasure` | `() => void` | 모든 선을 다시 측정합니다. 늦게 로드되는 폰트나 transform처럼 observer가 감지하지 못하는 이동에 사용합니다. |
| `getRootProps` | `(params?: GetRootPropsParams) => RootProps` | 모든 좌표의 기준이 되는 요소의 props입니다. |
| `getCanvasProps` | `(params?: GetCanvasPropsParams) => CanvasProps` | 선이 그려지는 canvas의 props입니다. |
| `getConnectorGroupProps` | `(params: GetConnectorGroupPropsParams) => ConnectorGroupProps` | 한쪽의 connector들을 묶는 요소의 props입니다. |
| `getConnectorProps` | `(params: GetConnectorPropsParams) => ConnectorProps` | connector 하나의 props입니다. |
| `getMappingLineProps` | `(params: GetMappingLinePropsParams) => MappingLineProps` | 그려진 선 하나의 props입니다. |
| `getRemoveMappingProps` | `(params: GetRemoveMappingPropsParams) => RemoveMappingProps` | 매핑 하나를 제거하는 컨트롤의 props입니다. |
| `activeMappingId` | `string \| null` | 포인터 아래에 있거나 포커스를 가진 매핑입니다. 없으면 `null`입니다. |
| `clearHoveredMapping` | `() => void` | 선 위를 다시 지나지 않고 canvas를 벗어난 포인터를 위한 함수입니다. |
| `activeSide` | `ConnectorSide` | Tab이 지나가고 있는 쪽입니다. 평소에는 소스이고, 연결을 그리는 동안에는 타깃입니다. |

### `DragLine`

`dragLine`의 형태입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `from` | `{ x: number; y: number }` | 드래그가 시작된 위치입니다(root 기준 좌표). |
| `to` | `{ x: number; y: number }` | 포인터의 현재 위치입니다. |
| `hoveredTargetId` | `string \| null` | 지금 드롭하면 닿게 될 타깃입니다. 없으면 `null`입니다. |

### `GeometryLine`

`lines`의 항목 하나입니다. `Point`는 `{ x: number; y: number }`입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string` | 매핑 id입니다. |
| `source` | `string` | 소스 행 id입니다. |
| `target` | `string` | 타깃 행 id입니다. |
| `path` | `string` | 선의 SVG path 문자열입니다. `d`에 넣으세요. |
| `from` | `Point` | 선의 시작점입니다. |
| `to` | `Point` | 선의 끝점입니다. |
| `mid` | `Point` | 선의 중간 지점입니다. |

### `LineMarkers`

`markers`의 형태입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `normalId` | `string` | 일반 상태의 `<marker>` 요소에 넣는 id입니다. |
| `hoveredId` | `string` | hover 상태의 `<marker>` 요소에 넣는 id입니다. |
| `normal` | `string` | 선의 `marker-end`에 넣는 값입니다. |
| `hovered` | `string` | hover 상태인 선의 `marker-end`에 넣는 값입니다. |


## Prop getter

getter가 반환하는 값을 직접 만든 요소에 펼쳐서 사용합니다. 요소의 나머지 부분은 모두 직접 정하면 됩니다.

### getRootProps

### `GetRootPropsParams`

파라미터입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `ref` | `React.Ref<HTMLElement>` | 직접 만든 ref입니다. 측정에 필요한 ref를 대체하지 않고 병합됩니다. |
| `label` | `string` | 보드의 이름입니다. region은 이름이 있어야 landmark가 됩니다. |

### `RootProps`

반환되는 props입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `ref` | `React.RefCallback<HTMLElement>` | 측정을 위해 root를 등록합니다. |
| `role` | `'region' \| 'group'` | `label`이 있으면 `region`, 없으면 `group`입니다. |
| `aria-label` | `string \| undefined` | `label`이 있으면 그 값입니다. |
| `tabIndex` | `-1` | 코드로는 포커스할 수 있지만 Tab으로는 포커스되지 않습니다. 건너뛰기 링크가 동작하는 이유입니다. |
| `style` | `React.CSSProperties` | canvas가 위에 겹쳐지므로 root의 위치 지정 스타일입니다. |

### getCanvasProps

### `GetCanvasPropsParams`

파라미터입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `label` | `string` | 그림이 무엇인지에 대한 설명입니다(예: "3 mappings"). 선이 놓인 group의 이름이 됩니다. |

### `CanvasProps`

반환되는 props입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `role` | `'group'` | 숨기지 않고 group으로 둡니다. 안의 선이 버튼이기 때문입니다. |
| `aria-label` | `string \| undefined` | `label`이 있으면 그 값입니다. |
| `style` | `React.CSSProperties` | canvas를 root 위에 겹칩니다. canvas는 포인터를 받지 않고, 선이 자기 히트 영역을 따로 가져옵니다. |

### getConnectorGroupProps

### `GetConnectorGroupPropsParams`

파라미터입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `side` | `ConnectorSide` | 그룹이 속한 열입니다. |
| `label` | `string` | 그룹을 안내할 때 쓰는 열의 이름입니다. |

### `ConnectorGroupProps`

반환되는 props입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `role` | `'toolbar'` | toolbar입니다. 스크린 리더가 화살표 키를 앱에 넘기며, 그룹 전체가 탭 정지점 하나이고 그 안에서는 화살표 키로 이동합니다. |
| `aria-orientation` | `'vertical'` | connector는 위·아래 화살표로 이동합니다. |
| `aria-label` | `string \| undefined` | `label`이 있으면 그 값입니다. |
| `data-side` | `ConnectorSide` | 이 그룹이 속한 쪽입니다. |

### getConnectorProps

### `GetConnectorPropsParams`

파라미터입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `side` | `ConnectorSide` | connector가 속한 쪽입니다. |
| `id` | `string` | connector가 속한 행의 id입니다. |
| `label` | `string` | connector가 무엇인지에 대한 설명입니다(예: "customer_id"). 접근 가능한 이름이 됩니다. |
| `ref` | `React.Ref<HTMLElement>` | 직접 만든 ref입니다. 이 getter가 이미 필요로 하는 ref와 병합됩니다. |

### `ConnectorProps`

반환되는 props입니다. 포인터 핸들러는 소스 connector에만 있습니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `ref` | `React.RefCallback<HTMLElement>` | connector를 등록해 해당 행으로 가는 선이 그려지게 합니다. |
| `type` | `'button'` | `<form>` 안의 `<button>`이 제출되지 않게 합니다. |
| `data-side` | `ConnectorSide` | connector가 속한 쪽입니다. |
| `onKeyDown` | `(event: React.KeyboardEvent) => void` | 키보드 연결을 처리합니다. |
| `onClick` | `(event: React.MouseEvent) => void` | Enter와 같이 연결을 시작하거나 확정합니다. |
| `onMouseDown` | `(event: React.MouseEvent) => void` | 연결이 진행되는 동안 클릭으로 포커스가 이동하지 않게 합니다. |
| `onBlur` | `(event: React.FocusEvent) => void` | 포커스가 connector가 아닌 곳으로 이동하면 연결을 취소합니다. |
| `tabIndex` | `0 \| -1` | 쪽마다 connector 하나만 탭 정지점을 가집니다. |
| `aria-label` | `string \| undefined` | `label`이 있으면 그 값입니다. |
| `data-connecting` | `true \| undefined` | 연결을 그리기 시작한 소스에 붙습니다. |
| `data-candidate` | `true \| undefined` | 키보드로 이동해 도달한 타깃에 붙습니다. |
| `onPointerDown` | `(event: React.PointerEvent) => void` | 소스 connector에만 있습니다. 드래그를 시작합니다. |
| `onPointerMove` | `(event: React.PointerEvent) => void` | 소스 connector에만 있습니다. 드래그를 따라갑니다. |
| `onPointerUp` | `(event: React.PointerEvent) => void` | 소스 connector에만 있습니다. 드래그를 끝냅니다. |
| `onPointerCancel` | `(event: React.PointerEvent) => void` | 소스 connector에만 있습니다. 드래그를 취소합니다. |

### getMappingLineProps

### `GetMappingLinePropsParams`

파라미터입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string` | 매핑 id입니다. |
| `label` | `string` | 선이 무엇인지에 대한 설명입니다(예: "COL4 to SUM_COL"). 접근 가능한 이름이 되며, 없으면 매핑의 id를 씁니다. |

### `MappingLineProps`

반환되는 props입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `role` | `'button'` | 활성화할 수 있으므로 컨트롤입니다. |
| `ref` | `React.RefCallback<Element>` | 화살표 키로 포커스를 옮길 수 있도록 선을 등록합니다. |
| `tabIndex` | `0 \| -1` | 선 하나만 탭 정지점을 가지며, 선 사이는 화살표 키로 이동합니다. |
| `aria-label` | `string` | 접근 가능한 이름입니다. |
| `onClick` | `(event: React.MouseEvent) => void` | 선을 활성화합니다. |
| `onKeyDown` | `(event: React.KeyboardEvent) => void` | Enter, Space, Delete, Backspace로 활성화하고 화살표 키로 선 사이를 이동합니다. |
| `onPointerEnter` | `() => void` | 선을 활성 상태로 표시합니다. |
| `onPointerLeave` | `() => void` | 표시를 지웁니다. |
| `onFocus` | `() => void` | 선을 활성 상태로 표시합니다. |
| `onBlur` | `() => void` | 표시를 지웁니다. |
| `style` | `React.CSSProperties` | 선이 포인터 히트를 받도록 합니다(`pointer-events: stroke`). |
| `data-active` | `true \| undefined` | 선이 포인터 아래에 있거나 포커스를 가진 동안 붙습니다. |

### getRemoveMappingProps

### `GetRemoveMappingPropsParams`

파라미터입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string` | 매핑 id입니다. |
| `standalone` | `boolean` | 컨트롤을 선 위가 아닌 다른 곳에 그릴 때 지정합니다. 이름과 탭 순서가 부여됩니다. |

### `RemoveMappingProps`

반환되는 props입니다. `standalone`을 지정하면 `aria-label`도 함께 반환됩니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `type` | `'button'` | `<form>` 안의 `<button>`이 제출되지 않게 합니다. |
| `onClick` | `(event: React.MouseEvent) => void` | 매핑을 제거합니다. |
| `aria-hidden` | `true \| undefined` | 선 위에 그려질 때는 접근성 트리에서 제외됩니다. `standalone`이면 `undefined`입니다. |
| `tabIndex` | `-1 \| 0` | 선 위에서는 탭 순서에서 제외되고, `standalone`이면 `0`입니다. |

### getLiveRegionProps

### `LiveRegionProps`

파라미터가 없습니다. 이 값을 펼친 요소 안에 `announcement`를 렌더링하세요.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `role` | `'status'` | status live region입니다. |
| `aria-live` | `'polite'` | 스크린 리더가 쉬고 있을 때 읽어줍니다. |
| `aria-atomic` | `true` | 바뀐 부분만이 아니라 메시지 전체를 읽습니다. |
| `style` | `React.CSSProperties` | 시각적으로만 숨겨 두고 읽을 수는 있습니다. `display: none`이면 읽히지 않습니다. |

## MappingCanvas

선이 그려지는 `<svg>`이며, 화살표 머리를 내부에 정의합니다. 모든 `<svg>` prop도 받으며, 아래에는 이 컴포넌트 고유의 prop만 나열합니다.

### `MappingCanvasProps`

props입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `markers` | `LineMarkers` | `useMappingBoard`가 반환한 값입니다. 생략하면 `<defs>`를 렌더링하지 않습니다. |
| `lineColor` | `string` | 화살표 머리의 색상이며, 끝나는 선의 색과 맞춥니다. |
| `hoverLineColor` | `string` | hover 상태 화살표 머리의 색상입니다. |
| `children` | `React.ReactNode` | 선들입니다. |

## useFieldValueProps

편집 가능한 셀 하나를 행의 필드 하나에 연결합니다. 구독을 하므로 getter가 아닌 훅이며, 셀을 렌더링하는 컴포넌트 안에서 호출해야 합니다. 대부분은 필요하지 않으며, `board.actions.updateSourceFieldValue`로 써도 같은 결과를 얻습니다.

### `UseFieldValuePropsParams`

파라미터입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `store` | `TableMappingStore` | 셀이 연결될 store입니다. `react-table-mapping/core`의 `createTableMappingStore`로 만듭니다. |
| `side` | `ConnectorSide` | 행이 속한 테이블입니다. |
| `id` | `string` | 행 id입니다. |
| `columnKey` | `string` | 셀이 보여주는 컬럼입니다. |
| `onChange` | `(value: string) => void` | store에 반영한 뒤, 입력된 값과 함께 호출됩니다. |

### `FieldValueProps`

반환값입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `value` | `string` | 셀의 현재 값입니다. |
| `onChange` | `(event: { target: { value: string } }) => void` | `<input>`에 그대로 넘길 수 있도록 이벤트를 받습니다. input을 렌더링하지 않는다면 `{ target: { value } }`를 넘기면 됩니다. |

## defaultAnnouncements

`announcements`에서 생략한 항목에 쓰이는 영어 문구입니다. 모두 교체할 수 있으므로 번역은 직접 하면 됩니다.

### `AnnouncementStrings`

각 멤버는 메시지를 반환하는 함수입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `connectStart` | `(context: { source: string }) => string` | 키보드 연결이 시작되었을 때입니다. |
| `connect` | `(context: { source: string; target: string; total: number }) => string` | 두 행이 연결되었을 때입니다. |
| `disconnect` | `(context: { mapping: string; total: number }) => string` | 매핑이 제거되었을 때입니다. |
| `cancel` | `(context: { source: string }) => string` | 진행 중이던 연결이 취소되었을 때입니다. |
| `clear` | `(context: { count: number }) => string` | 모든 매핑이 제거되었을 때입니다. |
