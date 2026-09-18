import { stitchSubtitleSentences } from './subtitleSentenceStitcher';

describe('subtitleSentenceStitcher', () => {
  test('returns empty array for empty or null inputs', () => {
    expect(stitchSubtitleSentences(null)).toEqual([]);
    expect(stitchSubtitleSentences([])).toEqual([]);
  });

  test('merges sentence fragmented across two subtitle cues', () => {
    const raw = [
      { id: 1, name: 'YouTube', startTimeMs: 1000, endTimeMs: 3000, text: "I'm used to calling it soccer" },
      { id: 2, name: 'YouTube', startTimeMs: 3000, endTimeMs: 5000, text: "because I grew up in America." }
    ];

    const result = stitchSubtitleSentences(raw);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe("I'm used to calling it soccer because I grew up in America.");
    expect(result[0].startTimeMs).toBe(1000);
    expect(result[0].endTimeMs).toBe(5000);
  });

  test('reassembles complex real-world YouTube cue fragmentation into 4 whole sentences', () => {
    const raw = [
      { id: 1, name: 'YouTube', startTimeMs: 150000, endTimeMs: 153000, text: "and they're used to cut grass. Whipper snippers. These are" },
      { id: 2, name: 'YouTube', startTimeMs: 153000, endTimeMs: 156000, text: "small rakes, big rakes used to rake up leaves. This is a" },
      { id: 3, name: 'YouTube', startTimeMs: 156000, endTimeMs: 159000, text: "garden hose used to water your garden." }
    ];

    const result = stitchSubtitleSentences(raw);
    expect(result.length).toBe(4);

    expect(result[0].text).toBe("and they're used to cut grass.");
    expect(result[1].text).toBe("Whipper snippers.");
    expect(result[2].text).toBe("These are small rakes, big rakes used to rake up leaves.");
    expect(result[3].text).toBe("This is a garden hose used to water your garden.");

    // Verify chronological order and proper millisecond ranges
    expect(result[0].startTimeMs).toBeLessThan(result[1].startTimeMs);
    expect(result[1].startTimeMs).toBeLessThan(result[2].startTimeMs);
    expect(result[2].startTimeMs).toBeLessThan(result[3].startTimeMs);
  });

  test('does not break on common abbreviations or decimal numbers', () => {
    const raw = [
      { id: 1, name: 'SRT', startTimeMs: 0, endTimeMs: 3000, text: "Dr. Smith arrived at the clinic" },
      { id: 2, name: 'SRT', startTimeMs: 3000, endTimeMs: 6000, text: "to meet Mr. Watson for $3.50 per consultation." }
    ];

    const result = stitchSubtitleSentences(raw);
    expect(result.length).toBe(1);
    expect(result[0].text).toBe("Dr. Smith arrived at the clinic to meet Mr. Watson for $3.50 per consultation.");
  });

  test('splits on large pause gap (> 1.6s) even without terminal punctuation', () => {
    const raw = [
      { id: 1, name: 'ASR', startTimeMs: 1000, endTimeMs: 3000, text: "first we prepare the soil carefully" },
      { id: 2, name: 'ASR', startTimeMs: 5500, endTimeMs: 7500, text: "now we plant the seeds" } // 2.5s gap
    ];

    const result = stitchSubtitleSentences(raw);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe("first we prepare the soil carefully");
    expect(result[1].text).toBe("now we plant the seeds");
  });

  test('preserves dialogue speaker turns with dashes', () => {
    const raw = [
      { id: 1, name: 'SRT', startTimeMs: 1000, endTimeMs: 4000, text: "- Are you coming with us?\n- Yes, absolutely." }
    ];

    const result = stitchSubtitleSentences(raw);
    expect(result.length).toBe(2);
    expect(result[0].text).toBe("Are you coming with us?");
    expect(result[1].text).toBe("Yes, absolutely.");
  });
});
