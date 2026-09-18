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
  });

  test('returns null for plain sentences without advanced grammar', () => {
    const text = "The cat is sitting quietly on the comfortable sofa.";
    const result = detectGrammarInText(text);
    expect(result).toBeNull();
  });

  test('scans subtitle array and generates timestamped matches', () => {
    const subs = [
      { text: "Hello everyone and welcome to our podcast.", start: 1.5 },
      { text: "If I had known this earlier, I would have called you.", start: 45.2 },
      { text: "Never have we experienced such demand before.", start: 120.0 }
    ];

    const matches = scanSubtitlesForGrammar(subs);
    expect(matches.length).toBe(2);
    expect(matches[0].grammar.tag).toBe('third_conditional');
    expect(matches[0].formattedTimestamp).toBe('00:45');
    expect(matches[1].grammar.tag).toBe('inversion');
    expect(matches[1].formattedTimestamp).toBe('02:00');
  });
});
