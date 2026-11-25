---
title: TableMapping props
---

# TableMapping props

`TableMapping`은 `react-table-mapping`의 default export입니다(이름 있는 export로도 내보냅니다). props 타입은 `TableMappingProps`입니다.

```tsx
import { TableMapping } from 'react-table-mapping';
import 'react-table-mapping/styles';
```

sources, targets, mappings는 **참조가 바뀔 때만** 내부 store에 반영되므로, uncontrolled로 쓸 때는 안정적인 참조를 넘기세요.

### `TableMappingProps`

| Prop | 타입 | 기본값 | 설명 |
| --- | --- | --- | --- |
| `ref` | `React.RefObject<TableMappingRef \| null>` | - | 데이터와 모든 변경 메서드에 접근하는 ref입니다. [Ref methods](./ref)를 참고하세요. |
| `id` | `string` | - | 보드 자체의 id입니다. 건너뛰기 링크가 가리킬 수 있도록 하며, 이 id를 가진 요소는 landmark role을 가지고 포커스할 수 있어 링크를 따라가면 포커스가 보드로 이동합니다. |
| `aria-label` | `string` | `Field mapping` | 스크린 리더가 읽는 보드의 이름입니다. 컴포넌트가 되는 landmark의 이름이며, 한 페이지의 두 보드는 같은 이름을 쓰지 않는 것이 좋습니다. |
| `sources` | `FieldItemInput[]` | `[]` | 소스 행입니다. 참조가 바뀔 때마다 내부 store에 반영됩니다. |
| `targets` | `FieldItemInput[]` | `[]` | 타깃 행입니다. 참조가 바뀔 때마다 내부 store에 반영됩니다. |
| `mappings` | `Mapping[]` | `[]` | 소스 행과 타깃 행 사이의 매핑입니다. 참조가 바뀔 때마다 내부 store에 반영됩니다. |
| `sourceColumns` | `Array<Omit<HeaderColumnProps, 'type'>>` | `[]` | 소스 테이블의 컬럼입니다. 타입상 필수이며, 컴포넌트는 값이 없으면 빈 배열로 처리합니다. |
| `targetColumns` | `Array<Omit<HeaderColumnProps, 'type'>>` | `[]` | 타깃 테이블의 컬럼입니다. 타입상 필수이며, 컴포넌트는 값이 없으면 빈 배열로 처리합니다. |
| `lineType` | `LineType` | `straight` | 매핑 선의 모양입니다. |
| `lineColor` | `string` | `#009bff` | 매핑 선의 색상입니다. |
| `lineWidth` | `number` | `1.7` | 매핑 선의 두께입니다. |
| `hoverLineColor` | `string` | `#e3f3ff` | 매핑 선에 hover했을 때의 색상입니다. |
| `disabled` | `boolean` | `false` | 매핑과 내용을 비활성화합니다. |
| `noDataComponent` | `React.ReactNode` | - | 테이블에 행이 없을 때 표시되는 기본 빈 상태를 대체합니다. |
| `onBeforeSourceFieldRemove` | `(sourceId: string) => void \| boolean` | - | 소스 행을 제거하기 전에 호출됩니다. `false`를 반환하면 제거하지 않습니다. |
| `onBeforeTargetFieldRemove` | `(targetId: string) => void \| boolean` | - | 타깃 행을 제거하기 전에 호출됩니다. `false`를 반환하면 제거하지 않습니다. |
| `onAfterSourceFieldRemove` | `(removedSourceId: string) => void` | - | 소스 행을 제거한 뒤에 호출됩니다. |
| `onAfterTargetFieldRemove` | `(removedTargetId: string) => void` | - | 타깃 행을 제거한 뒤에 호출됩니다. |
| `onAfterMappingLineRemove` | `(removeMappingId: string) => void` | - | 매핑 선을 제거한 뒤에 호출됩니다. |
| `onBeforeMappingLineRemove` | `(removeMappingId: string) => void \| boolean` | - | 매핑 선을 제거하기 전에 호출됩니다. `false`를 반환하면 제거하지 않습니다. |
| `onAfterMappingChange` | `(state: TableMappingState) => void` | - | 매핑이 바뀐 뒤 현재의 sources, targets, mappings와 함께 호출됩니다. |
| `onMappingChange` | `(stateWithAction: TableMappingStateWithAction) => void` | - | 내부 상태가 바뀔 때마다 새 상태와 원인이 된 action과 함께 호출됩니다. 값을 다시 내려주면 controlled로, 듣기만 하면 uncontrolled로 쓸 수 있습니다. |
