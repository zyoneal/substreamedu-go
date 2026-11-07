import { Clock } from '../clock/types';

export interface TimedItem {
  id?: string;
  /** Start time in milliseconds */
  startTime: number;
  /** Optional end time in milliseconds */
  endTime?: number;
  [key: string]: any;
}

export interface SyncHandle {
  /** Resolves when all items have finished playback */
  done: Promise<void>;
  /** Stops the sync loop and cleans up all scheduled ticks/resources */
  stop(): void;
  /** Returns whether the engine is currently active */
  isRunning(): boolean;
  /** Jumps to a specific timestamp in the sequence */
  seek(timeMs: number): void;
}

export interface SyncOptions<T extends TimedItem = TimedItem> {
  /** Clock instance driving the synchronization */
  clock?: Clock;
  /** Custom tick scheduler (defaults to requestAnimationFrame) */
  tick?: (callback: () => void) => () => void;
  /** Called when a timed item becomes active */
  onItemEnter?: (item: T) => void;
  /** Called when an active timed item finishes */
  onItemLeave?: (item: T) => void;
  /** Auto-loop when the end is reached */
  loop?: boolean;
}
