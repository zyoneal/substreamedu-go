import {
  detectGrammarInText,
  scanSubtitlesForGrammar,
  formatTimeSeconds
} from './grammarDetector';

describe('grammarDetector', () => {
  test('formats seconds to mm:ss correctly', () => {
    expect(formatTimeSeconds(0)).toBe('00:00');
    expect(formatTimeSeconds(65)).toBe('01:05');
    expect(formatTimeSeconds(360)).toBe('06:00');
  });

  test('detects Third Conditional', () => {
    const text = "If I had known about the traffic, I would have taken the metro.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('third_conditional');
    expect(result?.cefrLevel).toBe('B2');
    expect(result?.formula).toContain('If + had + V3');
    expect(result?.miniQuiz.answer).toBe('had informed');
  });

  test('detects Modal Perfect (should have)', () => {
    const text = "You really should have told me before leaving.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('modal_perfect');
    expect(result?.shortLabel).toBe('Modal Perf');
    expect(result?.miniQuiz.options.length).toBeGreaterThanOrEqual(3);
  });

  test('detects Inversion with Negative Adverbial', () => {
    const text = "Never have I seen such incredible cinematography in my life.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('inversion');
    expect(result?.cefrLevel).toBe('C1');
  });

  test('detects Second Conditional', () => {
    const text = "If I had more money, I would buy that vintage car.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('second_conditional');
    expect(result?.cefrLevel).toBe('B1');
  });

  test('detects Causative Form', () => {
    const text = "I need to get my laptop repaired as soon as possible.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('causative');
  });

  test('detects Used to for past habits', () => {
    const text = "We used to play tennis together every Sunday morning.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('used_to');
    expect(result?.name).toBe('Used to (Past Habit)');
  });

  test('detects true Used to for past state or preference', () => {
    const text = "You could say I used to like trees.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('used_to');
  });

  test('detects Be / Get used to (Accustomed) with noun phrase', () => {
    const text = "help your brain get used to real English.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('be_used_to');
    expect(result?.cefrLevel).toBe('B2');
    expect(result?.shortLabel).toBe('Get used to');
  });

  test('detects Be / Get used to (Accustomed) with contraction and gerund', () => {
    const text = "I'm used to calling it soccer because I grew up in the US.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('be_used_to');
    expect(result?.cefrLevel).toBe('B2');
  });

  test('classifies tool/purpose "is used to + base verb" as Passive Voice, not accustomed', () => {
    const text = "The machete is used to cut down tall weeds in the garden.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('passive_voice');
    expect(result?.name).toBe('Passive Voice');
  });

  test('classifies tool contraction "it\'s used to clean / they\'re used to cut" as Passive Voice', () => {
    const res1 = detectGrammarInText("it's used to clean your ear, a Q-tip.");
    expect(res1?.tag).toBe('passive_voice');

    const res2 = detectGrammarInText("and they're used to cut grass. Whipper snippers.");
    expect(res2?.tag).toBe('passive_voice');
  });

  test('classifies reduced tool clause "a hand towel used to dry" as Passive Voice', () => {
    const result = detectGrammarInText("This is a hand towel. A hand towel used to dry your hands.");
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('passive_voice');
  });

  test('returns null for plain sentences without advanced grammar', () => {
    const text = "The cat is sitting quietly on the comfortable sofa.";
    const result = detectGrammarInText(text);
    expect(result).toBeNull();
  });

  test('scans subtitle array with startTimeMs and generates correct timestamps', () => {
    const subs = [
      { text: "Welcome back to a new video guys.", startTimeMs: 1200 },
      { text: "help your brain get used to real English.", startTimeMs: 14500 },
      { text: "cooking. Okay, the food has been cooked.", startTimeMs: 75000 },
      { text: "should have washed this out. Yeah maybe I", startTimeMs: 3665000 }
    ];

    const matches = scanSubtitlesForGrammar(subs);
    expect(matches.length).toBe(3);

    // 1. Get used to
    expect(matches[0].grammar.tag).toBe('be_used_to');
    expect(matches[0].timestampSeconds).toBe(14.5);
    expect(matches[0].formattedTimestamp).toBe('00:14');

    // 2. Passive Voice
    expect(matches[1].grammar.tag).toBe('passive_voice');
    expect(matches[1].timestampSeconds).toBe(75.0);
    expect(matches[1].formattedTimestamp).toBe('01:15');

    // 3. Modal Perfect over 1 hour
    expect(matches[2].grammar.tag).toBe('modal_perfect');
    expect(matches[2].timestampSeconds).toBe(3665.0);
    expect(matches[2].formattedTimestamp).toBe('01:01:05');
  });
});
