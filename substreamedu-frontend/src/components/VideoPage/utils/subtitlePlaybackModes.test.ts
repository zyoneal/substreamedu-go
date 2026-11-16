import {
    evaluateSilenceSpeedup,
    evaluateSubtitlePlaybackMode,
    SubtitleCueTiming,
} from './subtitlePlaybackModes';

const sampleCue: SubtitleCueTiming = {
    startTimeMs: 4000,
    endTimeMs: 7500,
    text: 'Call it a day.',
};

describe('evaluateSubtitlePlaybackMode', () => {
    it('returns none when paused or no tracked cue', () => {
        expect(
            evaluateSubtitlePlaybackMode({
                currentTimeMs: 7600,
                isPlaying: false,
                autoPause: true,
                autoLoop: false,
                trackedCue: sampleCue,
                lastPausedCueEndMs: null,
            })
        ).toEqual({ action: 'none' });

        expect(
            evaluateSubtitlePlaybackMode({
                currentTimeMs: 7600,
                isPlaying: true,
                autoPause: true,
                autoLoop: false,
                trackedCue: null,
                lastPausedCueEndMs: null,
            })
        ).toEqual({ action: 'none' });
    });

    it('triggers seek to cue start when autoLoop is active and cue ends', () => {
        expect(
            evaluateSubtitlePlaybackMode({
                currentTimeMs: 7500,
                isPlaying: true,
                autoPause: false,
                autoLoop: true,
                trackedCue: sampleCue,
                lastPausedCueEndMs: null,
            })
        ).toEqual({ action: 'seek', seekTimeSec: 4 });
    });

    it('triggers pause once at cue end when autoPause is active', () => {
        expect(
            evaluateSubtitlePlaybackMode({
                currentTimeMs: 7520,
                isPlaying: true,
                autoPause: true,
                autoLoop: false,
                trackedCue: sampleCue,
                lastPausedCueEndMs: null,
            })
        ).toEqual({ action: 'pause', pausedCueEndMs: 7500 });

        // Does not re-pause on the exact same cue after resuming
        expect(
            evaluateSubtitlePlaybackMode({
                currentTimeMs: 7580,
                isPlaying: true,
                autoPause: true,
                autoLoop: false,
                trackedCue: sampleCue,
                lastPausedCueEndMs: 7500,
            })
        ).toEqual({ action: 'none' });
    });

    it('does nothing while still inside the cue', () => {
        expect(
            evaluateSubtitlePlaybackMode({
                currentTimeMs: 6000,
                isPlaying: true,
                autoPause: true,
                autoLoop: true,
                trackedCue: sampleCue,
                lastPausedCueEndMs: null,
            })
        ).toEqual({ action: 'none' });
    });
});

describe('evaluateSilenceSpeedup', () => {
    const cues: SubtitleCueTiming[] = [
        { startTimeMs: 1000, endTimeMs: 3000, text: 'First line.' },
        { startTimeMs: 8000, endTimeMs: 10000, text: 'After long silence.' },
        { startTimeMs: 11000, endTimeMs: 12000, text: 'Quick follow-up.' },
    ];

    it('returns 2 during a long silent gap and returns 1 before cue onset', () => {
        expect(
            evaluateSilenceSpeedup({
                currentTimeMs: 4500,
                isPlaying: true,
                skipSilence: true,
                subtitles: cues,
            })
        ).toBe(2);

        // Within 350ms lead-in before next cue -> back to 1x
        expect(
            evaluateSilenceSpeedup({
                currentTimeMs: 7800,
                isPlaying: true,
                skipSilence: true,
                subtitles: cues,
            })
        ).toBe(1);
    });

    it('returns 1 inside a cue, during short gaps, or when disabled', () => {
        expect(
            evaluateSilenceSpeedup({
                currentTimeMs: 2000,
                isPlaying: true,
                skipSilence: true,
                subtitles: cues,
            })
        ).toBe(1);

        expect(
            evaluateSilenceSpeedup({
                currentTimeMs: 10400,
                isPlaying: true,
                skipSilence: true,
                subtitles: cues,
            })
        ).toBe(1);

        expect(
            evaluateSilenceSpeedup({
                currentTimeMs: 4500,
                isPlaying: true,
                skipSilence: false,
                subtitles: cues,
            })
        ).toBe(1);
    });
});
