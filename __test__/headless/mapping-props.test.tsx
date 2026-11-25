import { act, createEvent, fireEvent, render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useMappingProps } from '@/headless/internal/useMappingProps';

/**
 * A drawn mapping: the line, and the control that removes it.
 *
 * A line is a control rather than a picture, so most of these ask what a keyboard and a screen
 * reader get rather than what the pointer does. The awkward case the getters are shaped around
 * is that the remove control is drawn *on* the line it removes — two of these are about that
 * overlap rather than about either getter on its own.
 */

interface HarnessProps {
  onRemove: (mappingId: string) => void;
  disabled?: boolean;
}

/** A line group with the remove control inside it, as the styled layer draws it. */
const Harness = ({ onRemove, disabled }: HarnessProps) => {
  const { activeMappingId, clearHoveredMapping, getMappingLineProps, getRemoveMappingProps } = useMappingProps({
    mappingIds: ['mapping-1', 'mapping-2'],
    onRemove,
    disabled,
  });

  return (
    <div>
      <div {...getMappingLineProps({ id: 'mapping-1', label: 'COL4 to SUM_COL' })} data-testid="line">
        <span data-testid="stroke">line</span>
        <button {...getRemoveMappingProps({ id: 'mapping-1' })} data-testid="remove">
          remove
        </button>
      </div>

      <div {...getMappingLineProps({ id: 'mapping-2', label: 'COL1 to ID' })} data-testid="other-line" />

      <button type="button" onClick={clearHoveredMapping} data-testid="clear">
        clear
      </button>
      <output data-testid="active">{activeMappingId ?? 'none'}</output>
    </div>
  );
};

describe('getMappingLineProps', () => {
  it('is a named control, so it can be found and read out as one', () => {
    render(<Harness onRemove={vi.fn()} />);

    // The name says which two rows are joined. The curve itself says nothing to a reader.
    expect(screen.getByRole('button', { name: 'COL4 to SUM_COL' })).toBe(screen.getByTestId('line'));
  });

  it('falls back to the mapping id when no label was given', () => {
    const Probe = () => {
      const { getMappingLineProps } = useMappingProps({ mappingIds: ['mapping-9'], onRemove: vi.fn() });

      return <div {...getMappingLineProps({ id: 'mapping-9' })} data-testid="line" />;
    };

    render(<Probe />);

    expect(screen.getByTestId('line')).toHaveAttribute('aria-label', 'mapping-9');
  });

  it('removes on Space without letting the page scroll', () => {
    const onRemove = vi.fn();

    render(<Harness onRemove={onRemove} />);

    const event = createEvent.keyDown(screen.getByTestId('line'), { key: ' ' });

    fireEvent(screen.getByTestId('line'), event);

    expect(onRemove).toHaveBeenCalledWith('mapping-1');
    // A real <button> suppresses this for itself; an element playing one has to say so.
    expect(event.defaultPrevented).toBe(true);
  });

  it('ignores keys that are not an activation', () => {
    const onRemove = vi.fn();

    render(<Harness onRemove={onRemove} />);

    fireEvent.keyDown(screen.getByTestId('line'), { key: 'a' });

    expect(onRemove).not.toHaveBeenCalled();
  });

  it('marks the line under the pointer, and only that one', () => {
    render(<Harness onRemove={vi.fn()} />);

    fireEvent.pointerEnter(screen.getByTestId('line'));

    expect(screen.getByTestId('active')).toHaveTextContent('mapping-1');
    expect(screen.getByTestId('line')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('other-line')).not.toHaveAttribute('data-active');
  });

  it('gives the active mark to the line under the pointer over one that holds focus', () => {
    render(<Harness onRemove={vi.fn()} />);

    // A real focus, not a dispatched event: only a focused element can be asked how it got it.
    screen.getByTestId('line').focus();
    fireEvent.pointerEnter(screen.getByTestId('other-line'));

    expect(screen.getByTestId('active')).toHaveTextContent('mapping-2');
    expect(screen.getByTestId('other-line')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('line')).not.toHaveAttribute('data-active');
  });

  it('falls back to the focused line once the pointer has left', () => {
    render(<Harness onRemove={vi.fn()} />);

    screen.getByTestId('line').focus();
    fireEvent.pointerEnter(screen.getByTestId('other-line'));
    fireEvent.pointerLeave(screen.getByTestId('other-line'));

    expect(screen.getByTestId('active')).toHaveTextContent('mapping-1');
  });

  it('reports which mapping was activated', () => {
    const onRemove = vi.fn();

    render(<Harness onRemove={onRemove} />);

    fireEvent.click(screen.getByTestId('line'));

    expect(onRemove).toHaveBeenCalledWith('mapping-1');
  });

  it('leaves the tab order while interaction is off', () => {
    render(<Harness onRemove={vi.fn()} disabled />);

    // Reachable but inert is worse than absent: it costs a stop that does nothing.
    expect(screen.getByTestId('line')).toHaveAttribute('tabindex', '-1');
  });

  it('marks nothing active while interaction is off', () => {
    render(<Harness onRemove={vi.fn()} disabled />);

    fireEvent.pointerEnter(screen.getByTestId('line'));

    expect(screen.getByTestId('active')).toHaveTextContent('none');
    expect(screen.getByTestId('line')).not.toHaveAttribute('data-active');
  });

  it('activates nothing while interaction is off, by pointer or key', () => {
    const onRemove = vi.fn();

    render(<Harness onRemove={onRemove} disabled />);

    fireEvent.click(screen.getByTestId('line'));
    fireEvent.keyDown(screen.getByTestId('line'), { key: 'Enter' });

    expect(onRemove).not.toHaveBeenCalled();
  });

  it('drops a mark it was already holding when interaction is turned off', () => {
    const { rerender } = render(<Harness onRemove={vi.fn()} />);

    fireEvent.pointerEnter(screen.getByTestId('line'));

    // A drag starting over a line is the real case: the leave that would have cleared this is
    // suppressed too, so a remembered hover would stay lit for the length of the gesture.
    rerender(<Harness onRemove={vi.fn()} disabled />);

    expect(screen.getByTestId('active')).toHaveTextContent('none');
    expect(screen.getByTestId('line')).not.toHaveAttribute('data-active');
  });

  it('forgets the hover when the pointer leaves the canvas without passing back over it', () => {
    render(<Harness onRemove={vi.fn()} />);

    fireEvent.pointerEnter(screen.getByTestId('line'));
    fireEvent.click(screen.getByTestId('clear'));

    expect(screen.getByTestId('active')).toHaveTextContent('none');
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

  it('leaves one way to remove a mapping in the accessibility tree, not two', () => {
    render(<Harness onRemove={vi.fn()} />);

    // The line already is the control, and it carries the name. A second button inside it
    // would be announced as well — and a button inside role="button" is invalid besides.
    expect(screen.getByTestId('remove')).toHaveAttribute('aria-hidden', 'true');
    expect(screen.getByTestId('remove')).toHaveAttribute('tabindex', '-1');
    expect(screen.queryAllByRole('button', { name: 'COL4 to SUM_COL' })).toHaveLength(1);
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

const ListHarness = ({
  initial,
  refuse = false,
  onLastRemoved,
}: {
  initial: string[];
  refuse?: boolean;
  onLastRemoved?: () => void;
}) => {
  const [ids, setIds] = useState(initial);
  const { getMappingLineProps } = useMappingProps({
    mappingIds: ids,
    onRemove: (id) => {
      if (refuse) return false;
      setIds((current) => current.filter((candidate) => candidate !== id));
    },
    onLastRemoved,
  });

  return (
    <div>
      {ids.map((id) => (
        <div key={id} {...getMappingLineProps({ id, label: id })} data-testid={id} />
      ))}
    </div>
  );
};

describe('the lines as one tab stop', () => {
  it('lets only one line into the tab order, and walks them with the arrow keys and Home/End, the stop following', async () => {
    const user = userEvent.setup();
    render(<ListHarness initial={['m1', 'm2', 'm3']} />);

    expect(screen.getAllByRole('button').filter((line) => line.tabIndex === 0)).toHaveLength(1);

    screen.getByTestId('m1').focus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByTestId('m2')).toHaveFocus();
    expect(screen.getByTestId('m2')).toHaveAttribute('tabindex', '0');
    expect(screen.getByTestId('m1')).toHaveAttribute('tabindex', '-1');

    await user.keyboard('{End}');
    expect(screen.getByTestId('m3')).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByTestId('m1')).toHaveFocus();
    await user.keyboard('{Home}');
    expect(screen.getByTestId('m1')).toHaveFocus();
  });

  it('removes the focused line with Delete or Backspace too', async () => {
    const user = userEvent.setup();
    render(<ListHarness initial={['m1', 'm2', 'm3']} />);

    screen.getByTestId('m1').focus();
    await user.keyboard('{Delete}');
    expect(screen.queryByTestId('m1')).toBeNull();

    await user.keyboard('{Backspace}');
    expect(screen.queryByTestId('m2')).toBeNull();
  });

  it('moves focus to the next line after a removal, or the previous at the end', async () => {
    const user = userEvent.setup();
    render(<ListHarness initial={['m1', 'm2', 'm3']} />);

    screen.getByTestId('m2').focus();
    await user.keyboard('{Enter}');
    expect(screen.getByTestId('m3')).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(screen.getByTestId('m1')).toHaveFocus();
  });

  it('hands focus back to the caller when the last line goes', async () => {
    const user = userEvent.setup();
    const onLastRemoved = vi.fn();
    render(<ListHarness initial={['m1']} onLastRemoved={onLastRemoved} />);

    screen.getByTestId('m1').focus();
    await user.keyboard('{Enter}');

    expect(onLastRemoved).toHaveBeenCalledTimes(1);
  });

  it('leaves focus where it is when the removal is refused', async () => {
    const user = userEvent.setup();
    render(<ListHarness initial={['m1', 'm2']} refuse />);

    screen.getByTestId('m1').focus();
    await user.keyboard('{Enter}');

    expect(screen.getByTestId('m1')).toHaveFocus();
  });

  it('does not move focus to a neighbour after a pointer click', async () => {
    const user = userEvent.setup();
    render(<ListHarness initial={['m1', 'm2', 'm3']} />);

    await user.click(screen.getByTestId('m1'));

    expect(screen.queryByTestId('m1')).toBeNull();
    expect(screen.getByTestId('m2')).not.toHaveFocus();
  });

  it('moves focus to a neighbour after a click with no pointer behind it', () => {
    render(<ListHarness initial={['m1', 'm2', 'm3']} />);

    screen.getByTestId('m1').focus();
    fireEvent.click(screen.getByTestId('m1'), { detail: 0 });

    expect(screen.getByTestId('m2')).toHaveFocus();
  });
});

describe('the lines and modified keys, or keys from inside them', () => {
  it('leaves Alt+Arrow to the browser: no focus move, not prevented', () => {
    render(<ListHarness initial={['m1', 'm2']} />);
    screen.getByTestId('m1').focus();

    const notPrevented = fireEvent.keyDown(screen.getByTestId('m1'), { key: 'ArrowLeft', altKey: true });

    expect(notPrevented).toBe(true);
    expect(screen.getByTestId('m1')).toHaveFocus();
  });

  it.each([
    ['Ctrl+Delete', { key: 'Delete', ctrlKey: true }],
    ['Ctrl+Backspace', { key: 'Backspace', ctrlKey: true }],
    ['Shift+Delete', { key: 'Delete', shiftKey: true }],
  ])('does not remove on %s', (_name, init) => {
    render(<ListHarness initial={['m1', 'm2']} />);

    fireEvent.keyDown(screen.getByTestId('m1'), init);

    expect(screen.getByTestId('m1')).toBeInTheDocument();
  });

  it('still removes on a plain Delete', () => {
    render(<ListHarness initial={['m1', 'm2']} />);

    fireEvent.keyDown(screen.getByTestId('m1'), { key: 'Delete' });

    expect(screen.queryByTestId('m1')).toBeNull();
  });

  it.each(['Enter', ' ', 'Delete'])('ignores %j bubbling up from the control inside the line', (key) => {
    const onRemove = vi.fn();

    render(<Harness onRemove={onRemove} />);

    const notPrevented = fireEvent.keyDown(screen.getByTestId('remove'), { key });

    expect(onRemove).not.toHaveBeenCalled();
    expect(notPrevented).toBe(true);
  });
});

describe('a pointer that moves without a leave being sent', () => {
  // The hovered line is repainted and its remove control unmounts under the pointer, so a browser
  // may never send the pointerleave. The pointer's next move is what tells where it is now.
  // jsdom has no PointerEvent; a MouseEvent of that type carries clientX/clientY, which is all
  // the document-level listener reads.
  const move = (target: Element, clientX: number, clientY: number) =>
    fireEvent(target, new MouseEvent('pointermove', { bubbles: true, clientX, clientY }));

  it('drops the hover when the pointer is next seen outside every line', () => {
    render(<Harness onRemove={vi.fn()} />);

    fireEvent.pointerEnter(screen.getByTestId('line'));
    move(screen.getByTestId('clear'), 10, 10);

    expect(screen.getByTestId('active')).toHaveTextContent('none');
    expect(screen.getByTestId('line')).not.toHaveAttribute('data-active');
  });

  it('moves the hover to the line the pointer is next seen over', () => {
    render(<Harness onRemove={vi.fn()} />);

    fireEvent.pointerEnter(screen.getByTestId('line'));
    move(screen.getByTestId('other-line'), 10, 10);

    expect(screen.getByTestId('other-line')).toHaveAttribute('data-active', 'true');
    expect(screen.getByTestId('line')).not.toHaveAttribute('data-active');
  });

  it('ignores a move that has not changed the pointer position', () => {
    render(<Harness onRemove={vi.fn()} />);

    fireEvent.pointerEnter(screen.getByTestId('line'));
    // The pointer is at (10, 10), over the line: still hovered.
    move(screen.getByTestId('stroke'), 10, 10);
    // Browsers repeat a move at the same point after scroll or layout, and the thing under that
    // point may by then be something else. No movement, so no verdict.
    move(screen.getByTestId('clear'), 10, 10);

    expect(screen.getByTestId('line')).toHaveAttribute('data-active', 'true');

    // A move that did go somewhere is still heard.
    move(screen.getByTestId('clear'), 11, 11);

    expect(screen.getByTestId('active')).toHaveTextContent('none');
  });

  it('keeps the line the pointer has moved to when the previous one reports leaving late', () => {
    render(<Harness onRemove={vi.fn()} />);

    fireEvent.pointerEnter(screen.getByTestId('line'));
    fireEvent.pointerEnter(screen.getByTestId('other-line'));
    fireEvent.pointerLeave(screen.getByTestId('line'));

    expect(screen.getByTestId('active')).toHaveTextContent('mapping-2');
    expect(screen.getByTestId('other-line')).toHaveAttribute('data-active', 'true');
  });

  it('hides the keyboard highlight when the pointer moves, and brings it back on a key press', () => {
    render(<Harness onRemove={vi.fn()} />);
    const line = screen.getByTestId('line');

    act(() => line.focus());
    expect(line).toHaveAttribute('data-active', 'true');

    move(screen.getByTestId('clear'), 20, 20);

    expect(line).not.toHaveAttribute('data-active');
    // Only the highlight goes; the keyboard user's place does not.
    expect(line).toHaveFocus();

    fireEvent.keyDown(line, { key: 'a' });

    expect(line).toHaveAttribute('data-active', 'true');
  });
});
