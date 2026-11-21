import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { LoadingToSuccessButton } from './LoadingToSuccessButton';

describe('LoadingToSuccessButton', () => {
  it('renders idle, loading, and success states with proper aria-busy and disabled attributes', () => {
    const onClick = jest.fn();
    const { rerender } = render(
      <LoadingToSuccessButton
        state="idle"
        idleLabel="Export Anki"
        loadingLabel="Exporting..."
        successLabel="Exported"
        onClick={onClick}
      />
    );

    const btn = screen.getByRole('button', { name: /Export Anki/i });
    expect(btn).not.toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'false');
    expect(btn).toHaveAttribute('data-state', 'idle');

    fireEvent.click(btn);
    expect(onClick).toHaveBeenCalledTimes(1);

    rerender(
      <LoadingToSuccessButton
        state="loading"
        idleLabel="Export Anki"
        loadingLabel="Exporting..."
        successLabel="Exported"
        onClick={onClick}
      />
    );

    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toHaveAttribute('data-state', 'loading');
    expect(screen.getByText('Exporting...')).toBeInTheDocument();

    rerender(
      <LoadingToSuccessButton
        state="success"
        idleLabel="Export Anki"
        loadingLabel="Exporting..."
        successLabel="Exported"
        onClick={onClick}
      />
    );

    expect(btn).not.toBeDisabled();
    expect(btn).toHaveAttribute('aria-busy', 'false');
    expect(btn).toHaveAttribute('data-state', 'success');
    expect(screen.getByText('Exported')).toBeInTheDocument();
  });
});
