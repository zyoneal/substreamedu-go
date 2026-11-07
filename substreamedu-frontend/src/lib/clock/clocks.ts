import { Clock, ClockOptions, MockClock } from './types';

/**
 * Creates a clock driven by wall-clock time (performance.now with fallback to Date.now).
 */
export function makeWallClock(anchorMs?: number, options: ClockOptions = {}): Clock {
  const baseAnchor = anchorMs ?? (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const offset = options.offsetMs ?? 0;
  const rate = options.playbackRate ?? 1.0;

  return {
    now: () => {
      const current = typeof performance !== 'undefined' ? performance.now() : Date.now();
      return (current - baseAnchor) * rate - offset;
    },
    isPaused: () => false,
  };
}

/**
 * Creates a clock driven by an HTML5 <video> or <audio> element.
 * Video.currentTime serves as the single source of truth, preventing desync during stalls or buffering.
 */
export function makeVideoClock(
  media: HTMLMediaElement,
  options: ClockOptions = {}
): Clock {
  const offset = options.offsetMs ?? 0;
  let endedAtWall: number | null = null;

  return {
    now: () => {
      if (media.ended) {
        const currentWall = typeof performance !== 'undefined' ? performance.now() : Date.now();
        endedAtWall ??= currentWall;
        const elapsedSinceEnd = currentWall - endedAtWall;
        return media.duration * 1000 - offset + elapsedSinceEnd;
      }
      endedAtWall = null;
      return media.currentTime * 1000 - offset;
    },
    isPaused: () => media.paused,
  };
}

/**
 * Creates a clock driven by a YouTube Player iframe instance.
 */
export function makeYouTubeClock(
  player: { getCurrentTime?: () => number; getPlayerState?: () => number },
  options: ClockOptions = {}
): Clock {
  const offset = options.offsetMs ?? 0;

  return {
    now: () => {
      if (!player || typeof player.getCurrentTime !== 'function') {
        return 0;
      }
      const seconds = player.getCurrentTime() || 0;
      return seconds * 1000 - offset;
    },
    isPaused: () => {
      if (!player || typeof player.getPlayerState !== 'function') {
        return false;
      }
      // 2 = PAUSED in YouTube IFrame API
      return player.getPlayerState() === 2;
    },
  };
}

/**
 * Creates a controllable mock clock for unit tests and simulations.
 */
export function makeMockClock(initialMs: number = 0): MockClock {
  let currentTime = initialMs;
  let paused = false;

  return {
    now: () => currentTime,
    isPaused: () => paused,
    setTime: (timeMs: number) => {
      currentTime = timeMs;
    },
    advanceBy: (deltaMs: number) => {
      currentTime += deltaMs;
    },
    setPaused: (p: boolean) => {
      paused = p;
    },
  };
}
