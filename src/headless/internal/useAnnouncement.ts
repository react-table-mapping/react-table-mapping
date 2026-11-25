import { useCallback, useRef, useState } from 'react';

export interface AnnouncementStrings {
  connectStart: (context: { source: string }) => string;
  connect: (context: { source: string; target: string; total: number }) => string;
  disconnect: (context: { mapping: string; total: number }) => string;
  cancel: (context: { source: string }) => string;
  clear: (context: { count: number }) => string;
}

/**
 * What gets said, in English.
 *
 * Every one is replaceable, so translating is the caller's to do rather than something this
 * package guesses at. Counts are included because "connected" on its own leaves someone who
 * cannot see the drawing with no way to tell whether it worked.
 */
export const defaultAnnouncements: AnnouncementStrings = {
  connectStart: ({ source }) =>
    `Started connecting from ${source}. Choose a target and press Enter to connect, or Escape to cancel.`,
  connect: ({ source, target, total }) =>
    `Connected ${source} to ${target}. ${total} connection${total === 1 ? '' : 's'} total.`,
  disconnect: ({ mapping, total }) => `Removed ${mapping}. ${total} connection${total === 1 ? '' : 's'} remaining.`,
  cancel: ({ source }) => `Cancelled connecting from ${source}.`,
  clear: ({ count }) => `Removed all ${count} connections.`,
};

export interface LiveRegionProps {
  role: 'status';
  'aria-live': 'polite';
  'aria-atomic': true;
  /** Visually hidden, but present and readable. `display: none` would silence it. */
  style: React.CSSProperties;
}

/**
 * The running commentary a screen reader hears.
 *
 * Connecting two fields is a change to a drawing, and a drawing says nothing. Without this, a
 * keyboard user presses Enter and gets silence — no way to tell a connection from a refusal.
 *
 * Each message carries a sequence number that never repeats. A live region only announces text
 * that *changed*, so connecting the same two fields twice in a row would be announced once;
 * the number is invisible in the region and makes every message a change.
 */
export function useAnnouncement(strings: Partial<AnnouncementStrings> = {}) {
  const [announcement, setAnnouncement] = useState('');
  const sequence = useRef(0);
  const latestStrings = useRef(strings);

  latestStrings.current = strings;

  const announce = useCallback(
    <K extends keyof AnnouncementStrings>(kind: K, context: Parameters<AnnouncementStrings[K]>[0]) => {
      const say = latestStrings.current[kind] ?? defaultAnnouncements[kind];

      sequence.current += 1;

      // The zero-width space carries the sequence without being read out or taking up space.
      setAnnouncement(`${(say as (c: typeof context) => string)(context)}${'​'.repeat(sequence.current % 2)}`);
    },
    [],
  );

  const getLiveRegionProps = useCallback(
    (): LiveRegionProps => ({
      role: 'status',
      'aria-live': 'polite',
      'aria-atomic': true,
      style: {
        position: 'absolute',
        width: 1,
        height: 1,
        overflow: 'hidden',
        clip: 'rect(0 0 0 0)',
        whiteSpace: 'nowrap',
        border: 0,
        padding: 0,
        margin: -1,
      },
    }),
    [],
  );

  return { announcement, announce, getLiveRegionProps };
}
