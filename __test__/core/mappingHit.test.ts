import { describe, expect, it } from 'vitest';

import { type MappingHitCandidate, mappingHit } from '@/core/geometry/mappingHit';

/**
 * Contract: `mappingHit` is part of the `/core` published subpath (spec section 4).
 *
 * The behaviour that matters here is the switch from "first candidate found within radius"
 * (the old styled loop in `TableMapping.handleDragEnd`) to "nearest candidate within
 * radius". They only disagree when two candidates are both in range — so that is the case
 * that has to discriminate them.
 */

describe('mappingHit', () => {
  it('returns the nearest candidate within range, even when a farther one comes first', () => {
    const point = { x: 0, y: 0 };
    const candidates: MappingHitCandidate[] = [
      { id: 'far-but-first', point: { x: 10, y: 0 } }, // distance 10
      { id: 'near-but-second', point: { x: 5, y: 0 } }, // distance 5
    ];

    // The old first-found loop would have returned 'far-but-first'.
    expect(mappingHit({ point, candidates, radius: 15 })).toBe('near-but-second');
  });

  it('returns null when nothing is within radius', () => {
    const point = { x: 0, y: 0 };
    const candidates: MappingHitCandidate[] = [
      { id: 'a', point: { x: 100, y: 0 } },
      { id: 'b', point: { x: 0, y: 200 } },
    ];

    expect(mappingHit({ point, candidates, radius: 15 })).toBeNull();
  });

  it('treats a candidate exactly on the radius boundary as a hit', () => {
    const point = { x: 0, y: 0 };
    const candidates: MappingHitCandidate[] = [{ id: 'on-boundary', point: { x: 15, y: 0 } }];

    expect(mappingHit({ point, candidates, radius: 15 })).toBe('on-boundary');
  });

  it('keeps the earlier candidate on a tie', () => {
    const point = { x: 0, y: 0 };
    const candidates: MappingHitCandidate[] = [
      { id: 'first', point: { x: 5, y: 0 } },
      { id: 'second', point: { x: 0, y: 5 } },
    ];

    expect(mappingHit({ point, candidates, radius: 15 })).toBe('first');
  });

  it('returns null for an empty candidate list', () => {
    expect(mappingHit({ point: { x: 0, y: 0 }, candidates: [], radius: 15 })).toBeNull();
  });
});
