import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useMappingProps } from '@/headless/internal/useMappingProps';

/**
 * A drawn mapping: the line, and the control that removes it.
 *
 * The awkward case these are shaped around is that the remove control is normally drawn *on*
 * the line it removes, so a click reaches both. Two of these are about that overlap rather
 * than about either getter on its own.
 */

interface HarnessProps {
  onRemove: (mappingId: string) => void;
  disabled?: boolean;
}

/** A line group with the remove control inside it, as the styled layer draws it. */
const Harness = ({ onRemove, disabled }: HarnessProps) => {
  const { hoveredMappingId, clearHoveredMapping, getMappingLineProps, getRemoveMappingProps } = useMappingProps({
    onRemove,
    disabled,
  });

  return (
    <div>
      <div {...getMappingLineProps({ id: 'mapping-1' })} data-testid="line">
        <span data-testid="stroke">line</span>
        <button {...getRemoveMappingProps({ id: 'mapping-1' })} data-testid="remove">
          remove
        </button>
      </div>

      <div {...getMappingLineProps({ id: 'mapping-2' })} data-testid="other-line" />

      <button type="button" onClick={clearHoveredMapping} data-testid="clear">
        clear
      </button>
      <output data-testid="hovered">{hoveredMappingId ?? 'none'}</output>
    </div>
  );
};

describe('getMappingLineProps', () => {
  it('marks the line under the pointer, and only that one', () => {
    render(<Harness onRemove={vi.fn()} />);

    fireEvent.pointerEnter(screen.getByTestId('line'));

    expect(screen.getByTestId('hovered')).toHaveTextContent('mapping-1');
    expect(screen.getByTestId('line')).toHaveAttribute('data-hovered', 'true');
    expect(screen.getByTestId('other-line')).not.toHaveAttribute('data-hovered');
  });

  it('reports which mapping was activated', () => {
    const onRemove = vi.fn();

    render(<Harness onRemove={onRemove} />);

    fireEvent.click(screen.getByTestId('line'));

    expect(onRemove).toHaveBeenCalledWith('mapping-1');
  });

  it('says nothing is hovered while interaction is off', () => {
    render(<Harness onRemove={vi.fn()} disabled />);

    fireEvent.pointerEnter(screen.getByTestId('line'));

    expect(screen.getByTestId('hovered')).toHaveTextContent('none');
    expect(screen.getByTestId('line')).not.toHaveAttribute('data-hovered');
  });

  it('activates nothing while interaction is off', () => {
    const onRemove = vi.fn();

    render(<Harness onRemove={onRemove} disabled />);

    fireEvent.click(screen.getByTestId('line'));

    expect(onRemove).not.toHaveBeenCalled();
  });

  it('drops a hover it was already holding when interaction is turned off', () => {
    const { rerender } = render(<Harness onRemove={vi.fn()} />);

    fireEvent.pointerEnter(screen.getByTestId('line'));

    // A drag starting over a line is the real case: the leave that would have cleared this is
    // suppressed too, so a remembered hover would stay lit for the length of the gesture.
    rerender(<Harness onRemove={vi.fn()} disabled />);

    expect(screen.getByTestId('hovered')).toHaveTextContent('none');
    expect(screen.getByTestId('line')).not.toHaveAttribute('data-hovered');
  });

  it('forgets the hover when the pointer leaves the canvas without passing back over it', () => {
    render(<Harness onRemove={vi.fn()} />);

    fireEvent.pointerEnter(screen.getByTestId('line'));
    fireEvent.click(screen.getByTestId('clear'));

    expect(screen.getByTestId('hovered')).toHaveTextContent('none');
  });
});

describe('getRemoveMappingProps', () => {
  it('removes the mapping once, not twice, when the control sits on the line', () => {
    const onRemove = vi.fn();

    render(<Harness onRemove={onRemove} />);

    // A real click on the control bubbles to the line, which removes the same mapping. Without
    // that being stopped the consumer is told twice, the second time about a mapping that is
    // already gone.
    fireEvent.click(screen.getByTestId('remove'));

    expect(onRemove).toHaveBeenCalledTimes(1);
    expect(onRemove).toHaveBeenCalledWith('mapping-1');
  });

  it('does not submit a form it happens to be inside', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    render(
      <form onSubmit={onSubmit}>
        <Harness onRemove={vi.fn()} />
      </form>,
    );

    fireEvent.click(screen.getByTestId('remove'));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
