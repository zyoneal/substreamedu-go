import { createCaptureListener, observeInViewport } from './events';

describe('Event Helpers', () => {
  describe('createCaptureListener', () => {
    it('attaches listener with capture: true and returns cleanup function', () => {
      const target = document.createElement('div');
      const handler = jest.fn();

      const unsubscribe = createCaptureListener(target, 'click', handler);

      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(handler).toHaveBeenCalledTimes(1);

      unsubscribe();

      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(handler).toHaveBeenCalledTimes(1); // not called again
    });
  });

  describe('observeInViewport', () => {
    it('calls onVisible and disconnects when intersecting', () => {
      const element = document.createElement('div');
      const onVisible = jest.fn();

      // Mock IntersectionObserver
      let observerCallback: any = null;
      const mockDisconnect = jest.fn();
      const mockObserve = jest.fn();

      class MockIntersectionObserver implements IntersectionObserver {
        readonly root: Element | Document | null = null;
        readonly rootMargin: string = '';
        readonly thresholds: ReadonlyArray<number> = [];
        takeRecords(): IntersectionObserverEntry[] {
          return [];
        }
        constructor(callback: IntersectionObserverCallback) {
          observerCallback = callback;
        }
        observe = mockObserve;
        unobserve = jest.fn();
        disconnect = mockDisconnect;
      }

      window.IntersectionObserver = MockIntersectionObserver;

      const unsubscribe = observeInViewport(element, onVisible, { once: true });
      expect(mockObserve).toHaveBeenCalledWith(element);

      // Trigger intersection
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );

      expect(onVisible).toHaveBeenCalledTimes(1);
      expect(mockDisconnect).toHaveBeenCalledTimes(1);

      unsubscribe();
    });
  });
});
