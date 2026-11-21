import React from 'react';
import { render, screen } from '@testing-library/react';
import { StorageMeter } from './StorageMeter';

describe('StorageMeter', () => {
  it('renders proportional segments and legend percentages', () => {
    const { container } = render(
      <StorageMeter
        total={100}
        ariaLabel="Vocabulary breakdown"
        segments={[
          { id: 'mastered', label: 'Mastered', value: 40, tone: 'mastered' },
          { id: 'learning', label: 'Learning', value: 60, tone: 'learning' },
        ]}
      />
    );

    expect(screen.getByRole('group', { name: 'Vocabulary breakdown' })).toBeInTheDocument();
    expect(screen.getByText('Mastered')).toBeInTheDocument();
    expect(screen.getByText('(40%)')).toBeInTheDocument();
    expect(screen.getByText('Learning')).toBeInTheDocument();
    expect(screen.getByText('(60%)')).toBeInTheDocument();
    expect(container.querySelector('[data-segment-id="mastered"]')).toHaveStyle({ width: '40.00%' });
  });

  it('returns null when all segment values are zero', () => {
    const { container } = render(
      <StorageMeter
        segments={[
          { id: 'mastered', label: 'Mastered', value: 0, tone: 'mastered' },
        ]}
      />
    );
    expect(container.firstChild).toBeNull();
  });
});
