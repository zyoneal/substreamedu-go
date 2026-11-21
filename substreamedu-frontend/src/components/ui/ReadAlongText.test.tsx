import React from 'react';
import { render } from '@testing-library/react';
import { ReadAlongText } from './ReadAlongText';

describe('ReadAlongText', () => {
  it('marks spoken, active, and upcoming words according to progress', () => {
    const { container, rerender } = render(
      <ReadAlongText text="One two three four" progress={0.5} />
    );

    const words = Array.from(container.querySelectorAll('[data-read-state]'));
    expect(words).toHaveLength(4);
    expect(words[0]).toHaveAttribute('data-read-state', 'spoken');
    expect(words[1]).toHaveAttribute('data-read-state', 'spoken');
    expect(words[2]).toHaveAttribute('data-read-state', 'active');
    expect(words[3]).toHaveAttribute('data-read-state', 'upcoming');

    rerender(<ReadAlongText text="One two three four" progress={1} />);
    const finished = Array.from(container.querySelectorAll('[data-read-state]'));
    finished.forEach((el) => expect(el).toHaveAttribute('data-read-state', 'spoken'));
  });

  it('returns null when text is empty', () => {
    const { container } = render(<ReadAlongText text="" progress={0.5} />);
    expect(container.firstChild).toBeNull();
  });
});
