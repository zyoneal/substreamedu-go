import { renderHook, act } from '@testing-library/react';
import { useTTS } from './useTTS';

describe('useTTS resilience and circuit breaker', () => {
  const originalFetch = global.fetch;
  const mockSpeak = jest.fn();
  const mockCancel = jest.fn();
  const mockGetVoices = jest.fn(() => [
    { name: 'Google US English', lang: 'en-US', default: true } as any,
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVoices.mockReturnValue([
      { name: 'Google US English', lang: 'en-US', default: true } as any,
    ]);

    // Mock window.speechSynthesis
    Object.defineProperty(window, 'speechSynthesis', {
      value: {
        speak: mockSpeak,
        cancel: mockCancel,
        getVoices: mockGetVoices,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
      },
      writable: true,
      configurable: true,
    });

    // Mock global SpeechSynthesisUtterance
    const mockUtterance = jest.fn().mockImplementation((text) => ({
      text,
      lang: 'en-US',
      rate: 1,
      pitch: 1,
      voice: null,
      onend: null,
      onerror: null,
    }));
    (window as any).SpeechSynthesisUtterance = mockUtterance;
    (global as any).SpeechSynthesisUtterance = mockUtterance;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('falls back to window.speechSynthesis when external dictionary API fails or times out', async () => {
    // Simulate failing fetch (e.g. CORS 522 error)
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const { result } = renderHook(() => useTTS());

    await act(async () => {
      await result.current.play('fence', 123, 'en');
    });

    // Native speech synthesis must be triggered as fallback
    expect(mockSpeak).toHaveBeenCalled();
  });

  it('activates circuit breaker after repeated failures to skip external fetch', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    global.fetch = fetchMock;

    const { result } = renderHook(() => useTTS());

    // Call 1: fails
    await act(async () => {
      await result.current.play('wordone', 1, 'en');
    });

    // Call 2: fails -> triggers circuit breaker cooldown
    await act(async () => {
      await result.current.play('wordtwo', 2, 'en');
    });

    const callsCountBefore = fetchMock.mock.calls.length;

    // Call 3: should be blocked by circuit breaker cooldown without calling fetch!
    await act(async () => {
      await result.current.play('wordthree', 3, 'en');
    });

    expect(fetchMock.mock.calls.length).toBe(callsCountBefore);
    expect(mockSpeak).toHaveBeenCalled();
  });
});
