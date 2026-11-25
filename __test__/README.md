# 테스트 구성

디렉터리가 곧 분류다. 테스트를 추가할 때는 먼저 **어느 계층에 속하는지** 정하고 해당 디렉터리에 넣는다.

계층을 가르는 질문은 하나다.

> **소비자에게 한 약속을 깨지 않는 변경인데도 이 테스트가 실패하는가?**
>
> 그렇다면 족쇄다. 아니라면 안전벨트다.

## 계층

| 디렉터리            | 계층                         | 수명                          | 실패의 의미                                              |
| ------------------- | ---------------------------- | ----------------------------- | -------------------------------------------------------- |
| `contract/`         | Tier 1 · 약속                | 영구 (major에서만 변경)       | 소비자 코드가 깨진다. semver 결정 지점                   |
| `invariant/`        | Tier 2 · 불변식              | 영구 (구현 무관)              | 구현이 틀렸다                                            |
| `characterization/` | Tier 3 · 특성화              | **한시적** (파일 헤더에 명시) | 동작이 바뀌었다. 의도한 것인지 판단 필요 — **현재 없음** |
| `core/`             | Tier 1 · 약속 (`/core` 경계) | 영구 (major에서만 변경)       | `/core` 서브패스 소비자가 깨진다. semver 결정 지점       |

### `contract/` — Tier 1

소비자가 실제로 만지는 표면만 다룬다. 하네스로 `<TableMapping>`을 실제 소비 형태로 렌더하고, 관측 가능한 결과만 단언한다. 내부 함수 호출을 검증하지 않는다.

파일은 **API별이 아니라 "소비자가 무엇을 하려는가"별**로 묶는다. 같은 행위가 여러 진입점(ref · 버튼 · 드래그)으로 도달 가능하므로, 한 파일에 모아야 진입점끼리 어긋났을 때 드러난다.

```
creating-mappings.test.tsx    매핑 생성 — addMapping, sameLineMapping, sameNameMapping
removing-mappings.test.tsx    매핑 삭제 — removeMapping, 라인 클릭, 거부권 프로토콜
managing-rows.test.tsx        행 추가·삭제 + 매핑 캐스케이드
keyboard-access.test.tsx     키보드 접근 — 열당 탭 정지점 하나, 커넥터 이름, 라이브 리전, aria-hidden 감사
editing-values.test.tsx       셀 값 편집 — ref는 즉시, 타이핑은 디바운스
appearance.test.tsx           lineColor lineWidth hoverLineColor noDataComponent disabled
ref-surface.test.tsx          TableMappingRef 멤버 22개 전수
ref-surface.type-lock.ts      TableMappingRef 시그니처 타입 동결 — 런타임 테스트 아님, tsc가 채점 (D1)
controlled-state.test.tsx     props ↔ action 왕복, echo 감지
uncontrolled-usage.test.tsx   콜백 없이 ref로만 쓰는 소비자, 낙관적 적용, 참조 안정성
dom-contract.test.tsx         styled 클래스명·계층 동결 (D3) — 소비자의 유일한 스타일링 경로
```

`ref-surface.test.tsx`는 멤버 **이름과 종류**(`typeof x === 'function'` 등)만 고정한다. 시그니처가
바뀌어도(`addMapping`에 인자 추가, `getMappings` 반환 타입 변경) 통과한다. `ref-surface.type-lock.ts`는
그 구멍을 메운다 — `useTableMapping.ts`의 반환 객체를 독립적으로 손으로 옮겨 적은
`TableMappingRefSnapshot`과 `TableMappingRef`를 양방향(`extends` 양쪽) 타입 동등성으로 비교한다.
실패 형태는 `yarn test`가 아니라 **`yarn type`의 타입 에러**다 — 파일명이 `*.test.ts`도
`*.spec.ts`도 아니므로 Vitest는 이 파일을 수집하지 않는다(수집 대상이 되면 "no tests found"로
실패한다). Phase 4가 `TableMappingRef`를 명시적 `interface`로 바꿀 때 이 파일이 수정 없이
그대로 통과해야 D1이 요구하는 "100% 동일"이 컴파일 타임에 증명된다. 수정이 필요해졌다면 그것은
semver 결정이다 — `contract/`의 다른 파일과 같은 규칙.

#### 두 개의 렌즈

`TableMapping.tsx:37`이 `onStateChange: onMappingChange || (() => {})`이므로, **콜백을 안 넘긴 소비자와 콜백이 아무것도 안 하는 소비자는 컴포넌트에게 동일하다.** 따라서 하네스도 딱 두 개만 두고, 각각 한 가지만 뜻하게 한다.

| 하네스                 | 렌즈   | 뜻                                                                                                            |
| ---------------------- | ------ | ------------------------------------------------------------------------------------------------------------- |
| `renderConsumer()`     | 제어   | 부모가 `onMappingChange`를 받아 되돌려준다. `state()`가 부모 state를 읽으므로 왕복이 완료돼야 통과한다        |
| `renderUncontrolled()` | 비제어 | 부모는 초기값만 준다. `ref`로 조작하고 `ref`로 읽는다. `onMappingChange` 스파이는 발화 관측용으로만 선택 부착 |

세 번째 모드는 없다. "제어인데 부모가 무시한다"는 곧 **비제어**다.

이 계층이 실패해서 테스트를 고쳐야 한다면, 그 수정은 **"약속을 깬다"는 선언**이다. 비용이 아니라 절차다.

### `invariant/` — Tier 2

구현이 바뀌어도 참이어야 하는 관계를 단언한다. 좌표값이 아니라 관계를 쓴다.

```
line-anchors.test.tsx    라인 시작점 == 소스 커넥터 우측 중앙
                         라인 끝점   == 타겟 커넥터 좌측 중앙 (마커 인셋 ≤ 8px)
```

`resolveAnchor()`로 갈아엎어도 그대로 통과해야 한다. 컨테이너 원점이 0이 아닌 레이아웃을 포함하는 이유는 좌표계 실수가 거기서만 드러나기 때문이다.

### `characterization/` — Tier 3

**수명이 있는 테스트.** 리팩터링 안전망으로 만든 도구지 영구 자산이 아니다. 각 파일 헤더에 만료 시점과 그때 할 일을 반드시 적는다. 안 적으면 남는다.

**만료가 날짜나 단계가 아니라 조건이면 이 계층이 아니다.** `dom-contract.test.tsx`가 한동안 여기
있었는데, 그 "만료"는 "D3를 폐기하면"이었다 — 그건 수명이 아니라 **major 결정**이고, 곧
`contract/`의 정의 그 자체다. 지금은 `contract/`에 있다. 헷갈리면 이렇게 묻는다: _언제 지울지
지금 말할 수 있는가?_ 말할 수 없으면 Tier 3가 아니다.

**이 디렉터리는 현재 비어 있고, 그게 정상이다.** 지오메트리 재배선 동안 `geometry-baseline.test.tsx`가
여기 있었다 — `.gitignore`에 올려 각자의 워킹 트리에만 두었는데, 이력에 넣었다가 빼면 PR에 남는
것이 "추가했다가 지웠다"는 잡음뿐이기 때문이다. 역할은 측정 경로를 갈아엎는 동안 출력이 바뀌지
않았음을 증명하는 것이었고, `createLinePath`의 시그니처를 두 번 바꾸고도 `M 0 0 L 93 0`이 그대로임을
이 스냅샷이 보증했다.

**만료 처리도 실측으로 했다.** 마커 인셋을 7에서 9로 훼손했더니 `invariant/line-anchors.test.tsx`와
`core/createLinePath.test.ts`가 각각 실패했다 — 관계는 불변식이, 정확한 숫자는 `/core` 계약이
지킨다. 스냅샷이 더 얹던 것은 **정당한 인셋 조정마다 18개가 거짓 양성으로 걸리는 정밀도**뿐이었다.

발판을 다시 만든다면 같은 규칙으로 한다: gitignore에 올리고, 헤더에 만료를 적고, 만료 시점에
**남은 층이 실제로 무는지 프로브로 확인한 뒤** 지운다.

### `core/`

`src/core/` 아래의 모듈 — 스토어, 좌표 계산, 드래그 상태 머신, id 생성 — 을 다룬다. 디렉터리 이름은
내부 단위처럼 보이지만 실제로는 **Tier 1**이다: `src/core/`는 React나 DOM 없이도 쓸 수 있는
`/core` 서브패스로 그대로 배포되므로(스펙 4절), 여기 실패하면 헤드리스 소비자의 코드가 깨진다.

`vitest.workspace.ts`가 `core` 프로젝트로 따로 분리해 돌린다 — **`environment: 'node'`, `setupFiles`
없음.** `__test__/setup.ts`는 모듈 스코프에서 `window`에 `matchMedia`를 심으므로 DOM 밖에서
임포트되는 순간 던진다. 그래서 `core` 프로젝트는 그 파일을 아예 로드하지 않는다 — 이것이 곧
`/core` 경계의 실행 가능한 증거다: `window`, `document`, React를 건드리는 코드는 여기서 실패해야
컨슈머의 빌드에서가 아니라 이 자리에서 잡힌다.

**환경 때문에 여기 들어온 파일이 하나 있다.** `server-rendering.test.ts`는 계층으로는 Tier 1
(styled 진입점의 약속)이지만, DOM이 전혀 없는 실행이 있어야 증명되므로 이 프로젝트에 둔다.
jsdom에서 돌리면 모듈 스코프의 `window` 접근이 통과해버려 실제 SSR에서만 터진다. "디렉터리가 곧
분류"와 어긋나는 첫 사례이고, SSR 케이스가 셋으로 늘어날 때 배치를 다시 정한다.

> `include`가 `__test__/core/**/*.test.ts`라 **`.tsx`는 어느 프로젝트에서도 수집되지 않는다.**
> JSX가 필요하면 `createElement`로 쓴다.

`core/`가 다루는 모듈은 이미 공개 서브패스이므로 `contract/`와 같은 규칙으로 **영구**이고,
시그니처를 바꾸는 것은 major 결정이다.

스토어(`createTableMappingStore.test.ts`)도 여기 있다. `unit/`에 있다가 1단계에서 소스가
`src/core/store/`로 옮겨가면서 함께 왔다. 22개 케이스 전부가 공개 `TableMappingStore`
인터페이스의 멤버를 겨냥하므로 — 그리고 `StoreTopic`이 export되는 템플릿 리터럴 타입이라
토픽 문자열 형식까지 공개 표면이므로 — 이건 유닛 테스트가 아니라 `/core` 계약 테스트다.

```
createLinePath.test.ts   bezier/step/straight의 도형, markerInset
resolveAnchor.test.ts    컨테이너 원점 차감, anchor별 offset 방향
mappingHit.test.ts       반경 내 최근접 후보, 동률 처리, 경계값
dragReducer.test.ts      포인터·키보드 제스처의 모든 상태 전이
createId.test.ts         v4 형태, crypto.randomUUID 부재 시 폴백
```

Rect처럼 DOM이 있어야 나올 값도 `core/`에서는 순수 객체로 직접 만든다 — `helpers/rects.ts`는
jsdom 전용이라 여기서는 쓸 수 없다.

## 공용 도구

| 파일                       | 역할                                                            |
| -------------------------- | --------------------------------------------------------------- |
| `helpers/consumer.tsx`     | 소비자 하네스. `renderConsumer()`, 픽스처, `state()`/`push()`   |
| `helpers/rects.ts`         | 엘리먼트별 `getBoundingClientRect` 스텁 (`afterEach` 자동 해제) |
| `helpers/dom-structure.ts` | tag + class + 계층만 직렬화 (aria/role 추가에 둔감)             |
| `environment.test.tsx`     | `setup.ts`가 전역 패치로 되돌아가지 않았는지 확인               |

`setup.ts`는 **환경 shim만** 둔다. 전역 monkey-patch 금지 — 모든 엘리먼트가 같은 rect를 반환하면 지오메트리 회귀를 원리적으로 감지할 수 없다. 좌표가 필요하면 `helpers/rects.ts`로 테스트별로 심는다.

**shim은 `src/`에 소비자가 생긴 뒤에 심는다.** 한때 `ResizeObserver` fake와 `PointerEvent` 폴리필이 아직 시작하지 않은 작업을 위해 미리 전역 설치돼 있었는데, `src/` 어디도 두 API를 쓰지 않아 스위트 전체가 소비자 없는 픽스처 위에서 돌고 있었다. 프로브로 확인한 결과 둘을 걷어내도 빨개지는 것은 그 자체를 검사하던 `environment.test.tsx` 2건뿐이었다. 미리 심으면 정작 그 API를 쓰게 된 단계가 **콜백이 절대 돌지 않는 fake를 조용히 물려받는다.**

`ResizeObserver` fake는 `useGeometry`가 실제로 쓰기 시작하면서 돌아왔다(`helpers/observers.ts`). `PointerEvent` 폴리필은 아직 없다 — 포인터 드래그를 배선하는 시점에, 그 파일에 지역 설치할 것.

**하네스에 보장을 하나 올릴 때마다 `environment.test.tsx`에 단언을 하나 올린다.** 문서는 낡아도 조용하지만 스모크는 낡으면 빨간불이 된다. 이 fake의 경우 지켜야 할 것은 존재가 아니라 **무발화**다 — 실측으로, shim을 통째로 지우면 122건이 실패하지만(신호 충분) `observe()`에서 발화하도록 바꾸면 19개 파일이 전부 통과한다(신호 0).

## 실패했을 때

```
테스트가 실패했다
   │
   ├─ 이 변경이 소비자에게 보이는가?
   │     ├─ YES → semver 결정 지점. 테스트 수정은 약속을 깬다는 선언.
   │     └─ NO  → 테스트 설계가 잘못됐다. 고치는 게 맞다.
   │              단, 왜 false positive가 났는지 기록한다.
   │              Tier 3에서 반복되면 수명을 다했다는 신호다.
```
