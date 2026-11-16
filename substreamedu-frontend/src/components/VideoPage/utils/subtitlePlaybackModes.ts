export interface SubtitleCueTiming {
    startTimeMs: number;
    endTimeMs: number;
    text: string;
}

export interface PlaybackModeDecision {
    action: 'none' | 'pause' | 'seek';
    seekTimeSec?: number;
    pausedCueEndMs?: number;
}

/**
 * Evaluates whether Auto-Loop or Auto-Pause should trigger at currentTimeMs
 * given the tracked active cue and the last cue end timestamp already paused on.
 */
export const evaluateSubtitlePlaybackMode = (params: {
    currentTimeMs: number;
    isPlaying: boolean;
    autoPause: boolean;
    autoLoop: boolean;
    trackedCue: SubtitleCueTiming | null;
    lastPausedCueEndMs: number | null;
}): PlaybackModeDecision => {
    const {
        currentTimeMs,
        isPlaying,
        autoPause,
        autoLoop,
        trackedCue,
        lastPausedCueEndMs,
    } = params;

    if (!isPlaying || !trackedCue) {
        return { action: 'none' };
    }

    if (autoLoop && currentTimeMs >= trackedCue.endTimeMs) {
        return {
            action: 'seek',
            seekTimeSec: Math.max(0, trackedCue.startTimeMs / 1000),
        };
    }

    if (
        autoPause &&
        currentTimeMs >= trackedCue.endTimeMs &&
        lastPausedCueEndMs !== trackedCue.endTimeMs
    ) {
        return {
            action: 'pause',
            pausedCueEndMs: trackedCue.endTimeMs,
        };
    }

    return { action: 'none' };
};

/**
 * Returns target playbackRate (2 or 1) during silent gaps between subtitles.
 * Leaves normal 1x speed during active cues, short pauses (< minGapMs),
 * and within leadInMs before the next cue so speech onset is never clipped.
 */
export const evaluateSilenceSpeedup = (params: {
    currentTimeMs: number;
    isPlaying: boolean;
    skipSilence: boolean;
    subtitles: SubtitleCueTiming[];
    minGapMs?: number;
    leadInMs?: number;
}): 1 | 2 => {
    const {
        currentTimeMs,
        isPlaying,
        skipSilence,
        subtitles,
        minGapMs = 2500,
        leadInMs = 350,
    } = params;

    if (!isPlaying || !skipSilence || subtitles.length === 0) {
        return 1;
    }

    let prevEndMs = 0;
    let nextStartMs: number | null = null;

    for (const sub of subtitles) {
        if (currentTimeMs >= sub.startTimeMs && currentTimeMs <= sub.endTimeMs) {
            return 1;
        }
        if (sub.endTimeMs < currentTimeMs) {
            prevEndMs = Math.max(prevEndMs, sub.endTimeMs);
        } else if (sub.startTimeMs > currentTimeMs && nextStartMs === null) {
            nextStartMs = sub.startTimeMs;
            break;
        }
    }

    if (nextStartMs === null) {
        return 1;
    }

    const totalGapMs = nextStartMs - prevEndMs;
    const remainingGapMs = nextStartMs - currentTimeMs;
    if (totalGapMs >= minGapMs && remainingGapMs > leadInMs) {
        return 2;
    }

    return 1;
};
