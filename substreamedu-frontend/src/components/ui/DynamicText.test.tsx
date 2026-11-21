import React from 'react';
import { render, act } from '@testing-library/react';
import DynamicText, { DEFAULT_INTERVAL, holdFor } from './DynamicText';

describe('DynamicText', () => {
  let intersectionCallback: IntersectionObserverCallback | null = null;

  beforeEach(() => {
    jest.useFakeTimers();
    intersectionCallback = null;

    class MockIntersectionObserver implements IntersectionObserver {
      readonly root: Element | null = null;
      readonly rootMargin: string = '';
      readonly thresholds: ReadonlyArray<number> = [];

      constructor(cb: IntersectionObserverCallback) {
        intersectionCallback = cb;
      }

      observe = jest.fn(() => {
        if (intersectionCallback) {
          intersectionCallback(
            [{ isIntersecting: true } as IntersectionObserverEntry],
            this
          );
        }
      });
      unobserve = jest.fn();
      disconnect = jest.fn();
      takeRecords = jest.fn().mockReturnValue([]);
    }

    global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders the initial word immediately and rotates on the morph interval (2200ms)', () => {
    const words = [
      'Learn English from movies',
      'Learn English from music',
      'Learn English from any text',
    ];
    const { container } = render(<DynamicText mode="morph" words={words} />);

    const srSpan = container.querySelector('[aria-live="off"]');
    expect(srSpan).toHaveTextContent('Learn English from movies');

    act(() => {
      jest.advanceTimersByTime(DEFAULT_INTERVAL.morph);
    });
    expect(srSpan).toHaveTextContent('Learn English from music');

    act(() => {
      jest.advanceTimersByTime(DEFAULT_INTERVAL.morph);
    });
    expect(srSpan).toHaveTextContent('Learn English from any text');

    // Loops back to the first word
    act(() => {
      jest.advanceTimersByTime(DEFAULT_INTERVAL.morph);
    });
    expect(srSpan).toHaveTextContent('Learn English from movies');
  });

  it('announces controlled text politely and ignores words prop', () => {
    const { container, rerender } = render(
      <DynamicText text="Watch" words={['Ignored']} />
    );

    const srSpan = container.querySelector('[aria-live="polite"]');
    expect(srSpan).toHaveTextContent('Watch');

    rerender(<DynamicText text="Remember" words={['Ignored']} />);
    expect(srSpan).toHaveTextContent('Remember');
  });

  it('uses accelerating greeting rhythm in cycle mode and fires onComplete once', () => {
    expect(holdFor('cycle', 0, 5, 900)).toBe(900);
    expect(holdFor('cycle', 1, 5, 900)).toBeCloseTo(324);
    expect(holdFor('cycle', 2, 5, 900)).toBeCloseTo(259.2);
    expect(holdFor('cycle', 4, 5, 900)).toBe(1800);

    const onComplete = jest.fn();
    const { container } = render(
      <DynamicText
        mode="cycle"
        words={[
          { text: 'Hello', lang: 'en' },
          { text: 'Привіт', lang: 'uk' },
          { text: 'Hola', lang: 'es' },
        ]}
        onComplete={onComplete}
      />
    );

    const srSpan = container.querySelector('[aria-live="off"]');
    expect(srSpan).toHaveTextContent('Hello');
    expect(onComplete).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(900);
    });
    expect(srSpan).toHaveTextContent('Привіт');

    act(() => {
      jest.advanceTimersByTime(324);
    });
    expect(srSpan).toHaveTextContent('Hola');
    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('renders monospace cells in decode mode', () => {
    const { container } = render(
      <DynamicText mode="decode" text="FSRS 94%" />
    );

    const srSpan = container.querySelector('[aria-live="polite"]');
    expect(srSpan).toHaveTextContent('FSRS 94%');
    expect(container.textContent).toContain('FSRS 94%');
  });
});
