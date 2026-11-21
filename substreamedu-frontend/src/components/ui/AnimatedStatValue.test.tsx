import React from 'react';
import { render, screen } from '@testing-library/react';
import { AnimatedStatValue, STAT_SPRING } from './AnimatedStatValue';

describe('AnimatedStatValue', () => {
  it('exports spring constants and renders initial formatted number with tabular-nums', () => {
    expect(STAT_SPRING).toEqual({ k: 160, c: 24 });
    render(<AnimatedStatValue value={1240} />);
    const el = screen.getByText((1240).toLocaleString());
    expect(el).toBeInTheDocument();
    expect(el).toHaveStyle({ fontVariantNumeric: 'tabular-nums' });
  });

  it('snaps immediately when prefers-reduced-motion is enabled', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = jest.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    const { rerender } = render(<AnimatedStatValue value={5} />);
    expect(screen.getByText('5')).toBeInTheDocument();

    rerender(<AnimatedStatValue value={42} />);
    expect(screen.getByText('42')).toBeInTheDocument();

    window.matchMedia = originalMatchMedia;
  });

  it('handles non-finite values safely as 0', () => {
    render(<AnimatedStatValue value={Number.NaN} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
