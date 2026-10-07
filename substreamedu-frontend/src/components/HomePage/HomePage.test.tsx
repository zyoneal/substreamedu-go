import React from 'react';
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
// Mock direct ESM icon imports for Jest
jest.mock('lucide-react/dist/esm/icons/x', () => (props: any) => <span data-testid="icon-x" {...props} />);

import HomePage from './HomePage';

// Mock IntersectionObserver for framer-motion whileInView
beforeAll(() => {
  class MockIntersectionObserver implements IntersectionObserver {
    readonly root: Element | null = null;
    readonly rootMargin: string = '';
    readonly thresholds: ReadonlyArray<number> = [];
    observe = jest.fn();
    unobserve = jest.fn();
    disconnect = jest.fn();
    takeRecords = jest.fn().mockReturnValue([]);
  }
  global.IntersectionObserver = MockIntersectionObserver as any;

  window.HTMLMediaElement.prototype.play = jest.fn().mockImplementation(() => Promise.resolve());
  window.HTMLMediaElement.prototype.pause = jest.fn();
});

// Mock SEO component
jest.mock('../SEO/SEO', () => ({
  SEO: () => <div data-testid="mock-seo" />
}));

// Mock ScrollingTextWall to avoid canvas/animation overhead
jest.mock('./ScrollingTextWall', () => () => <div data-testid="mock-scrolling-text-wall" />);

describe('HomePage Demo Modal', () => {
  const renderHomePage = () => {
    return render(
      <IntlProvider locale="en" messages={{}}>
        <MemoryRouter>
          <HomePage />
        </MemoryRouter>
      </IntlProvider>
    );
  };

  it('renders Watch demo button on hero section', () => {
    renderHomePage();
    const demoBtn = screen.getByRole('button', { name: /watch demo/i });
    expect(demoBtn).toBeInTheDocument();
  });

  it('opens demo modal when Watch demo is clicked and can be closed via close button', async () => {
    renderHomePage();
    const demoBtn = screen.getByRole('button', { name: /watch demo/i });

    // Click Watch demo
    act(() => {
      fireEvent.click(demoBtn);
    });

    // Close button should be accessible and present in the DOM
    const closeBtn = screen.getByRole('button', { name: /close modal/i });
    expect(closeBtn).toBeInTheDocument();

    // Video should be present with movies_example.mp4
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    const source = video?.querySelector('source');
    expect(source?.getAttribute('src')).toBe('/movies_example.mp4');

    // Start free CTA link should be present in modal footer
    const modalCtaLinks = screen.getAllByRole('link', { name: /start free/i });
    expect(modalCtaLinks.length).toBeGreaterThanOrEqual(1);
    const modalCta = modalCtaLinks[modalCtaLinks.length - 1];
    expect(modalCta).toHaveAttribute('href', '/login');

    // Click close button
    act(() => {
      fireEvent.click(closeBtn);
    });

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /video walkthrough/i })).not.toBeInTheDocument();
    });
  });

  it('renders interactive demo dock with all 3 instant sandbox options without requiring signup', () => {
    renderHomePage();
    const demoDock = screen.getByTestId('hero-demo-dock');
    expect(demoDock).toBeInTheDocument();

    const movieDemoLink = within(demoDock).getByRole('link', { name: /movie player/i });
    expect(movieDemoLink).toBeInTheDocument();
    expect(movieDemoLink).toHaveAttribute('href', '/youtube-demo');

    const songDemoLink = within(demoDock).getByRole('link', { name: /synced lyrics/i });
    expect(songDemoLink).toBeInTheDocument();
    expect(songDemoLink).toHaveAttribute('href', '/songs-demo');

    const textDemoLink = within(demoDock).getByRole('link', { name: /ai stories/i });
    expect(textDemoLink).toBeInTheDocument();
    expect(textDemoLink).toHaveAttribute('href', '/texts-demo');
  });
});
