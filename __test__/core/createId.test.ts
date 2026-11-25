import { afterEach, describe, expect, it, vi } from 'vitest';

import { createId } from '@/core/utils/createId';

/**
 * Contract: `createId` is part of the `/core` published subpath (spec section 4) and
 * replaces the `uuid` dependency. The contract is narrow: an RFC 4122 v4-shaped string,
 * distinct on every call.
 *
 * `crypto.randomUUID` is secure-context-only (spec correction C6) — plain http on a LAN
 * dev server gets `undefined`. The fallback path is the actual reason this module exists,
 * so it gets exercised here, not just the happy path: `globalThis.crypto` is stubbed away
 * for one test each, and restored afterwards so nothing leaks between tests.
 */

const V4_SHAPE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createId', () => {
  it('returns an RFC 4122 v4-shaped string', () => {
    expect(createId()).toMatch(V4_SHAPE);
  });

  it('is distinct on each call', () => {
    expect(createId()).not.toBe(createId());
  });

  it('falls back to getRandomValues when crypto.randomUUID is unavailable', () => {
    const realGetRandomValues = globalThis.crypto.getRandomValues.bind(globalThis.crypto);

    vi.stubGlobal('crypto', { getRandomValues: realGetRandomValues });

    const first = createId();
    const second = createId();

    expect(first).toMatch(V4_SHAPE);
    expect(second).toMatch(V4_SHAPE);
    expect(first).not.toBe(second);
  });

  it('falls back to Math.random when getRandomValues is unavailable too', () => {
    vi.stubGlobal('crypto', {});

    const first = createId();
    const second = createId();

    expect(first).toMatch(V4_SHAPE);
    expect(second).toMatch(V4_SHAPE);
    expect(first).not.toBe(second);
  });
});
