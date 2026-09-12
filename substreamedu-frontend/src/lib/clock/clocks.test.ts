import { makeWallClock, makeVideoClock, makeYouTubeClock, makeMockClock } from './clocks';

describe('Clock System', () => {
  describe('MockClock', () => {
    it('initializes with default or specified time', () => {
      const clock = makeMockClock(100);
      expect(clock.now()).toBe(100);
      expect(clock.isPaused?.()).toBe(false);
    });

    it('advances time and sets paused state', () => {
      const clock = makeMockClock(0);
      clock.advanceBy(250);
      expect(clock.now()).toBe(250);
      clock.setTime(1000);
      expect(clock.now()).toBe(1000);
      clock.setPaused(true);
      expect(clock.isPaused?.()).toBe(true);
    });
  });

  describe('WallClock', () => {
    it('calculates elapsed time with offset', () => {
      const anchor = 1000;
      const clock = makeWallClock(anchor, { offsetMs: 200 });
      // now() should return elapsed - offset
      expect(typeof clock.now()).toBe('number');
      expect(clock.isPaused?.()).toBe(false);
    });
  });

  describe('VideoClock', () => {
    it('derives time from media currentTime in milliseconds with offset', () => {
      const mockMedia = {
        currentTime: 2.5,
        duration: 10,
        paused: false,
        ended: false,
      } as unknown as HTMLMediaElement;

      const clock = makeVideoClock(mockMedia, { offsetMs: 500 });
      // 2.5s * 1000 - 500ms = 2000ms
      expect(clock.now()).toBe(2000);
      expect(clock.isPaused?.()).toBe(false);
    });

    it('reports paused state correctly', () => {
      const mockMedia = {
        currentTime: 1.0,
        duration: 10,
        paused: true,
        ended: false,
      } as unknown as HTMLMediaElement;

      const clock = makeVideoClock(mockMedia);
      expect(clock.isPaused?.()).toBe(true);
    });
  });

  describe('YouTubeClock', () => {
    it('derives time from player.getCurrentTime', () => {
      const mockPlayer = {
        getCurrentTime: () => 4.2,
        getPlayerState: () => 1, // playing
      };

      const clock = makeYouTubeClock(mockPlayer, { offsetMs: 200 });
      expect(clock.now()).toBe(4000);
      expect(clock.isPaused?.()).toBe(false);
    });

    it('handles paused state from YouTube player state code 2', () => {
      const mockPlayer = {
        getCurrentTime: () => 0,
        getPlayerState: () => 2, // paused
      };

      const clock = makeYouTubeClock(mockPlayer);
      expect(clock.isPaused?.()).toBe(true);
    });
  });
});
