import { useCallback, useState } from 'react';

export interface GetMappingLinePropsParams {
  id: string;
}

export interface MappingLineProps {
  onClick: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  style: React.CSSProperties;
  /** Present only while hovered — `false` would render as the string "false" and always match. */
  'data-hovered': true | undefined;
}

export interface GetRemoveMappingPropsParams {
  id: string;
}

export interface RemoveMappingProps {
  type: 'button';
  onClick: (event: React.MouseEvent) => void;
}

export interface UseMappingPropsParams {
  /**
   * Called when a line or its remove control is activated. Whether that ends in the mapping
   * being removed is the caller's to decide — ask first, undo later, or ignore it.
   */
  onRemove: (mappingId: string) => void;
  /**
   * Stops lines answering the pointer at all. Pass it while a drag is in progress too: a line
   * should not light up under the pointer that is busy drawing another one.
   */
  disabled?: boolean;
}

/**
 * The props for a drawn mapping: the line itself, and a control that removes it.
 *
 * Hovering is tracked here rather than left to CSS because more than the line's own appearance
 * depends on it — a remove control that only exists while hovered, a label, a highlight on the
 * two rows at either end. `:hover` can style one element; this says which mapping is under the
 * pointer, and lets a caller do what they like with the answer.
 *
 * The line's own `onClick` belongs on whatever element wraps the whole line — its stroke, its
 * hit area, and any control drawn on it. Put it on one child instead and a press that starts on
 * the stroke but ends on a sibling produces a click on the wrapper, where nothing is listening.
 *
 * `pointer-events: stroke` is what gives the line its hits back: the canvas over the tables
 * takes none, so without this a line would be undrawn as far as the pointer is concerned. It
 * means the stroke, not the area a curve encloses — a bezier's bay is not part of the line.
 *
 * Nothing here is cached. A handler with a new identity is swapped into React's own table and
 * nothing observable happens, unlike a ref, which is detached and re-attached — so caching
 * these would buy nothing and hide the reason the connector's ref is cached.
 */
export function useMappingProps({ onRemove, disabled = false }: UseMappingPropsParams) {
  const [hovered, setHovered] = useState<string | null>(null);

  // Reported as nothing while interaction is off, rather than remembered. A drag that starts
  // over a line would otherwise leave it lit for the length of the gesture, since the leave
  // that would have cleared it is suppressed too.
  const hoveredMappingId = disabled ? null : hovered;

  const getMappingLineProps = useCallback(
    ({ id }: GetMappingLinePropsParams): MappingLineProps => ({
      onClick: () => {
        if (!disabled) onRemove(id);
      },
      onPointerEnter: () => {
        if (!disabled) setHovered(id);
      },
      onPointerLeave: () => {
        if (!disabled) setHovered(null);
      },
      style: { pointerEvents: disabled ? 'none' : 'stroke' },
      'data-hovered': hoveredMappingId === id || undefined,
    }),
    [disabled, hoveredMappingId, onRemove],
  );

  /** For a pointer that leaves the whole canvas without passing back over the line. */
  const clearHoveredMapping = useCallback(() => setHovered(null), []);

  const getRemoveMappingProps = useCallback(
    ({ id }: GetRemoveMappingPropsParams): RemoveMappingProps => ({
      type: 'button',
      onClick: (event) => {
        // A remove control is often drawn on the line it removes. Without this the click
        // reaches the line as well and the mapping is removed twice — reported twice to the
        // consumer, the second time for a mapping that is already gone.
        event.stopPropagation();

        if (!disabled) onRemove(id);
      },
    }),
    [disabled, onRemove],
  );

  return { hoveredMappingId, clearHoveredMapping, getMappingLineProps, getRemoveMappingProps };
}
