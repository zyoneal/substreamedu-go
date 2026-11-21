import React from 'react';
import { render, screen } from '@testing-library/react';
import { StreamingText } from './StreamingText';

describe('StreamingText', () => {
  it('renders multi-word text cleanly as a single selectable text node', () => {
    render(<StreamingText text="call it a day" />);
    expect(screen.getByText('call it a day')).toBeInTheDocument();
  });

  it('renders single-word text cleanly', () => {
    render(<StreamingText text="serendipity" />);
    expect(screen.getByText('serendipity')).toBeInTheDocument();
  });

  it('returns null for empty text', () => {
    const { container } = render(<StreamingText text="" />);
    expect(container.firstChild).toBeNull();
  });
});
