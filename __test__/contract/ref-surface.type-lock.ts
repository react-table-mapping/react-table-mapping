/**
 * Type-level freeze — `TableMappingRef` shape (D1).
 *
 * WHAT THIS FREEZES
 * `TableMappingRef` (`src/types/table-mapping.ts:255`) is `ReturnType<typeof useTableMapping>` —
 * an *inferred* type. `docs/specs/2026-08-05-headless-architecture-plan.md` decision D1 requires
 * the observable surface of `TableMappingRef` (member names, signatures, behaviour) to stay
 * 100% identical through the headless-architecture migration. Phase 4 replaces the inferred type
 * with a hand-written `interface`, and nothing forces that hand-written interface to equal what
 * consumers have today — a signature drift (an added parameter, a changed return type, a dropped
 * member) would ship silently as a breaking change inside what is planned as a *minor* release.
 *
 * `TableMappingRefSnapshot` below is that hand-written interface, captured independently from
 * `useTableMapping.ts`'s current return object and the types it references (`FieldItem`,
 * `Mapping`, `TableMappingStore`). It is NOT derived from `TableMappingRef` via `Pick`/`Omit` —
 * doing so would make the equality assertion below track `TableMappingRef` automatically and
 * pass vacuously forever, which defeats the point of a frozen baseline.
 *
 * FAILURE MODE
 * A drift surfaces as a **type error from `yarn type`** (`tsc -b --force`), not a runtime test
 * failure. This file intentionally has no `describe`/`it` blocks and is NOT named `*.test.ts` or
 * `*.spec.ts`, so Vitest's default collection glob (`**\/*.{test,spec}.?(c|m)[jt]s?(x)`, see
 * `vite.config.ts`) never picks it up — `tsconfig.app.json` includes `__test__`, so `tsc -b
 * --force` is the only thing that evaluates it.
 *
 * SEMVER
 * Editing `TableMappingRefSnapshot` to match a new `TableMappingRef` shape is a semver decision,
 * not a test fix — same rule as `__test__/contract/ref-surface.test.tsx`. If the change is
 * consumer-visible, it belongs in a major release; update this file only once that decision has
 * been made deliberately.
 *
 * WHAT PHASE 4 MUST DO
 * When `TableMappingRef` becomes a hand-written `interface` (replacing the current
 * `ReturnType<typeof useTableMapping>`), this file must still type-check against it unmodified.
 * That is the compile-time proof that the new interface reproduces the old one exactly — the
 * missing half of D1's reasoning, which only covers "does the phase-4 adapter satisfy the new
 * interface," not "does the new interface equal the old type."
 *
 * `src/types/table-mapping.d.ts` is a stale, orphaned duplicate of `src/types/table-mapping.ts`
 * (same declarations, older relative-import style) and does not feed the public API — TypeScript
 * module resolution always prefers the sibling `.ts` file for the extensionless import in
 * `src/index.ts` (`export * from './types/table-mapping'`), and nothing in `src/` imports the
 * `.d.ts` file by its explicit name. Confirmed via `tsc --traceResolution`. Worth deleting when
 * phase 4 touches this area, but out of scope for this freeze.
 */
import type { TableMappingStore } from '@/core/store/createTableMappingStore';
import type { FieldItem, Mapping, TableMappingRef } from '@/types/table-mapping';

// Hand-written snapshot of TableMappingRef's current member set (23 members), each signature
// copied from `useTableMapping.ts`'s return statement and cross-checked against
// `createTableMappingStore.ts` for the members that just forward to the store (all of which
// return `void`).
interface TableMappingRefSnapshot {
  // Live values
  sourceFields: FieldItem[];
  targetFields: FieldItem[];
  mappings: Mapping[];
  redrawCount: number;

  // Readers
  getSourceFields: () => FieldItem[];
  getTargetFields: () => FieldItem[];
  getMappings: () => Mapping[];

  // Mapping mutations
  addMapping: (sourceId: string, targetId: string) => void;
  removeMapping: (mappingId: string) => void;
  clearMappings: () => void;
  updateMappings: (next: Mapping[]) => void;
  sameLineMapping: () => void;
  sameNameMapping: (name: string) => void;

  // Source mutations
  appendSource: (source: FieldItem) => void;
  removeSource: (sourceId: string) => void;
  updateSourceFields: (next: FieldItem[]) => void;
  updateSourceFieldValue: (sourceId: string, fieldKey: string, newValue: string) => void;

  // Target mutations
  appendTarget: (target: FieldItem) => void;
  removeTarget: (targetId: string) => void;
  updateTargetFields: (next: FieldItem[]) => void;
  updateTargetFieldValue: (targetId: string, fieldKey: string, newValue: string) => void;

  // Measurement
  redraw: () => void;

  // Internal store handle, leaked into the ref today (`useTableMapping` returns it so
  // `TableMapping` can provide store Context to `EditableCell`). Frozen because it is
  // observably part of `TableMappingRef`, not because it was ever meant to be public API —
  // D1 still covers it, so dropping it is a major-version decision like everything else here.
  _store: TableMappingStore;
}

// Exact (invariant) type equality — the standard distributive-conditional trick. A plain
// `A extends B` is one-directional: it lets B gain members that A lacks go undetected in one
// direction, and lets A gain members B lacks go undetected in the other. Only checking both
// directions at once (this trick, or an explicit `A extends B ? (B extends A ? true : false) :
// false`) catches an added member AND a removed member.
type Equals<A, B> = (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2 ? true : false;

// A failing `Expect<false>` surfaces as: "Type 'false' does not satisfy the constraint 'true'."
// pointing at the line below — that is the type error this freeze exists to produce.
type Expect<T extends true> = T;

export type AssertTableMappingRefMatchesFrozenShape = Expect<Equals<TableMappingRefSnapshot, TableMappingRef>>;
