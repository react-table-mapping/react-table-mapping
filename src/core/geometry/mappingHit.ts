import type { Point } from '@/core/types';

export interface MappingHitCandidate {
  id: string;
  point: Point;
}

export interface MappingHitParams {
  /** Where the drop happened, in the same coordinate space as the candidates. */
  point: Point;
  candidates: MappingHitCandidate[];
  /** How far from a candidate a drop still counts as landing on it. */
  radius: number;
}

/**
 * Finds which connector a drop at `point` lands on, or null if none is close enough.
 *
 * Returns the **nearest** candidate inside `radius`, not merely the first one found. Raising
 * the radius, or laying rows out closer together, can put more than one connector in range at
 * once — picking by proximity is what keeps the drop from connecting to a neighbour instead.
 *
 * A candidate exactly `radius` away counts as a hit. Equal distances keep the earlier
 * candidate, so the result stays stable for a given ordering.
 *
 * Distance is measured radially rather than by bounding box, matching the round shape a
 * connector is drawn with.
 */
export function mappingHit({ point, candidates, radius }: MappingHitParams): string | null {
  let closestId: string | null = null;
  let closestDistance = Infinity;

  for (const candidate of candidates) {
    const dx = point.x - candidate.point.x;
    const dy = point.y - candidate.point.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance <= radius && distance < closestDistance) {
      closestDistance = distance;
      closestId = candidate.id;
    }
  }

  return closestId;
}
