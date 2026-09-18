import {
  detectGrammarInText,
  scanSubtitlesForGrammar,
  formatTimeSeconds,
  getNativeExplanation
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

  test('detects Inversion with Negative Adverbial and extracts full inverted phrase', () => {
    const text = "Never have I seen such incredible cinematography in my life.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('inversion');
    expect(result?.cefrLevel).toBe('C1');
    expect(result?.formula).toBe('Negative/Restrictive Adverb + Auxiliary + Subject + Main Verb');
    expect(result?.matchedText).toBe('Never have I seen');
  });

  test('detects fronted negative inversion with "Never have I witnessed"', () => {
    const text = "Never have I witnessed such breathtaking cinematic visuals.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('inversion');
    expect(result?.matchedText).toBe('Never have I witnessed');
  });

  test('detects other fronted restrictive inversions (Rarely, Hardly, Little, Under no circumstances)', () => {
    expect(detectGrammarInText("Rarely do we encounter such profound dedication.")?.tag).toBe('inversion');
    expect(detectGrammarInText("Hardly had I arrived when the phone rang.")?.tag).toBe('inversion');
    expect(detectGrammarInText("Little did they know what was about to happen.")?.tag).toBe('inversion');
    expect(detectGrammarInText("Under no circumstances should you open this emergency door.")?.tag).toBe('inversion');
  });

  test('does NOT misclassify standard S-Aux-Adv-V word order as Negative Inversion (false positive prevention)', () => {
    // The user's exact authentic video subtitle:
    const videoSubtitle = "The girl you said was out of your league, that you'd never have a chance with.";
    const res1 = detectGrammarInText(videoSubtitle);
    expect(res1?.tag).not.toBe('inversion');

    expect(detectGrammarInText("I will never have enough time to finish this project.")?.tag).not.toBe('inversion');
    expect(detectGrammarInText("They rarely have coffee in the evening.")?.tag).not.toBe('inversion');
    expect(detectGrammarInText("He seldom does any chores around the house.")?.tag).not.toBe('inversion');
    expect(detectGrammarInText("We barely had time to pack our bags.")?.tag).not.toBe('inversion');
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

    const res3 = detectGrammarInText("that are used to carry like the vegetables and stuff to the");
    expect(res3?.tag).toBe('passive_voice');
    expect(res3?.name).toBe('Passive Voice');
    expect(res3?.miniQuiz.answer).toBe('cut');
  });

  test('classifies reduced tool clause "a hand towel used to dry" as Passive Voice', () => {
    const result = detectGrammarInText("This is a hand towel. A hand towel used to dry your hands.");
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('passive_voice');
  });

  test('detects Present Perfect Continuous', () => {
    const text = "I've been thinking about this project all week.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('present_perfect_continuous');
    expect(result?.cefrLevel).toBe('B1');
  });

  test('detects Be supposed to', () => {
    const text = "You're supposed to wear a hard hat on the construction site.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('be_supposed_to');
    expect(result?.cefrLevel).toBe('B2');
  });

  test('detects Modal Deduction (must be)', () => {
    const text = "Working 16 hours straight must be exhausting.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('modal_deduction');
    expect(result?.cefrLevel).toBe('B1');
  });

  test('detects Concession & Contrast (Even though)', () => {
    const text = "Even though it was raining heavily, the marathon continued.";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('concession');
    expect(result?.cefrLevel).toBe('B2');
  });

  test('detects Indirect / Embedded Question', () => {
    const text = "Do you know where the nearest subway entrance is?";
    const result = detectGrammarInText(text);
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('indirect_question');
    expect(result?.cefrLevel).toBe('B1');
  });

  test('returns null for plain sentences without advanced grammar', () => {
    const text = "The cat is sitting quietly on the comfortable sofa.";
    const result = detectGrammarInText(text);
    expect(result).toBeNull();
  });

  test('scans subtitle array with startTimeMs and generates correct timestamps', () => {
    const subs = [
      { text: "Welcome back to a new video guys.", startTimeMs: 1200, endTimeMs: 3000 },
      { text: "help your brain get used to real English.", startTimeMs: 14500, endTimeMs: 17000 },
      { text: "cooking. Okay, the food has been cooked.", startTimeMs: 75000, endTimeMs: 78000 },
      { text: "should have washed this out. Yeah maybe I", startTimeMs: 3665000, endTimeMs: 3668000 }
    ];

    const matches = scanSubtitlesForGrammar(subs);
    expect(matches.length).toBeGreaterThanOrEqual(3);

    // 1. Get used to
    expect(matches[0].grammar.tag).toBe('be_used_to');
    expect(matches[0].timestampSeconds).toBe(14.5);
    expect(matches[0].formattedTimestamp).toBe('00:14');

    // 2. Passive Voice
    expect(matches[1].grammar.tag).toBe('passive_voice');
    expect(Math.floor(matches[1].timestampSeconds)).toBe(75);
    expect(matches[1].formattedTimestamp).toBe('01:15');

    // 3. Modal Perfect over 1 hour
    expect(matches[2].grammar.tag).toBe('modal_perfect');
    expect(matches[2].timestampSeconds).toBe(3665.0);
    expect(matches[2].formattedTimestamp).toBe('01:01:05');
  });

  test('detects compound conditionals split across two subtitle cues through stitching', () => {
    const subs = [
      { id: 1, text: "If we had left ten minutes earlier,", startTimeMs: 20000, endTimeMs: 23000 },
      { id: 2, text: "we would have caught the train.", startTimeMs: 23000, endTimeMs: 26000 }
    ];

    const matches = scanSubtitlesForGrammar(subs);
    expect(matches.length).toBe(1);
    expect(matches[0].grammar.tag).toBe('third_conditional');
    expect(matches[0].text).toContain("would have caught");
  });

  test('returns Ukrainian native explanation when language is uk or ukrainian', () => {
    const ukExplanation = getNativeExplanation('second_conditional', 'uk');
    expect(ukExplanation).toContain('Нереальна або малоймовірна умова в теперішньому');

    const result = detectGrammarInText("If I was done driving my van, I would get out my van.", 'uk');
    expect(result).not.toBeNull();
    expect(result?.tag).toBe('second_conditional');
    expect(result?.nativeExplanation).toContain('Нереальна або малоймовірна умова в теперішньому');
  });

  test('returns Spanish native explanation when language is es', () => {
    const esExplanation = getNativeExplanation('second_conditional', 'es');
    expect(esExplanation).toContain('Segundo condicional: situaciones hipotéticas');
  });

  test('returns empty native explanation when learner language is English to avoid redundancy', () => {
    const enExplanation = getNativeExplanation('second_conditional', 'en');
    expect(enExplanation).toBe('');
  });
});
