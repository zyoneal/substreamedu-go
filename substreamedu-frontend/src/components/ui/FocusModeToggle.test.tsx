import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FocusModeToggle } from './FocusModeToggle';

describe('FocusModeToggle', () => {
  it('toggles aria-pressed and labels between inactive and active focus states', () => {
    const onToggle = jest.fn();
    const { rerender } = render(<FocusModeToggle active={false} onToggle={onToggle} />);

    const btn = screen.getByRole('button', { name: 'Focus' });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
    expect(btn).toHaveAttribute('data-focus-mode', 'false');

    fireEvent.click(btn);
    expect(onToggle).toHaveBeenCalledTimes(1);

    rerender(<FocusModeToggle active={true} onToggle={onToggle} />);
    const exitBtn = screen.getByRole('button', { name: 'Exit focus' });
    expect(exitBtn).toHaveAttribute('aria-pressed', 'true');
    expect(exitBtn).toHaveAttribute('data-focus-mode', 'true');
  });
});
