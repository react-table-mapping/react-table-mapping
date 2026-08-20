import { render } from '@testing-library/react';
import { createRef, useState } from 'react';
import { type Mock, vi } from 'vitest';

import TableMapping from '@/components/TableMapping';
import type {
  FieldItemInput,
  Mapping,
  NotifyAction,
  TableMappingProps,
  TableMappingRef,
  TableMappingStateWithAction,
} from '@/types/table-mapping';

/**
 * Consumer harness — renders TableMapping the way a real consumer does.
 *
 * The library is fully controlled: it owns no persistent state, and every mutation is
 * reported through `onMappingChange` for the parent to feed back as props. Testing the
 * hook directly with renderHook bypasses that whole contract — the ref path through
 * useImperativeHandle, the prop round-trip, the callback props. This harness exercises
 * the surface a consumer actually touches.
 *
 * `state()` reads the PARENT's state, not the library's, so an assertion only passes if
 * the change actually completed the round-trip out to the consumer.
 */

export const SOURCE_COLUMNS = [{ key: 'name', title: 'Name' }];
export const TARGET_COLUMNS = [{ key: 'name', title: 'Name' }];

export function sourceFixture(count = 3): FieldItemInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `source-${i + 1}`,
    key: `source-${i + 1}`,
    name: { type: 'string' as const, columnKey: 'name', value: `S${i + 1}` },
  }));
}

export function targetFixture(count = 3): FieldItemInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `target-${i + 1}`,
    key: `target-${i + 1}`,
    name: { type: 'input' as const, columnKey: 'name', value: `T${i + 1}` },
  }));
}

export function mappingOf(sourceId: string, targetId: string): Mapping {
  return { id: `mapping-${sourceId}-${targetId}`, source: sourceId, target: targetId };
}

type PassThroughProps = Omit<TableMappingProps, 'ref' | 'sources' | 'targets' | 'mappings'>;

export interface ConsumerOptions extends Partial<PassThroughProps> {
  sources?: FieldItemInput[];
  targets?: FieldItemInput[];
  mappings?: Mapping[];
}

export interface ConsumerHarness {
  ref: React.RefObject<TableMappingRef | null>;
  onMappingChange: Mock<[TableMappingStateWithAction], void>;
  container: HTMLElement;
  /** The parent component's current state — proof the round-trip completed. */
  state: () => { sources: FieldItemInput[]; targets: FieldItemInput[]; mappings: Mapping[] };
  actions: () => NotifyAction[];
  lastAction: () => NotifyAction | undefined;
  actionTypes: () => string[];
  /** Push new props from the parent, the way a consumer would after its own state change. */
  push: (next: Partial<{ sources: FieldItemInput[]; targets: FieldItemInput[]; mappings: Mapping[] }>) => void;
  unmount: () => void;
}

const STATE_READOUT = 'consumer-state';

export function renderConsumer(options: ConsumerOptions = {}): ConsumerHarness {
  const {
    sources: initialSources = sourceFixture(),
    targets: initialTargets = targetFixture(),
    mappings: initialMappings = [],
    sourceColumns = SOURCE_COLUMNS,
    targetColumns = TARGET_COLUMNS,
    ...passThrough
  } = options;

  const ref = createRef<TableMappingRef>();
  const onMappingChange = vi.fn<[TableMappingStateWithAction], void>();
  const controls: { push?: ConsumerHarness['push'] } = {};

  function Consumer() {
    const [sources, setSources] = useState(initialSources);
    const [targets, setTargets] = useState(initialTargets);
    const [mappings, setMappings] = useState(initialMappings);

    controls.push = (next) => {
      if (next.sources) setSources(next.sources);
      if (next.targets) setTargets(next.targets);
      if (next.mappings) setMappings(next.mappings);
    };

    const handleChange = (next: TableMappingStateWithAction) => {
      onMappingChange(next);

      setSources(next.sources);
      setTargets(next.targets);
      setMappings(next.mappings);
    };

    return (
      <>
        <div data-testid={STATE_READOUT}>{JSON.stringify({ sources, targets, mappings })}</div>
        <TableMapping
          ref={ref}
          sources={sources}
          targets={targets}
          mappings={mappings}
          sourceColumns={sourceColumns}
          targetColumns={targetColumns}
          onMappingChange={handleChange}
          {...passThrough}
        />
      </>
    );
  }

  const { container, unmount } = render(<Consumer />);

  const actions = () => onMappingChange.mock.calls.map(([state]) => state.action);

  return {
    ref,
    onMappingChange,
    container,
    state: () => JSON.parse(container.querySelector(`[data-testid="${STATE_READOUT}"]`)!.textContent!),
    actions,
    lastAction: () => actions().at(-1),
    actionTypes: () => actions().map((a) => a.type),
    push: (next) => controls.push!(next),
    unmount,
  };
}

/** Remove buttons, in row order. Source rows put the button before the row, target rows after. */
export function removeButtons(container: HTMLElement, side: 'source' | 'target'): HTMLButtonElement[] {
  return Array.from(container.querySelectorAll<HTMLButtonElement>(`.${side}-table-body .mapping-button`));
}

/**
 * Uncontrolled harness — renders TableMapping the way a consumer would who supplies initial
 * values only and drives the rest through `ref`, never feeding `onMappingChange` back into
 * props. See `docs/HANDOFF.md` item C0 and `contract/uncontrolled-usage.test.tsx`.
 *
 * `propMode` controls what the parent hands down on every render:
 * - 'stable' passes the same array reference the parent already holds (no re-creation)
 * - 'inline' rebuilds a fresh array literal every render, mirroring `sources={[...items]}`
 *   in real consumer code
 *
 * `rerenderParent` forces a re-render for a reason unrelated to sources/targets/mappings
 * (an unrelated tick). `pushProps` is a deliberate reference-changing update, the way a
 * consumer might reload initial data.
 */

export type UncontrolledPropMode = 'stable' | 'inline';

export interface UncontrolledOptions {
  sources?: FieldItemInput[];
  targets?: FieldItemInput[];
  mappings?: Mapping[];
  propMode?: UncontrolledPropMode;
  /** Omit entirely to prove the ref surface works without any callback at all. */
  onMappingChange?: (next: TableMappingStateWithAction) => void;
  sourceColumns?: TableMappingProps['sourceColumns'];
  targetColumns?: TableMappingProps['targetColumns'];
}

export interface UncontrolledHarness {
  ref: React.RefObject<TableMappingRef | null>;
  container: HTMLElement;
  /** Re-renders the parent for a reason unrelated to sources/targets/mappings. */
  rerenderParent: () => void;
  /** Pushes a genuinely new reference for the given slices, independent of `propMode`. */
  pushProps: (next: Partial<{ sources: FieldItemInput[]; targets: FieldItemInput[]; mappings: Mapping[] }>) => void;
  unmount: () => void;
}

export function renderUncontrolled(options: UncontrolledOptions = {}): UncontrolledHarness {
  const {
    sources: initialSources = sourceFixture(),
    targets: initialTargets = targetFixture(),
    mappings: initialMappings = [],
    propMode = 'stable',
    onMappingChange,
    sourceColumns = SOURCE_COLUMNS,
    targetColumns = TARGET_COLUMNS,
  } = options;

  const ref = createRef<TableMappingRef>();
  const controls: { bump?: () => void; push?: UncontrolledHarness['pushProps'] } = {};

  function Parent() {
    const [sources, setSources] = useState(initialSources);
    const [targets, setTargets] = useState(initialTargets);
    const [mappings, setMappings] = useState(initialMappings);
    const [, setTick] = useState(0);

    controls.bump = () => setTick((t) => t + 1);
    controls.push = (next) => {
      if (next.sources) setSources(next.sources);
      if (next.targets) setTargets(next.targets);
      if (next.mappings) setMappings(next.mappings);
    };

    // 'inline' manufactures a fresh literal on every render — the sharp edge documented in
    // docs/HANDOFF.md C0. 'stable' hands the state reference through untouched.
    const propSources = propMode === 'inline' ? [...sources] : sources;
    const propTargets = propMode === 'inline' ? [...targets] : targets;
    const propMappings = propMode === 'inline' ? [...mappings] : mappings;

    return (
      <TableMapping
        ref={ref}
        sources={propSources}
        targets={propTargets}
        mappings={propMappings}
        sourceColumns={sourceColumns}
        targetColumns={targetColumns}
        onMappingChange={onMappingChange}
      />
    );
  }

  const { container, unmount } = render(<Parent />);

  return {
    ref,
    container,
    rerenderParent: () => controls.bump!(),
    pushProps: (next) => controls.push!(next),
    unmount,
  };
}
