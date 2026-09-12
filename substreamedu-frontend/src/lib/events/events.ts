/**
 * Attaches an event listener during the capture phase, ensuring it intercepts events
 * before child elements can consume or cancel them (e.g. instant interactive take-over).
 * Returns an unsubscribe cleanup function.
 */
export function createCaptureListener<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  eventName: K | string,
  handler: (event: any) => void,
  options?: boolean | AddEventListenerOptions
): () => void {
  const listenerOpts: AddEventListenerOptions =
    typeof options === 'object'
      ? { ...options, capture: true }
      : { capture: true };

  target.addEventListener(eventName, handler, listenerOpts);

  return () => {
    target.removeEventListener(eventName, handler, listenerOpts);
  };
}

export interface ViewportObserverOptions {
  threshold?: number;
  rootMargin?: string;
  /** If true (default), disconnects immediately after the first intersection hit */
  once?: boolean;
}

/**
 * Native IntersectionObserver helper that fires when an element becomes visible.
 * Returns an unsubscribe function.
 */
export function observeInViewport(
  element: Element,
  onVisible: () => void,
  options: ViewportObserverOptions = {}
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    // Fallback if IntersectionObserver is not available (e.g. in older environments)
    onVisible();
    return () => {};
  }

  const { threshold = 0.3, rootMargin = '0px', once = true } = options;

  const observer = new IntersectionObserver(
    (entries) => {
      const isIntersecting = entries.some((e) => e.isIntersecting);
      if (isIntersecting) {
        if (once) {
          observer.disconnect();
        }
        onVisible();
      }
    },
    { threshold, rootMargin }
  );

  observer.observe(element);

  return () => {
    observer.disconnect();
  };
}
