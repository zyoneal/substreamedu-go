export interface GrammarMiniQuiz {
  question: string;
  options: string[];
  answer: string;
  hint: string;
  explanation: string;
}

export interface DetectedGrammarPoint {
  tag: string;
  name: string;
  shortLabel: string;
  cefrLevel: 'B1' | 'B2' | 'C1' | 'C2';
  formula: string;
  explanation: string;
  nativeExplanation: string;
  matchedText: string;
  matchIndex: number;
  matchLength: number;
  miniQuiz: GrammarMiniQuiz;
}

export interface VideoGrammarMatch {
  id: string;
  cueIndex: number;
  timestampSeconds: number;
  formattedTimestamp: string;
  text: string;
  grammar: DetectedGrammarPoint;
}

interface GrammarRuleDefinition {
  tag: string;
  name: string;
  shortLabel: string;
  cefrLevel: 'B1' | 'B2' | 'C1' | 'C2';
  formula: string;
  explanation: string;
  nativeExplanation: string;
  pattern: RegExp;
  generateQuiz: (matchedText: string, contextSentence: string) => GrammarMiniQuiz;
}

const GRAMMAR_RULES: GrammarRuleDefinition[] = [
  // 1. Third Conditional
  {
    tag: 'third_conditional',
    name: 'Third Conditional',
    shortLabel: '3rd Cond',
    cefrLevel: 'B2',
    formula: 'If + had + V3, ... would have + V3',
    explanation: 'Reflects on an impossible past scenario and its unrealized consequence or regret.',
    nativeExplanation: 'Нереальное условие в прошлом: сожаление или размышление о том, чего не произошло.',
    pattern: /\b(?:if\b[^.!?]{2,80}\bhad\b[^.!?]{1,60}\b(?:would|could|might)\s+have\b|\b(?:would|could|might)\s+have\b[^.!?]{1,60}\bif\b[^.!?]{2,80}\bhad\b|\bhad\s+(?:i|you|he|she|we|they|it)\b[^.!?]{1,60}\b(?:would|could|might)\s+have\b)/i,
    generateQuiz: () => ({
      question: "If they ___ us earlier, we would have prepared the documents.",
      options: ["had informed", "informed", "have informed"],
      answer: "had informed",
      hint: "Condition clause in the 3rd conditional uses Past Perfect (had + V3)",
      explanation: "Third conditional uses 'had + past participle' in the if-clause."
    })
  },

  // 2. Inverted Conditionals (C1)
  {
    tag: 'inverted_conditional',
    name: 'Inverted Conditional',
    shortLabel: 'Inverted Cond',
    cefrLevel: 'C1',
    formula: 'Had / Were / Should + Subject + Verb ..., Main Clause',
    explanation: 'A sophisticated, formal alternative to "if"-clauses where the auxiliary verb is inverted to the front.',
    nativeExplanation: 'Инверсивное условное предложение: формальная конструкция без слова "if".',
    pattern: /\b(?:had\s+(?:i|you|he|she|we|they)\s+(?:known|seen|been|realized|received|thought)|were\s+(?:i|you|he|she|we|they)\s+to\b|should\s+(?:you|anyone|someone)\s+(?:need|have|wish|require))\b/i,
    generateQuiz: () => ({
      question: "___ you need any assistance, please do not hesitate to reach out.",
      options: ["Should", "If should", "Had"],
      answer: "Should",
      hint: "First conditional inversion with 'Should'",
      explanation: "'Should you need...' replaces 'If you should need...' in formal registers."
    })
  },

  // 3. Modal Perfects (should have / could have / must have)
  {
    tag: 'modal_perfect',
    name: 'Modal Perfect',
    shortLabel: 'Modal Perf',
    cefrLevel: 'B2',
    formula: 'Modal (should / could / must / might / can\'t) + have + V3',
    explanation: 'Expresses past deduction, criticism, regret, or missed possibility.',
    nativeExplanation: 'Модальный глагол с перфектным инфинитивом для выражения прошлых догадок, сожалений или критики.',
    pattern: /\b(?:should|shouldn't|could|couldn't|must|might|can't)\s+have\s+(?:been|seen|done|known|gone|made|told|thought|taken|given|said|come|heard|felt|left|found|[a-z]{3,}ed)\b/i,
    generateQuiz: () => ({
      question: "You ___ the speed limit; the road was extremely icy.",
      options: ["should have respected", "must respect", "could respecting"],
      answer: "should have respected",
      hint: "Past obligation/criticism requires should + have + V3",
      explanation: "'Should have + V3' expresses criticism or regret about a past action."
    })
  },

  // 4. Second Conditional
  {
    tag: 'second_conditional',
    name: 'Second Conditional',
    shortLabel: '2nd Cond',
    cefrLevel: 'B1',
    formula: 'If + Past Simple, ... would + base verb',
    explanation: 'Hypothetical, imaginary, or improbable scenarios in the present or future.',
    nativeExplanation: 'Нереальное или маловероятное условие в настоящем или будущем (если бы..., то...).',
    pattern: /\b(?:if\s+(?:i|you|he|she|it|we|they|[a-z]+)\s+(?:were|had\s+(?:a|the|more|enough|no|[a-z]+s?\b)|knew|could|did|wanted|was)\b[^.!?]{1,60}\b(?:would|could|might)\s+[a-z]{3,}|\b(?:would|could|might)\s+[a-z]{3,}\b[^.!?]{1,60}\bif\s+(?:i|you|he|she|it|we|they|[a-z]+)\s+(?:were|had|knew|could|did|wanted|was)\b)/i,
    generateQuiz: () => ({
      question: "If I ___ more free time, I would travel around the world.",
      options: ["had", "have", "would have"],
      answer: "had",
      hint: "Past simple is used in the condition clause for hypothetical situations.",
      explanation: "Second conditional takes Past Simple in the condition clause."
    })
  },

  // 5. Inversion with Negative Adverbials
  {
    tag: 'inversion',
    name: 'Negative Inversion',
    shortLabel: 'Inversion',
    cefrLevel: 'C1',
    formula: 'Negative Adverbial + Auxiliary + Subject + Main Verb',
    explanation: 'Emphatic sentence structure placing negative or restrictive words first for dramatic effect.',
    nativeExplanation: 'Инверсия с отрицательными наречиями: выразительный стилистический приём для усиления речи.',
    pattern: /\b(?:never\s+(?:have|had|did|will)|hardly\s+(?:had|did)|scarcely\s+(?:had|did)|rarely\s+(?:have|had|do|did)|seldom\s+(?:have|had|do|did)|barely\s+(?:had|did)|not\s+only\s+(?:did|is|was|can|do|does|have)|under\s+no\s+circumstances\s+(?:should|must|will))\b/i,
    generateQuiz: () => ({
      question: "Never ___ such breathtaking cinematic visuals.",
      options: ["have I witnessed", "I have witnessed", "did I witnessed"],
      answer: "have I witnessed",
      hint: "Negative inversion requires auxiliary before subject",
      explanation: "After negative adverbs like 'Never', the auxiliary verb precedes the subject."
    })
  },

  // 6. Causative Form (have/get something done)
  {
    tag: 'causative',
    name: 'Causative Form',
    shortLabel: 'Causative',
    cefrLevel: 'B2',
    formula: 'have / get + object + Past Participle (V3)',
    explanation: 'Indicates arranging for someone else to perform a service or action for you.',
    nativeExplanation: 'Каузативная форма: действие выполняется кем-то другим по вашей просьбе или заказу.',
    pattern: /\b(?:have|has|had|get|gets|got)\s+(?:(?:my|your|his|her|our|their|the|a|an)\s+)?[a-z]+\s+(?:repaired|fixed|cleaned|checked|tested|delivered|built|done|replaced|painted|serviced|installed)\b/i,
    generateQuiz: () => ({
      question: "We need to have our car ___ before the long winter road trip.",
      options: ["serviced", "service", "servicing"],
      answer: "serviced",
      hint: "Causative pattern: have + object + V3",
      explanation: "The structure 'have + object + past participle' denotes professional service."
    })
  },

  // 7. Passive Voice (Perfect or Modal)
  {
    tag: 'passive_voice',
    name: 'Passive Voice',
    shortLabel: 'Passive',
    cefrLevel: 'B1',
    formula: 'be (in tense) + Past Participle (V3)',
    explanation: 'Focuses attention on the recipient of the action or the result, rather than the doer.',
    nativeExplanation: 'Страдательный (пассивный) залог: фокус на объекте или результате действия, а не на исполнителе.',
    pattern: /\b(?:has\s+been|have\s+been|had\s+been|was\s+being|were\s+being|is\s+being|will\s+be|must\s+be|can\s+be|should\s+be)\s+(?:completed|built|written|discovered|created|delayed|canceled|approved|rejected|released|made|found|[a-z]{3,}ed)\b/i,
    generateQuiz: () => ({
      question: "The new software update ___ to all users next Monday.",
      options: ["will be delivered", "will deliver", "delivering"],
      answer: "will be delivered",
      hint: "Future passive: will be + V3",
      explanation: "Future passive uses 'will be + past participle'."
    })
  },

  // 8. Wish / If only
  {
    tag: 'wish_if_only',
    name: 'Wish / Regret',
    shortLabel: 'Wish',
    cefrLevel: 'B2',
    formula: 'wish / if only + Past Simple / Past Perfect',
    explanation: 'Communicates longing or regret about a situation that is contrary to reality.',
    nativeExplanation: 'Конструкция с wish / if only: выражение сожаления о настоящем или прошлом.',
    pattern: /\b(?:i\s+wish|we\s+wish|if\s+only)\b[^.!?]{1,60}\b(?:had|were|could|would)\b/i,
    generateQuiz: () => ({
      question: "I wish I ___ play the piano as fluently as you do.",
      options: ["could", "can", "will"],
      answer: "could",
      hint: "Wish about present ability uses 'could'",
      explanation: "'Wish + could + base verb' expresses desire for a present ability."
    })
  },

  // 9. Used to / Would (Past Habit)
  {
    tag: 'used_to',
    name: 'Used to (Past Habit)',
    shortLabel: 'Used to',
    cefrLevel: 'B1',
    formula: 'used to + base verb / didn\'t use to',
    explanation: 'Contrasts past routines or states with the present, emphasizing that it is no longer true.',
    nativeExplanation: 'Конструкция used to: привычки или состояния в прошлом, которых больше нет.',
    pattern: /\b(?:used\s+to\s+[a-z]{3,}|didn't\s+use\s+to\s+[a-z]{3,})\b/i,
    generateQuiz: () => ({
      question: "She ___ live in Paris, but now she resides in Tokyo.",
      options: ["used to", "was used to", "use to"],
      answer: "used to",
      hint: "Past discontinued state uses 'used to + infinitive'",
      explanation: "'Used to' expresses a past state that no longer exists."
    })
  },

  // 10. Participle Clause
  {
    tag: 'participle_clause',
    name: 'Participle Clause',
    shortLabel: 'Participle',
    cefrLevel: 'C1',
    formula: 'Having + V3 / V-ing ..., Main Clause',
    explanation: 'An economical, literary clause combining cause, condition, or sequence into a single participle phrase.',
    nativeExplanation: 'Причастный оборот: компактное объединение причины или последовательности действий.',
    pattern: /\b(?:having\s+(?:finished|completed|arrived|seen|heard|discovered|spent|[a-z]{3,}ed)|not\s+having\s+[a-z]{3,})\b/i,
    generateQuiz: () => ({
      question: "___ the assignment, the student closed his laptop and took a walk.",
      options: ["Having finished", "Finished", "Have finished"],
      answer: "Having finished",
      hint: "Perfect participle (Having + V3) indicates completion before main action",
      explanation: "'Having finished' indicates the action completed prior to the main clause."
    })
  },

  // 11. First Conditional
  {
    tag: 'first_conditional',
    name: 'First Conditional',
    shortLabel: '1st Cond',
    cefrLevel: 'B1',
    formula: 'If + Present Simple, ... will + base verb',
    explanation: 'Refers to realistic, highly probable situations and their likely outcomes in the future.',
    nativeExplanation: 'Реальное условие в будущем: вероятная ситуация и её логический результат.',
    pattern: /\b(?:if\s+[^.!?]{2,60}\b(?:is|are|am|do|does|comes?|goes?|has|have|starts?|arrives?)\b[^.!?]{1,60}\b(?:will|won't|can|can't)\s+[a-z]{3,}|\b(?:will|won't)\s+[a-z]{3,}\b[^.!?]{1,60}\bif\s+[^.!?]{2,60}\b(?:is|are|am|do|does|comes?|goes?|has|have))/i,
    generateQuiz: () => ({
      question: "If it rains tomorrow, we ___ the outdoor session.",
      options: ["will reschedule", "would reschedule", "rescheduled"],
      answer: "will reschedule",
      hint: "First conditional result clause uses 'will + base verb'",
      explanation: "First conditional pairs Present Simple in the if-clause with 'will + verb' in the main clause."
    })
  }
];

export function detectGrammarInText(rawText: string | null | undefined): DetectedGrammarPoint | null {
  if (!rawText) return null;
  const text = rawText.trim();
  if (text.length < 10) return null;

  for (const rule of GRAMMAR_RULES) {
    const match = rule.pattern.exec(text);
    if (match && match[0]) {
      const matchedText = match[0];
      const matchIndex = match.index;
      return {
        tag: rule.tag,
        name: rule.name,
        shortLabel: rule.shortLabel,
        cefrLevel: rule.cefrLevel,
        formula: rule.formula,
        explanation: rule.explanation,
        nativeExplanation: rule.nativeExplanation,
        matchedText,
        matchIndex,
        matchLength: matchedText.length,
        miniQuiz: rule.generateQuiz(matchedText, text)
      };
    }
  }

  return null;
}

export function formatTimeSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const paddedMins = mins.toString().padStart(2, '0');
  const paddedSecs = secs.toString().padStart(2, '0');
  return `${paddedMins}:${paddedSecs}`;
}

export function scanSubtitlesForGrammar(
  subtitles: Array<any> | null | undefined
): VideoGrammarMatch[] {
  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    return [];
  }

  const results: VideoGrammarMatch[] = [];
  const seenTagsPerMinute = new Map<string, number>();

  for (let i = 0; i < subtitles.length; i++) {
    const sub = subtitles[i];
    const text = typeof sub.text === 'string' ? sub.text : '';
    if (!text || text.length < 12) continue;

    const detected = detectGrammarInText(text);
    if (!detected) continue;

    const startSeconds = typeof sub.start === 'number'
      ? sub.start
      : typeof sub.startTime === 'number'
        ? sub.startTime
        : 0;

    // Prevent spamming the same grammar point in immediate consecutive lines (< 3s apart)
    const minuteBucket = Math.floor(startSeconds / 3);
    const key = `${detected.tag}_${minuteBucket}`;
    if (seenTagsPerMinute.has(key)) {
      continue;
    }
    seenTagsPerMinute.set(key, 1);

    results.push({
      id: `grammar-cue-${i}-${detected.tag}`,
      cueIndex: i,
      timestampSeconds: startSeconds,
      formattedTimestamp: formatTimeSeconds(startSeconds),
      text: text,
      grammar: detected
    });
  }

  return results;
}
