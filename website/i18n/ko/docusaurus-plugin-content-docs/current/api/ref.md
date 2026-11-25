---
title: Ref methods
---

# Ref methods

`TableMapping`의 `ref`로 `TableMappingRef`를 얻습니다. 컴포넌트의 현재 데이터와, 바깥에서 호출할 수 있는 모든 변경 메서드입니다. `useMappingBoard`가 반환하는 `actions` 객체도 같은 타입입니다.

```tsx
const ref = useRef<TableMappingRef>(null);

<TableMapping ref={ref} sourceColumns={columns} targetColumns={columns} />;

ref.current?.addMapping('source-1', 'target-1');
```

### `TableMappingRef`

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `sourceFields` | `FieldItem[]` | 현재 소스 행입니다. 변경 후에는 들고 있지 말고 다시 읽으세요. |
| `targetFields` | `FieldItem[]` | 현재 타깃 행입니다. |
| `mappings` | `Mapping[]` | 현재 매핑입니다. |
| `redrawCount` | `number` | `redraw`가 호출된 횟수입니다. 증가만 합니다. |
| `getSourceFields` | `() => FieldItem[]` | 렌더를 기다리지 않고 현재 소스 행을 읽습니다. |
| `getTargetFields` | `() => FieldItem[]` | 렌더를 기다리지 않고 현재 타깃 행을 읽습니다. |
| `getMappings` | `() => Mapping[]` | 렌더를 기다리지 않고 현재 매핑을 읽습니다. |
| `addMapping` | `(sourceId: string, targetId: string) => void` | 두 행 사이에 매핑을 추가합니다. |
| `removeMapping` | `(mappingId: string) => void` | 매핑 하나를 제거합니다. |
| `clearMappings` | `() => void` | 모든 매핑을 제거합니다. |
| `updateMappings` | `(next: Mapping[]) => void` | 매핑을 주어진 목록으로 교체합니다. |
| `sameLineMapping` | `() => void` | 위치 순서대로 행을 짝지으며, 더 짧은 테이블에서 멈춥니다. |
| `sameNameMapping` | `(name: string) => void` | 지정한 컬럼의 값이 같은 행끼리 짝짓습니다. 기존 매핑은 교체됩니다. |
| `appendSource` | `(source: FieldItemDraft) => void` | 소스 행을 끝에 추가합니다. `id`를 생략하면 자동으로 생성됩니다. |
| `removeSource` | `(sourceId: string) => void` | 소스 행과 그 행을 참조하던 매핑을 제거합니다. |
| `updateSourceFields` | `(next: FieldItem[]) => void` | 소스 목록 전체를 교체합니다. `removeSource`와 달리 매핑은 건드리지 않습니다. |
| `updateSourceFieldValue` | `(sourceId: string, fieldKey: string, newValue: string) => void` | 소스 행의 셀 값 하나를 설정합니다. |
| `appendTarget` | `(target: FieldItemDraft) => void` | 타깃 행을 끝에 추가합니다. `id`를 생략하면 자동으로 생성됩니다. |
| `removeTarget` | `(targetId: string) => void` | 타깃 행과 그 행을 참조하던 매핑을 제거합니다. |
| `updateTargetFields` | `(next: FieldItem[]) => void` | 타깃 목록 전체를 교체합니다. `removeTarget`과 달리 매핑은 건드리지 않습니다. |
| `updateTargetFieldValue` | `(targetId: string, fieldKey: string, newValue: string) => void` | 타깃 행의 셀 값 하나를 설정합니다. |
| `redraw` | `() => void` | 모든 선을 다시 측정합니다. 어떤 observer도 감지할 수 없는 이동에 사용합니다. |
| `_store` | `TableMappingStore` | 내부용입니다. 접근은 가능하지만 이 패키지가 지원하는 범위가 아닙니다. |
