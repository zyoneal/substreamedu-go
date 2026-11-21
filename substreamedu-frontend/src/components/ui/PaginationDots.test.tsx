import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PaginationDots, {
  STRIP_SPRING,
  LEADING_EDGE_SPRING,
  TRAILING_EDGE_SPRING,
} from './PaginationDots';

describe('PaginationDots', () => {
  const slides = [
    { id: 'watch', label: 'Highlight & save in context', content: <div>Slide 1 content</div> },
    { id: 'review', label: 'Review as FSRS flashcard', content: <div>Slide 2 content</div> },
  ];

  it('uses the exact designbookmark spring parameters', () => {
    expect(STRIP_SPRING).toEqual({ k: 170, c: 22 });
    expect(LEADING_EDGE_SPRING).toEqual({ k: 520, c: 34 });
    expect(TRAILING_EDGE_SPRING).toEqual({ k: 140, c: 18 });
  });

  it('renders dots with aria-selected state and switches slide on dot click', () => {
    const onSlideChange = jest.fn();
    render(
      <PaginationDots
        slides={slides}
        ariaLabel="Learning loop preview"
        onSlideChange={onSlideChange}
      />
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByText(/Highlight & save in context/i)).toBeInTheDocument();

    act(() => {
      fireEvent.click(tabs[1]);
    });

    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(onSlideChange).toHaveBeenCalledWith(1);
    expect(screen.getByText(/Review as FSRS flashcard/i)).toBeInTheDocument();
  });

  it('supports keyboard ArrowRight and ArrowLeft navigation', () => {
    render(<PaginationDots slides={slides} ariaLabel="Learning loop preview" />);

    const tablist = screen.getByRole('tablist', { name: /learning loop preview/i });
    const tabs = screen.getAllByRole('tab');

    act(() => {
      fireEvent.keyDown(tablist, { key: 'ArrowRight' });
    });
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');

    act(() => {
      fireEvent.keyDown(tablist, { key: 'ArrowLeft' });
    });
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
  });
});
