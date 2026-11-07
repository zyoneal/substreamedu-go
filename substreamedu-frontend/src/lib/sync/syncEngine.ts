import { makeWallClock } from '../clock/clocks';
import { SyncHandle, SyncOptions, TimedItem } from './types';

const defaultTick = (callback: () => void): (() => void) => {
  if (typeof requestAnimationFrame !== 'undefined') {
    const id = requestAnimationFrame(callback);
    return () => cancelAnimationFrame(id);
  }
  const id = setTimeout(callback, 16);
  return () => clearTimeout(id);
};

/**
 * Creates a frame-resilient sync engine using the while-loop catch-up pattern.
 * Ideal for subtitles, video cues, lyric highlighting, and interactive replays.
 */
export function createSyncEngine<T extends TimedItem>(
  items: T[],
  options: SyncOptions<T> = {}
): SyncHandle {
  const sorted = [...items].sort((a, b) => a.startTime - b.startTime);
  const clock = options.clock ?? makeWallClock();
  const tick = options.tick ?? defaultTick;

  let cancelTick: (() => void) | null = null;
  let running = true;
  let index = 0;
  const activeItems = new Set<T>();

  let resolveDone!: () => void;
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve;
  });

  const finish = (): void => {
    if (!running) return;
    running = false;
    cancelTick = null;
    // Leave remaining active items
    activeItems.forEach((item) => {
      options.onItemLeave?.(item);
    });
    activeItems.clear();
    resolveDone();
  };

  const step = (): void => {
    if (!running) return;

    if (clock.isPaused?.()) {
      // If paused, wait for next tick without advancing sequence
      cancelTick = tick(step);
      return;
    }

    const t = clock.now();

    // 1. Check end times of currently active items
    activeItems.forEach((item) => {
      if (item.endTime !== undefined && t >= item.endTime) {
        activeItems.delete(item);
        options.onItemLeave?.(item);
      }
    });

    // 2. Catch up on all items whose startTime <= current time
    while (index < sorted.length && sorted[index].startTime <= t) {
      const item = sorted[index];
      // Only enter if not already past its endTime
      if (item.endTime === undefined || t < item.endTime) {
        if (!activeItems.has(item)) {
          activeItems.add(item);
          options.onItemEnter?.(item);
        }
      }
      index += 1;
    }

    // 3. Check termination or loop
    if (index >= sorted.length && activeItems.size === 0) {
      if (options.loop) {
        index = 0;
        cancelTick = tick(step);
      } else {
        finish();
      }
    } else {
      cancelTick = tick(step);
    }
  };

  if (sorted.length === 0) {
    finish();
  } else {
    cancelTick = tick(step);
  }

  return {
    done,
    isRunning: () => running,
    stop: () => {
      cancelTick?.();
      finish();
    },
    seek: (timeMs: number) => {
      // Clear current active items
      activeItems.forEach((item) => {
        options.onItemLeave?.(item);
      });
      activeItems.clear();

      // Find new index
      index = 0;
      while (index < sorted.length && sorted[index].startTime < timeMs) {
        index += 1;
      }
    },
  };
}
