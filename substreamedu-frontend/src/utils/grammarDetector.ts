import { stitchSubtitleSentences } from './subtitleSentenceStitcher';

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

  // 7. Passive Voice (Perfect, Modal, or Present/Past of Use)
  {
    tag: 'passive_voice',
    name: 'Passive Voice',
    shortLabel: 'Passive',
    cefrLevel: 'B1',
    formula: 'be + Past Participle (V3)',
    explanation: 'Focuses attention on the recipient of the action, outcome, or function/purpose rather than the doer.',
    nativeExplanation: 'Страдательный (пассивный) залог: фокус на объекте, результате действия или назначении инструмента.',
    pattern: /\b(?:(?:has|have|had)\s+been|was\s+being|were\s+being|is\s+being|will\s+be|must\s+be|can\s+be|should\s+be)\s+(?:completed|built|written|discovered|created|delayed|canceled|approved|rejected|released|made|found|cooked|[a-z]{3,}ed)\b|(?:\b(?:is|are|was|were)\b|['’](?:s|re))\s+used\s+to\s+(?![a-z]+ing\b)[a-z]{3,}|\b(?:rakes?|hose|towel|towels|shovel|shovels|knife|knives|machete|blade|tool|tools|device|devices|wire|dish|pan|pot|cloth|sponge|brush|thing|stuff)\s+used\s+to\s+(?![a-z]+ing\b)[a-z]{3,}/i,
    generateQuiz: (matchedText: string) => {
      if (matchedText.toLowerCase().includes('used to')) {
        return {
          question: "A pair of scissors is used to ___ paper and fabric.",
          options: ["cut", "cutting", "cuts"],
          answer: "cut",
          hint: "Passive of purpose (be used to) takes the base verb (infinitive)",
          explanation: "When 'be used to' describes the function of a tool, it uses the base verb form."
        };
      }
      return {
        question: "The new software update ___ to all users next Monday.",
        options: ["will be delivered", "will deliver", "delivering"],
        answer: "will be delivered",
        hint: "Future passive: will be + V3",
        explanation: "Future passive uses 'will be + past participle'."
      };
    }
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

  // 9. Be / Get used to (Accustomed)
  {
    tag: 'be_used_to',
    name: 'Be / Get used to (Accustomed)',
    shortLabel: 'Get used to',
    cefrLevel: 'B2',
    formula: 'be / get + used to + noun / V-ing',
    explanation: 'Describes becoming or being accustomed to something familiar through habit or experience.',
    nativeExplanation: 'Конструкция be / get used to: привыкнуть к чему-либо или быть привыкшим (требует существительное или -ing).',
    pattern: /(?:(?:\b(?:be|am|is|are|was|were|been|being)\b|['’](?:m|re|s))\s+used\s+to\s+(?:[a-z]+ing\b|(?:it|this|that|them|me|us|him|her)\b|(?:the|a|an|this|that|my|your|his|her|our|their|real)\s+[a-z]{2,}\b)|\b(?:get|gets|got|getting)\s+used\s+to(?:\s+(?:[a-z]{2,}|the|a|an|my|your|his|her|our|their|this|that|it|real))?)/i,
    generateQuiz: () => ({
      question: "It took him some time to get used to ___ early every morning.",
      options: ["waking up", "wake up", "woke up"],
      answer: "waking up",
      hint: "After 'get used to', use the -ing form (gerund) or noun",
      explanation: "'Get used to' is followed by a gerund (-ing) or noun."
    })
  },

  // 10. Used to / Would (Past Habit)
  {
    tag: 'used_to',
    name: 'Used to (Past Habit)',
    shortLabel: 'Used to',
    cefrLevel: 'B1',
    formula: 'used to + base verb / didn\'t use to',
    explanation: 'Contrasts past routines or states with the present, emphasizing that it is no longer true.',
    nativeExplanation: 'Конструкция used to: привычки или состояния в прошлом, которых больше нет.',
    pattern: /(?<!\b(?:be|am|is|are|was|were|been|being|get|gets|got|getting)\s+)(?<!['’](?:m|re|s)\s+)\b(?:used\s+to\s+(?![a-z]+ing\b)[a-z]{3,}|didn't\s+use\s+to\s+[a-z]{3,})\b/i,
    generateQuiz: () => ({
      question: "She ___ live in Paris, but now she resides in Tokyo.",
      options: ["used to", "was used to", "use to"],
      answer: "used to",
      hint: "Past discontinued state uses 'used to + infinitive'",
      explanation: "'Used to' expresses a past state that no longer exists."
    })
  },

  // 11. Participle Clause
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

  // 12. First Conditional
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
  },

  // 13. Present Perfect Continuous (B1)
  {
    tag: 'present_perfect_continuous',
    name: 'Present Perfect Continuous',
    shortLabel: 'Pres Perf Cont',
    cefrLevel: 'B1',
    formula: 'have / has + been + V-ing',
    explanation: 'Emphasizes an ongoing activity that started in the past and continues to the present moment or just finished.',
    nativeExplanation: 'Длительное действие, начавшееся в прошлом и продолжающееся в настоящий момент или только что завершившееся.',
    pattern: /\b(?:have|has|'ve|'s)\s+been\s+(?:thinking|waiting|looking|trying|working|learning|living|doing|watching|studying|talking|playing|using|running|getting|[a-z]{3,}ing)\b/i,
    generateQuiz: () => ({
      question: "She ___ for over an hour and her presentation is almost ready.",
      options: ["has been working", "has worked", "is working"],
      answer: "has been working",
      hint: "Ongoing duration leading up to present uses Present Perfect Continuous",
      explanation: "'Has been working' emphasizes the duration of the ongoing activity."
    })
  },

  // 14. Be supposed to (B2)
  {
    tag: 'be_supposed_to',
    name: 'Be supposed to (Expectation / Obligation)',
    shortLabel: 'Supposed to',
    cefrLevel: 'B2',
    formula: 'be + supposed to + base verb',
    explanation: 'Expresses what is intended, expected, or required by rule, custom, or schedule.',
    nativeExplanation: 'Конструкция be supposed to: предполагается, должен по правилам или договорённости.',
    pattern: /\b(?:(?:am|is|are|was|were)\b|['’](?:m|re|s))\s+(?:not\s+)?supposed\s+to\s+[a-z]{3,}\b/i,
    generateQuiz: () => ({
      question: "You ___ park your car in front of the emergency exit.",
      options: ["aren't supposed to", "don't suppose to", "aren't supposing to"],
      answer: "aren't supposed to",
      hint: "Negative obligation uses 'aren't supposed to + base verb'",
      explanation: "'Be supposed to' describes rules and expectations."
    })
  },

  // 15. Modal Deduction (B1)
  {
    tag: 'modal_deduction',
    name: 'Modal Deduction (Certainty / Impossibility)',
    shortLabel: 'Deduction',
    cefrLevel: 'B1',
    formula: 'must / can\'t + be + Adjective/Noun',
    explanation: 'Draws a logical conclusion about a present situation based on clear evidence or context.',
    nativeExplanation: 'Модальный глагол логической дедукции: уверенность или вывод (должно быть, не может быть).',
    pattern: /\b(?:must|can't)\s+be\s+(?:(?:really|very|super|so|quite)\s+)?(?:hard|difficult|easy|true|expensive|crazy|exhausting|impossible|obvious|[a-z]{3,}ing|[a-z]{4,}ful)\b/i,
    generateQuiz: () => ({
      question: "They've traveled for 20 hours without sleep; they ___ exhausted.",
      options: ["must be", "can be", "should being"],
      answer: "must be",
      hint: "Strong logical deduction of certainty uses 'must be'",
      explanation: "'Must be' expresses logical certainty based on evidence."
    })
  },

  // 16. Concession & Contrast (B2)
  {
    tag: 'concession',
    name: 'Concession (Even though / Although)',
    shortLabel: 'Concession',
    cefrLevel: 'B2',
    formula: 'Even though / Although + Clause, Main Clause',
    explanation: 'Introduces a subordinate clause with a fact that makes the main clause surprising or unexpected.',
    nativeExplanation: 'Придаточное предложение уступки: связывает факты вопреки трудностям или неожиданным обстоятельствам.',
    pattern: /\b(?:even\s+though|although|despite\s+the\s+fact\s+that|in\s+spite\s+of\s+the\s+fact)\b[^.!?]{4,80}\b/i,
    generateQuiz: () => ({
      question: "___ it was raining heavily, they continued their hike through the canyon.",
      options: ["Even though", "Despite", "In spite"],
      answer: "Even though",
      hint: "'Even though' is followed by a full subject-verb clause",
      explanation: "'Even though' connects two contrasting full clauses."
    })
  },

  // 17. Indirect Questions (B1)
  {
    tag: 'indirect_question',
    name: 'Indirect / Embedded Question',
    shortLabel: 'Indirect Q',
    cefrLevel: 'B1',
    formula: 'Introductory phrase + question word / if + Subject + Verb',
    explanation: 'A polite, indirect way to ask for information where the word order remains affirmative.',
    nativeExplanation: 'Косвенный вопрос: вежливая формулировка с прямым порядком слов (Subject + Verb).',
    pattern: /\b(?:i\s+wonder\s+(?:if|whether|how|why|where|what|when)|do\s+you\s+know\s+(?:if|whether|how|why|where|what|when))\b/i,
    generateQuiz: () => ({
      question: "Do you know what time ___?",
      options: ["the train arrives", "does the train arrive", "arrives the train"],
      answer: "the train arrives",
      hint: "Indirect questions use affirmative word order (Subject + Verb)",
      explanation: "In indirect questions, auxiliary verbs like 'does' are omitted and normal order applies."
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
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  const paddedMins = mins.toString().padStart(2, '0');
  const paddedSecs = secs.toString().padStart(2, '0');
  if (hours > 0) {
    const paddedHours = hours.toString().padStart(2, '0');
    return `${paddedHours}:${paddedMins}:${paddedSecs}`;
  }
  return `${paddedMins}:${paddedSecs}`;
}

export function scanSubtitlesForGrammar(
  subtitles: Array<any> | null | undefined
): VideoGrammarMatch[] {
  if (!Array.isArray(subtitles) || subtitles.length === 0) {
    return [];
  }

  // Pre-process and stitch broken subtitle fragments into full, grammatically unbroken sentences
  const stitched = stitchSubtitleSentences(subtitles);
  const results: VideoGrammarMatch[] = [];
  const seenTagsPerMinute = new Map<string, number>();

  for (let i = 0; i < stitched.length; i++) {
    const sub = stitched[i];
    const text = typeof sub.text === 'string' ? sub.text : '';
    if (!text || text.length < 10) continue;

    const detected = detectGrammarInText(text);
    if (!detected) continue;

    let startSeconds = 0;
    if (typeof sub.startTimeMs === 'number' && sub.startTimeMs > 0) {
      startSeconds = sub.startTimeMs / 1000;
    } else if (typeof sub.start === 'number' && sub.start > 0) {
      startSeconds = sub.start > 10000 ? sub.start / 1000 : sub.start;
    } else if (typeof sub.startTime === 'number' && sub.startTime > 0) {
      startSeconds = sub.startTime > 10000 ? sub.startTime / 1000 : sub.startTime;
    }

    // Prevent spamming the same grammar point in immediate consecutive lines (< 4s apart)
    const timeBucket = Math.floor(startSeconds / 4);
    const key = `${detected.tag}_${timeBucket}`;
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
