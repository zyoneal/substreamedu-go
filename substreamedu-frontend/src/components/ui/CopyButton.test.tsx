import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { CopyButton } from './CopyButton';

describe('CopyButton', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('copies text to clipboard, switches to copied state, and resets after timeout', async () => {
    const onCopied = jest.fn();
    render(
      <CopyButton
        text="https://t.me/substreamedu_bot?start=tok123"
        label="Copy link"
        copiedLabel="Copied"
        resetAfterMs={1500}
        onCopied={onCopied}
      />
    );

    const btn = screen.getByRole('button', { name: 'Copy link' });
    expect(btn).toHaveAttribute('data-copied', 'false');

    await act(async () => {
      fireEvent.click(btn);
    });

    await waitFor(() => {
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        'https://t.me/substreamedu_bot?start=tok123'
      );
    });
    expect(onCopied).toHaveBeenCalledWith('https://t.me/substreamedu_bot?start=tok123');
    expect(btn).toHaveAttribute('data-copied', 'true');
    expect(screen.getByText('Copied')).toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(btn).toHaveAttribute('data-copied', 'false');
    expect(screen.getByText('Copy link')).toBeInTheDocument();
  });

  it('does not trigger clipboard write when text is empty', async () => {
    render(<CopyButton text="" ariaLabel="Copy word" />);
    const btn = screen.getByRole('button', { name: 'Copy word' });

    await act(async () => {
      fireEvent.click(btn);
    });

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(btn).toHaveAttribute('data-copied', 'false');
  });
});
