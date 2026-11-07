/**
 * Pluggable clock source for synchronizing subtitles, media, and animations.
 * Decouples consumers from concrete time sources (performance.now, HTML5 video, YouTube, audio).
 */
export interface Clock {
  /** Returns current time in milliseconds relative to the clock anchor. */
  now(): number;
  /** Returns whether the underlying media or clock source is paused. */
  isPaused?(): boolean;
}

export interface ClockOptions {
  /** Offset in milliseconds added to the clock time (positive delays, negative advances). */
  offsetMs?: number;
  /** Playback rate scaling factor (default: 1.0). */
  playbackRate?: number;
}

export interface MockClock extends Clock {
  setTime(timeMs: number): void;
  advanceBy(deltaMs: number): void;
  setPaused(paused: boolean): void;
}
