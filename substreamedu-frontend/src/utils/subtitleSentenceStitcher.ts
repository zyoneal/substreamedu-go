import { cleanSubtitleText } from './subtitleCleaner';

export interface StitchableSubtitle {
  id?: number;
  name?: string;
  startTimeMs: number;
  endTimeMs: number;
  text: string;
  [key: string]: any;
}

interface TimedWord {
  word: string;
  cueName: string;
  startTimeMs: number;
  endTimeMs: number;
  isDialogueStart: boolean;
}

const COMMON_ABBREVIATIONS = new Set([
  'mr.', 'mrs.', 'ms.', 'dr.', 'prof.', 'sr.', 'jr.', 'vs.', 'etc.',
  'e.g.', 'i.e.', 'u.s.', 'u.k.', 'approx.', 'no.', 'fig.', 'st.',
  'gen.', 'gov.', 'sgt.', 'capt.', 'col.', 'lt.'
]);

/**
 * Reassembles raw subtitle cues into complete, grammatically unbroken sentences.
 * Prevents sentences from being chopped in half across arbitrary 2-second subtitle cues.
 */
export function stitchSubtitleSentences<T extends StitchableSubtitle>(rawCues: T[] | null | undefined): T[] {
  if (!Array.isArray(rawCues) || rawCues.length === 0) {
    return [];
  }

  // 1. Sanitize and extract word tokens with interpolated millisecond timestamps
  const timedWords: TimedWord[] = [];

  for (const cue of rawCues) {
    const rawText = typeof cue.text === 'string' ? cue.text : '';
    const cleaned = cleanSubtitleText(rawText).trim();
    if (!cleaned) continue;

    const cueName = cue.name || 'Subtitles';
    const startMs = typeof cue.startTimeMs === 'number'
      ? cue.startTimeMs
      : typeof (cue as any).start === 'number'
        ? ((cue as any).start > 10000 ? (cue as any).start : (cue as any).start * 1000)
        : 0;

    const endMs = typeof cue.endTimeMs === 'number'
      ? cue.endTimeMs
      : typeof (cue as any).end === 'number'
        ? ((cue as any).end > 10000 ? (cue as any).end : (cue as any).end * 1000)
        : startMs + 2500;

    const duration = Math.max(150, endMs - startMs);

    // Check for dialogue lines within the cue
    const lines = cleaned.split('\n');
    let lineStartRatio = 0;

    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;

      const isDialogue = /^[-–—]\s+/.test(trimmedLine);
      const textWithoutDash = trimmedLine.replace(/^[-–—]\s+/, '');
      const tokens = textWithoutDash.split(/\s+/).filter(Boolean);
      if (tokens.length === 0) continue;

      const lineRatio = tokens.length / (cleaned.split(/\s+/).filter(Boolean).length || 1);
      const lineDuration = duration * lineRatio;
      const lineStart = startMs + duration * lineStartRatio;
      const tokenDuration = lineDuration / tokens.length;

      for (let i = 0; i < tokens.length; i++) {
        timedWords.push({
          word: tokens[i],
          cueName,
          startTimeMs: Math.round(lineStart + i * tokenDuration),
          endTimeMs: Math.round(lineStart + (i + 1) * tokenDuration),
          isDialogueStart: i === 0 && isDialogue
        });
      }

      lineStartRatio += lineRatio;
    }
  }

  if (timedWords.length === 0) {
    return [];
  }

  // 2. Assemble word tokens into complete sentences
  const result: T[] = [];
  let currentSentenceTokens: TimedWord[] = [];

  for (let i = 0; i < timedWords.length; i++) {
    const current = timedWords[i];
    currentSentenceTokens.push(current);

    const w = current.word;
    const lowerW = w.toLowerCase().replace(/['"”’)]+$/, '');

    // Terminal punctuation check (. ! ?)
    const hasTerminalPunctuation = /[.!?]$/.test(w) || /[.!?]['"”’)\]]+$/.test(w);
    const isAbbreviation = COMMON_ABBREVIATIONS.has(lowerW) || /^\d+\.\d+$/.test(w);

    const next = timedWords[i + 1];
    const isBigGap = next && (next.startTimeMs - current.endTimeMs > 1600);
    const isNextDialogue = next && next.isDialogueStart;
    const isLastToken = !next;

    // Safety guard against runaway run-on sentences without punctuation
    const currentDuration = currentSentenceTokens.length > 0
      ? current.endTimeMs - currentSentenceTokens[0].startTimeMs
      : 0;
    const isRunaway = currentSentenceTokens.length >= 22 || currentDuration > 8000;
    const isClauseBreak = isRunaway && (
      /[,;:]$/.test(w) ||
      (next && /^(and|but|so|because|although|however|while|when|if)$/i.test(next.word)) ||
      (next && /^[A-Z]/.test(next.word))
    );

    const isSentenceEnd = (hasTerminalPunctuation && !isAbbreviation) ||
      isBigGap ||
      isNextDialogue ||
      isLastToken ||
      isClauseBreak;

    if (isSentenceEnd) {
      if (currentSentenceTokens.length > 0) {
        const sentenceText = currentSentenceTokens.map(t => t.word).join(' ').trim();
        if (sentenceText) {
          const first = currentSentenceTokens[0];
          const last = currentSentenceTokens[currentSentenceTokens.length - 1];

          const stitched = {
            id: result.length + 1,
            name: first.cueName,
            startTimeMs: first.startTimeMs,
            endTimeMs: last.endTimeMs,
            text: sentenceText
          } as T;

          result.push(stitched);
        }
        currentSentenceTokens = [];
      }
    }
  }

  return result;
}
