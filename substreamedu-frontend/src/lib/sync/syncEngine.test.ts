import { makeMockClock } from '../clock/clocks';
import { createSyncEngine } from './syncEngine';
import { TimedItem } from './types';

describe('SyncEngine', () => {
  interface SubtitleCue extends TimedItem {
    text: string;
  }

  const cues: SubtitleCue[] = [
    { id: '1', startTime: 100, endTime: 300, text: 'Hello' },
    { id: '2', startTime: 350, endTime: 600, text: 'World' },
    { id: '3', startTime: 700, endTime: 900, text: '!' },
  ];

  it('triggers item entry sequentially with mock clock', () => {
    const clock = makeMockClock(0);
    const entered: string[] = [];
    const left: string[] = [];

    // Manual tick controller for testing
    let scheduledCallback: any = null;
    const manualTick = (cb: () => void) => {
      scheduledCallback = cb;
      return () => {
        scheduledCallback = null;
      };
    };

    const handle = createSyncEngine(cues, {
      clock,
      tick: manualTick,
      onItemEnter: (item) => entered.push(item.text),
      onItemLeave: (item) => left.push(item.text),
    });

    expect(handle.isRunning()).toBe(true);
    expect(entered).toEqual([]);

    // Advance clock to 150ms and tick
    clock.setTime(150);
    scheduledCallback?.();
    expect(entered).toEqual(['Hello']);
    expect(left).toEqual([]);

    // Advance clock to 320ms and tick -> Hello should leave
    clock.setTime(320);
    scheduledCallback?.();
    expect(left).toEqual(['Hello']);

    // Advance clock to 400ms and tick -> World should enter
    clock.setTime(400);
    scheduledCallback?.();
    expect(entered).toEqual(['Hello', 'World']);

    handle.stop();
    expect(handle.isRunning()).toBe(false);
  });

  it('catches up multiple items in a single frame when frames are dropped (while-loop resilience)', () => {
    const clock = makeMockClock(0);
    const entered: string[] = [];

    let scheduledCallback: any = null;
    const manualTick = (cb: () => void) => {
      scheduledCallback = cb;
      return () => {
        scheduledCallback = null;
      };
    };

    const handle = createSyncEngine(cues, {
      clock,
      tick: manualTick,
      onItemEnter: (item) => entered.push(item.text),
    });

    // Clock leaps forward past cue 1 and into cue 2 in one frame (e.g. background tab)
    clock.setTime(450);
    scheduledCallback?.();

    // Cue 2 enters (cue 1 is already past endTime 300, so it was caught up)
    expect(entered).toContain('World');

    handle.stop();
  });

  it('pauses and does not advance when clock is paused', () => {
    const clock = makeMockClock(0);
    clock.setPaused(true);
    const entered: string[] = [];

    let scheduledCallback: any = null;
    const manualTick = (cb: () => void) => {
      scheduledCallback = cb;
      return () => {
        scheduledCallback = null;
      };
    };

    const handle = createSyncEngine(cues, {
      clock,
      tick: manualTick,
      onItemEnter: (item) => entered.push(item.text),
    });

    clock.setTime(500); // Time is 500ms, but clock is paused
    scheduledCallback?.();
    expect(entered).toEqual([]);

    // Unpause
    clock.setPaused(false);
    scheduledCallback?.();
    expect(entered.length).toBeGreaterThan(0);

    handle.stop();
  });

  it('cleans up and finishes on stop()', async () => {
    const clock = makeMockClock(0);
    const handle = createSyncEngine(cues, { clock });

    expect(handle.isRunning()).toBe(true);
    handle.stop();
    expect(handle.isRunning()).toBe(false);
    await expect(handle.done).resolves.toBeUndefined();
  });
});
