import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SegmentedControl, PILL_POS_SPRING, PILL_WIDTH_SPRING } from './SegmentedControl';

describe('SegmentedControl', () => {
  const options = [
    { value: 'all', label: 'All' },
    { value: 'words', label: 'Words' },
    { value: 'phrases', label: 'Phrases' },
  ] as const;

  it('exports the expected spring physics constants', () => {
    expect(PILL_POS_SPRING).toEqual({ k: 380, c: 28 });
    expect(PILL_WIDTH_SPRING).toEqual({ k: 360, c: 28 });
  });

  it('renders tablist mode with aria-selected and triggers onChange on click', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={options}
        value="all"
        onChange={onChange}
        ariaLabel="Filter mode"
        roleMode="tablist"
      />
    );

    const tablist = screen.getByRole('tablist', { name: 'Filter mode' });
    expect(tablist).toBeInTheDocument();

    const allTab = screen.getByRole('tab', { name: 'All' });
    const wordsTab = screen.getByRole('tab', { name: 'Words' });

    expect(allTab).toHaveAttribute('aria-selected', 'true');
    expect(wordsTab).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(wordsTab);
    expect(onChange).toHaveBeenCalledWith('words');
  });

  it('supports keyboard ArrowRight and ArrowLeft navigation with wrap-around', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={options}
        value="all"
        onChange={onChange}
        ariaLabel="Card type"
        roleMode="group"
      />
    );

    const group = screen.getByRole('group', { name: 'Card type' });
    fireEvent.keyDown(group, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('words');

    fireEvent.keyDown(group, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenLastCalledWith('phrases');
  });

  it('does not call onChange when disabled', () => {
    const onChange = jest.fn();
    render(
      <SegmentedControl
        options={options}
        value="all"
        onChange={onChange}
        ariaLabel="Card type"
        roleMode="group"
        disabled
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Words' }));
    expect(onChange).not.toHaveBeenCalled();
  });
});
