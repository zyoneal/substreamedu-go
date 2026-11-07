import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import Flashcard from './Flashcard';

jest.mock('lucide-react/dist/esm/icons/play', () => () => <span data-testid="icon-play" />);

const defaultProps = {
  word: 'self-conscious',
  transcription: "[,self'kɒnʃəs]",
  definition: 'embarrassed or awkward',
  translatedText: 'застенчивый',
  context: "Oh, she's self-conscious.",
  revealLevel: 1 as const,
  onRevealNext: jest.fn(),
  onPlayPronunciation: jest.fn(),
  onWordClick: jest.fn(),
};

const renderFlashcard = (props = {}) => {
  return render(
    <IntlProvider locale="en" messages={{}}>
      <Flashcard {...defaultProps} {...props} />
    </IntlProvider>
  );
};

describe('Flashcard', () => {
  it('renders word, transcription, context and definition when revealed', () => {
    renderFlashcard();
    expect(screen.getByRole('heading', { level: 1, name: 'self-conscious' })).toBeInTheDocument();
    expect(screen.getByText(/\[,self'kɒnʃəs\]/)).toBeInTheDocument();
    expect(screen.getByText(/embarrassed or awkward \(застенчивый\)/)).toBeInTheDocument();
  });

  it('renders image when a valid imageUrl is provided', () => {
    const { container } = renderFlashcard({ imageUrl: 'https://example.com/test.jpg' });
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/test.jpg');
  });

  it('suppresses and unmounts image from the UI when image loading fails (onError)', () => {
    const { container } = renderFlashcard({ imageUrl: 'https://example.com/broken.jpg' });
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();

    // Trigger image error
    fireEvent.error(img!);

    // Image and its container must be removed from the UI
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('does not render image section if imageUrl is empty or whitespace', () => {
    const { container } = renderFlashcard({ imageUrl: '   ' });
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });
});
