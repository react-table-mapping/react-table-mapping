---
title: Types
---

# Types

`react-table-mapping`이 export하는 모든 타입입니다. headless entry는 사용하는 타입을 다시 내보냅니다. [Headless API](./headless)를 참고하세요.

## Export 목록

| 이름 | 타입 | 설명 |
| --- | --- | --- |
| `TableMapping` | `component` | 컴포넌트입니다. default export이며 이름 있는 export로도 내보냅니다. |
| `LineType` | `type` | `'bezier' | 'straight' | 'step'`입니다. |
| `HeaderColumnProps` | `interface` | 테이블의 컬럼입니다. |
| `OuterFieldItem` | `interface` | 행이 가질 수 있는 나머지 필드입니다. |
| `FieldItem` | `interface` | 소스 또는 타깃 테이블의 행입니다. |
| `Mapping` | `interface` | 소스와 타깃 사이의 연결 하나입니다. |
| `FieldItemInput` | `type` | `Partial<FieldItem>`입니다. 내부 속성이 없는 행이며 사용자 입력용입니다. |
| `FieldItemDraft` | `interface` | `appendSource` / `appendTarget`에 넘기는 행입니다. |
| `TableMappingState` | `interface` | sources, targets, mappings입니다. |
| `TableMappingActionType` | `type` | 보고될 수 있는 변경의 종류입니다. |
| `NotifyAction` | `type` | 일어난 변경과 그 payload입니다. |
| `TableMappingStateWithAction` | `interface` | 상태와 그 상태를 만든 action입니다. |
| `TableMappingRef` | `interface` | `ref`로 얻는 값입니다. [Ref methods](./ref)를 참고하세요. |
| `TableMappingProps` | `interface` | `TableMapping`의 props입니다. [TableMapping props](./table-mapping)를 참고하세요. |

## 데이터

### `HeaderColumnProps`

테이블의 컬럼입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `title` | `string` | 컬럼 제목입니다. |
| `key` | `string` | 컬럼 key입니다. `FieldItem.key`와 매칭되며 `sameNameMapping`이 짝짓는 기준입니다. |

### `FieldItem`

소스 또는 타깃 테이블의 행입니다. `Partial<OuterFieldItem>`도 포함하며, 컬럼 key마다 항목 하나를 가집니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string` | 행의 id입니다. `source-${randomID}` 또는 `target-${randomID}` 형식입니다. |
| `key` | `string` | `HeaderColumnProps.key`와 매칭됩니다. |

### `FieldItemDraft`

`appendSource` / `appendTarget`에 넘기는 행입니다. `Partial<OuterFieldItem>`도 포함합니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string \| undefined` | 여기서만 선택입니다. 생략하면 추가되는 쪽을 접두사로 하는 id가 생성됩니다. |
| `key` | `string` | 필수입니다. 나머지는 자동으로 채워지지 않습니다. |

### `Mapping`

소스와 타깃 사이의 연결 하나입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `id` | `string` | `mapping-${source.id}-${target.id}` 형식입니다. |
| `source` | `string` | 소스 필드 id입니다. |
| `target` | `string` | 타깃 필드 id입니다. |


### `OuterFieldItem`

인덱스 시그니처입니다. 각 key는 컬럼 key이며, 값은 세 가지 셀 형태 중 하나이거나 일반 `string`입니다.

#### `type: 'string'`

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `type` | `'string'` | 일반 값입니다. |
| `columnKey` | `string` | `HeaderColumnProps.key`와 매칭됩니다. |
| `value` | `string` | 표시되는 값입니다. |

#### `type: 'input'`

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `type` | `'input'` | 편집 가능한 텍스트 셀입니다. |
| `columnKey` | `string` | `HeaderColumnProps.key`와 매칭됩니다. |
| `value` | `string` | controlled 값입니다. |
| `defaultValue` | `string` | 초기값입니다. |
| `attributes` | `Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'>` | `<input>`에 전달되는 속성입니다. |
| `onChange` | `(value: string) => void` | 새 값과 함께 호출됩니다. |

#### `type: 'select'`

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `type` | `'select'` | select 셀입니다. |
| `columnKey` | `string` | `HeaderColumnProps.key`와 매칭됩니다. |
| `value` | `string` | controlled 값입니다. |
| `defaultValue` | `string` | 초기값입니다. |
| `attributes` | `Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'>` | `<select>`에 전달되는 속성입니다. |
| `options` | `{ label: string; value: string; disabled?: boolean }[]` | 선택지입니다. |
| `onChange` | `(value: string) => void` | 새 값과 함께 호출됩니다. |

## 변경 보고

### `TableMappingState`

sources, targets, mappings입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `sources` | `FieldItemInput[]` | 소스 행입니다. |
| `targets` | `FieldItemInput[]` | 타깃 행입니다. |
| `mappings` | `Mapping[]` | 매핑입니다. |

### `TableMappingStateWithAction`

`TableMappingState`를 확장합니다. `onMappingChange`가 받는 값입니다.

| 멤버 | 타입 | 설명 |
| --- | --- | --- |
| `action` | `NotifyAction` | 변경의 원인입니다. |

### `TableMappingActionType`

다음 중 하나입니다. `ADD_MAPPING`, `REMOVE_MAPPING`, `CLEAR_MAPPINGS`, `UPDATE_MAPPINGS`, `SAME_LINE_MAPPING`, `SAME_NAME_MAPPING`, `APPEND_SOURCE`, `REMOVE_SOURCE`, `UPDATE_SOURCE_FIELDS`, `UPDATE_SOURCE_FIELD_VALUE`, `APPEND_TARGET`, `REMOVE_TARGET`, `UPDATE_TARGET_FIELDS`, `UPDATE_TARGET_FIELD_VALUE`.

### `NotifyAction`

`type`으로 구분되는 유니온입니다. 각 멤버는 `{ type, payload }`입니다.

| type | payload 키 |
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

다음 중 하나입니다. `'bezier'`, `'straight'`, `'step'`. 기본값은 `straight`입니다.

### `FieldItemInput`

`Partial<FieldItem>`. 내부 속성이 없는 행이며 사용자 입력용입니다.
