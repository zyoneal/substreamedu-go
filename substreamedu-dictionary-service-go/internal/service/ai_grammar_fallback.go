package service

import (
	"fmt"
	"strings"
	"time"

	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

func getGrammarFallbackNative(tag, fluentLanguage string) string {
	lowerLang := strings.ToLower(fluentLanguage)
	isUk := strings.Contains(lowerLang, "ukrain") || lowerLang == "uk" || lowerLang == "ua"
	isEs := strings.Contains(lowerLang, "span") || lowerLang == "es"
	isPl := strings.Contains(lowerLang, "pol") || lowerLang == "pl"
	isTr := strings.Contains(lowerLang, "turk") || lowerLang == "tr"

	switch tag {
	case "third_conditional":
		if isUk {
			return "Нереальна умова в минулому: жаль або роздуми про те, що не сталося."
		} else if isEs {
			return "Tercer condicional: expresa una condición imposible en el pasado y su consecuencia no realizada."
		} else if isPl {
			return "Trzeci okres warunkowy: nierealny warunek w przeszłości i jego wyobrażony skutek."
		} else if isTr {
			return "Third Conditional: Geçmişte gerçekleşmemiş bir durum ve pişmanlık ifade eder."
		}
		return "Нереальное условие в прошлом (сожаление или размышление о том, чего не произошло)."
	case "second_conditional":
		if isUk {
			return "Нереальна або малоймовірна умова в теперішньому чи майбутньому (якби..., то...). Уявні сценарії."
		} else if isEs {
			return "Segundo condicional: situaciones hipotéticas o improbables en el presente o futuro."
		} else if isPl {
			return "Drugi okres warunkowy: hipotetyczne sytuacje w teraźniejszości lub przyszłości."
		} else if isTr {
			return "Second Conditional: Şu an veya gelecek için varsayımsal durumlar."
		}
		return "Нереальное или маловероятное условие в настоящем/будущем (если бы... то...)."
	case "modal_perfect":
		if isUk {
			return "Модальне дієслово + перфектний інфінітив для вираження припущення, можливості, жалю, критики або очікування щодо минулої дії."
		} else if isEs {
			return "Verbo modal + infinitivo perfecto (have + V3) para expresar deducción, posibilidad, arrepentimiento o crítica sobre situaciones pasadas."
		} else if isPl {
			return "Czasownik modalny + Perfect Infinitive (have + V3) do wyrażania przypuszczeń, możliwości, żalu lub krytyki dotyczących przeszłości."
		} else if isTr {
			return "Modal + have + V3 yapısı: Geçmişe dair mantıksal çıkarım, olasılık, pişmanlık veya eleştiri bildirmek için kullanılır."
		}
		return "Модальный глагол + перфектный инфинитив для выражения предположения, возможности, сожаления, критики или упрёка относительно прошлого действия."
	case "passive_voice":
		if isUk {
			return "Пасивний (страждальний) стан: фокус на об'єкті дії або призначенні інструмента."
		}
		return "Пассивный (страдательный) залог — фокус на объекте действия, а не на исполнителе."
	case "causative_form":
		if isUk {
			return "Каузативна форма: дія виконується кимось іншим на ваше замовлення або прохання."
		}
		return "Каузативная форма: действие выполняется кем-то другим по вашей просьбе или заказу."
	case "inversion":
		if isUk {
			return "Інверсія після заперечних або обмежувальних прислівників: вимагає порядку слів «Прислівник + Допоміжне дієслово + Підмет + Дієслово» для підсилення висловлювання."
		} else if isEs {
			return "Inversión negativa enfática: el adverbio negativo inicial exige la estructura «Adverbio + Verbo auxiliar + Sujeto + Verbo principal» para dar énfasis dramático."
		} else if isPl {
			return "Inwersja po przysłówkach przeczących wysuniętych na początek zdania — czasownik posiłkowy poprzedza podmiot dla wzmocnienia dramaturgii."
		} else if isTr {
			return "Vurgulu negatif devrik yapı: olumsuz zarf başa geldiğinde yardımcı fiil özneden önce gelir."
		}
		return "Эмфатическая инверсия: вынесение отрицательного или ограничительного наречия в начало предложения меняет порядок слов на «Наречие + Вспомогательный глагол + Подлежащее + Глагол»."
	case "wish_if_only":
		if isUk {
			return "Конструкція з wish / if only: вираження жалю про теперішню або минулу ситуацію."
		}
		return "Конструкция с wish / if only: выражение сожаления о настоящем или прошлом."
	case "be_used_to":
		if isUk {
			return "Конструкція be / get used to: бути звиклим або звикати до чогось (вимагає іменник або закінчення -ing)."
		}
		return "Конструкция be / get used to: привыкнуть к чему-либо (требует существительное или герундий -ing)."
	case "used_to":
		if isUk {
			return "Конструкція used to: регулярні звички або стани в минулому, яких більше немає."
		}
		return "Конструкция used to: привычки или состояния в прошлом, которых больше нет."
	case "participle_clause":
		if isUk {
			return "Дієприкметниковий зворот: компактне поєднання причини, умови або послідовності дій."
		}
		return "Причастный оборот: компактное объединение причины или последовательности действий."
	case "first_conditional":
		if isUk {
			return "Реальна умова в теперішньому або майбутньому з високою ймовірністю результату."
		}
		return "Реальное условие в настоящем или будущем с вероятным результатом."
	case "present_perfect_continuous":
		if isUk {
			return "Тривала дія, що розпочалася в минулому і триває дотепер або щойно закінчилася."
		}
		return "Длительное действие, начавшееся в прошлом и продолжающееся в настоящий момент или только что завершившееся."
	case "be_supposed_to":
		if isUk {
			return "Конструкція be supposed to: передбачається, належить або слід зробити за правилами чи домовленістю."
		}
		return "Конструкция be supposed to: предполагается, должен по правилам или договорённости."
	case "modal_deduction":
		if isUk {
			return "Модальне дієслово логічного висновку: висока впевненість або неможливість (має бути, не може бути)."
		}
		return "Модальный глагол логической дедукции: уверенность или вывод (должно быть, не может быть)."
	case "concession":
		if isUk {
			return "Підрядне речення допусту (Even though / Although): з'єднує факти всупереч перешкодам або несподіванкам."
		}
		return "Придаточное предложение уступки: связывает факты вопреки трудностям или неожиданным обстоятельствам."
	case "indirect_question":
		if isUk {
			return "Непряме запитання: ввічливе формулювання з прямим стверджувальним порядком слів (Subject + Verb)."
		}
		return "Косвенный вопрос: вежливая формулировка с прямым порядком слов (Subject + Verb)."
	}
	if isUk {
		return "Граматична конструкція англійської мови."
	}
	return "Грамматическая конструкция английского языка."
}

func (s *AIService) getGrammarFallback(sentence, ruleHint, fluentLanguage string) *dto.AnalyzeGrammarResponse {
	res := s.resolveGrammarFallbackRule(sentence, ruleHint)
	if res != nil {
		res.NativeExplanation = getGrammarFallbackNative(res.StructureTag, fluentLanguage)
		if len(res.Exercise.Options) > 0 {
			res.Exercise.Options = shuffleStrings(res.Exercise.Options)
		}
	}
	return res
}

func (s *AIService) resolveGrammarFallbackRule(sentence, ruleHint string) *dto.AnalyzeGrammarResponse {
	lower := strings.ToLower(sentence)
	tag := strings.ToLower(ruleHint)

	if tag == "inversion" || strings.HasPrefix(lower, "never ") || strings.HasPrefix(lower, "rarely ") || strings.HasPrefix(lower, "seldom ") || strings.HasPrefix(lower, "hardly had") || strings.HasPrefix(lower, "little did") || strings.HasPrefix(lower, "not only did") {
		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Negative Inversion",
			StructureTag:       "inversion",
			CefrLevel:          "C1",
			Formula:            "Negative/Restrictive Adverb + Auxiliary + Subject + Main Verb",
			Explanation:        "Moving a negative or restrictive expression to the beginning of a clause triggers subject-auxiliary inversion for emphatic or dramatic effect.",
			NativeExplanation:  "Эмфатическая инверсия: вынесение отрицательного или ограничительного наречия в начало предложения меняет порядок слов на «Наречие + Вспомогательный глагол + Подлежащее + Глагол».",
			HighlightedSegment: "Never have I",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "have I witnessed",
				Prompt:          "Never ___ such breathtaking cinematic visuals.",
				SentenceBefore:  "Never ",
				SentenceAfter:   " such breathtaking cinematic visuals.",
				Hint:            "Auxiliary verb before subject (have + I + V3)",
				Options:         []string{"have I witnessed", "I have witnessed", "did I witnessed"},
				AcceptedAnswers: []string{"have I witnessed"},
				Explanation:     "After fronted negative adverbs like 'Never', the auxiliary verb precedes the subject.",
			},
		}
	}

	if tag == "third_conditional" || (strings.Contains(lower, "if ") && (strings.Contains(lower, "would have") || strings.Contains(lower, "could have"))) {
		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Third Conditional",
			StructureTag:       "third_conditional",
			CefrLevel:          "B2",
			Formula:            "If + had + V3, ... would have + V3",
			Explanation:        "Speculates about an impossible past scenario and its unrealized consequence.",
			NativeExplanation:  "Нереальное условие в прошлом (сожаление или размышление о том, чего не произошло).",
			HighlightedSegment: "would have",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "had known",
				Prompt:          "If she ___ the truth, she would have acted differently.",
				SentenceBefore:  "If she ",
				SentenceAfter:   " the truth, she would have acted differently.",
				Hint:            "Past Perfect (had + V3)",
				Options:         []string{"had known", "knew", "has known"},
				AcceptedAnswers: []string{"had known"},
				Explanation:     "Third conditional uses past perfect in the condition clause.",
			},
		}
	}

	if tag == "second_conditional" || (strings.Contains(lower, "if ") && strings.Contains(lower, "would ")) {
		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Second Conditional",
			StructureTag:       "second_conditional",
			CefrLevel:          "B1",
			Formula:            "If + Past Simple, ... would + base verb",
			Explanation:        "Describes hypothetical, unreal, or improbable situations in the present or future.",
			NativeExplanation:  "Нереальное или маловероятное условие в настоящем/будущем (если бы... то...).",
			HighlightedSegment: "would",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "had",
				Prompt:          "If I ___ more time, I would read every evening.",
				SentenceBefore:  "If I ",
				SentenceAfter:   " more time, I would read every evening.",
				Hint:            "Past simple of 'have'",
				Options:         []string{"had", "have", "would have"},
				AcceptedAnswers: []string{"had"},
				Explanation:     "Second conditional requires past simple in the if-clause.",
			},
		}
	}

	if tag == "modal_perfect" || strings.Contains(lower, "should have") || strings.Contains(lower, "could have") || strings.Contains(lower, "must have") || strings.Contains(lower, "might have") || strings.Contains(lower, "would have") {
		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Modal Perfect",
			StructureTag:       "modal_perfect",
			CefrLevel:          "B2",
			Formula:            "Modal + have + past participle (V3)",
			Explanation:        "Modal + have + V3 is used to talk about past situations, including expectations, possibilities, deductions, regrets, and criticism.",
			NativeExplanation:  "Модальный глагол + перфектный инфинитив для выражения предположения, возможности, сожаления, критики или упрёка относительно прошлого действия.",
			HighlightedSegment: "should have",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "should have respected",
				Prompt:          "You were driving through a school zone yesterday. You ___ the speed limit.",
				SentenceBefore:  "You were driving through a school zone yesterday. You ",
				SentenceAfter:   " the speed limit.",
				Hint:            "Past obligation or advisable action that was expected: should + have + V3",
				Options:         []string{"should have respected", "must have respected", "should respect"},
				AcceptedAnswers: []string{"should have respected"},
				Explanation:     "Should have + V3 describes something that was expected or advisable in the past but did not happen or was not observed.",
			},
		}
	}

	if tag == "passive_voice" || strings.Contains(lower, " was ") || strings.Contains(lower, " were ") || strings.Contains(lower, " been ") || strings.Contains(lower, " is used to ") || strings.Contains(lower, " are used to ") || strings.Contains(lower, "'s used to ") || strings.Contains(lower, "'re used to ") {
		if strings.Contains(lower, "used to") {
			return &dto.AnalyzeGrammarResponse{
				RuleName:           "Passive Voice (Purpose / Instrument)",
				StructureTag:       "passive_voice",
				CefrLevel:          "B1",
				Formula:            "be + used to + base verb",
				Explanation:        "Expresses what an instrument, device, or material is utilized to accomplish (purpose in passive).",
				NativeExplanation:  "Пассивный залог назначения: для чего используется предмет или инструмент (be used to + глагол).",
				HighlightedSegment: "used to",
				Exercise: dto.PracticeExercise{
					ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
					Type:            "gap_fill",
					TargetWord:      "cut",
					Prompt:          "A pair of scissors is used to ___ paper and fabric.",
					SentenceBefore:  "A pair of scissors is used to ",
					SentenceAfter:   " paper and fabric.",
					Hint:            "base verb form",
					Options:         []string{"cut", "cutting", "cuts"},
					AcceptedAnswers: []string{"cut"},
					Explanation:     "When 'be used to' denotes purpose or tool function, it takes the base infinitive (verb).",
				},
			}
		}

		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Passive Voice",
			StructureTag:       "passive_voice",
			CefrLevel:          "B1",
			Formula:            "be + past participle (V3)",
			Explanation:        "Shifts narrative focus from the person performing the action to the recipient or outcome.",
			NativeExplanation:  "Пассивный (страдательный) залог — фокус на объекте действия, а не на исполнителе.",
			HighlightedSegment: "was",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "was built",
				Prompt:          "The ancient fortress ___ in the 14th century.",
				SentenceBefore:  "The ancient fortress ",
				SentenceAfter:   " in the 14th century.",
				Hint:            "be (past) + build (V3)",
				Options:         []string{"was built", "built", "has built"},
				AcceptedAnswers: []string{"was built"},
				Explanation:     "Past simple passive uses was/were + past participle.",
			},
		}
	}

	if tag == "be_used_to" || (strings.Contains(lower, "used to") && (strings.Contains(lower, "get used to") || strings.Contains(lower, "got used to") || strings.Contains(lower, "used to calling") || strings.Contains(lower, "used to living") || strings.Contains(lower, "used to working") || strings.Contains(lower, "used to waking"))) {
		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Be / Get used to (Accustomed)",
			StructureTag:       "be_used_to",
			CefrLevel:          "B2",
			Formula:            "be / get + used to + noun / V-ing",
			Explanation:        "Expresses becoming or being accustomed to something through habit, adaptation, or exposure.",
			NativeExplanation:  "Конструкция be / get used to: привыкнуть к чему-либо или быть привыкшим (требует герундий -ing или существительное).",
			HighlightedSegment: "used to",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "living",
				Prompt:          "She is slowly getting used to ___ in a noisy city.",
				SentenceBefore:  "She is slowly getting used to ",
				SentenceAfter:   " in a noisy city.",
				Hint:            "live (gerund -ing)",
				Options:         []string{"living", "live", "lived"},
				AcceptedAnswers: []string{"living"},
				Explanation:     "After 'get used to', we use a noun or the -ing form (gerund).",
			},
		}
	}

	if tag == "used_to" || strings.Contains(lower, "used to") {
		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Used to (Past Habit / State)",
			StructureTag:       "used_to",
			CefrLevel:          "B1",
			Formula:            "used to + base verb / didn't use to",
			Explanation:        "Refers to past habits, routines, or states that are no longer true in the present.",
			NativeExplanation:  "Конструкция used to: привычки или состояния в прошлом, которых больше нет.",
			HighlightedSegment: "used to",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "play",
				Prompt:          "He used to ___ guitar in high school, but he gave it up.",
				SentenceBefore:  "He used to ",
				SentenceAfter:   " guitar in high school, but he gave it up.",
				Hint:            "base verb form",
				Options:         []string{"play", "playing", "played"},
				AcceptedAnswers: []string{"play"},
				Explanation:     "'Used to' expressing past habit takes the bare infinitive (base verb).",
			},
		}
	}

	if tag == "present_perfect_continuous" || (strings.Contains(lower, "been ") && (strings.Contains(lower, "have been ") || strings.Contains(lower, "has been ") || strings.Contains(lower, "'ve been ") || strings.Contains(lower, "'s been "))) {
		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Present Perfect Continuous",
			StructureTag:       "present_perfect_continuous",
			CefrLevel:          "B1",
			Formula:            "have / has + been + V-ing",
			Explanation:        "Emphasizes the duration or continuity of an activity leading up to the present moment.",
			NativeExplanation:  "Длительное действие, начавшееся в прошлом и продолжающееся в настоящий момент или только что завершившееся.",
			HighlightedSegment: "been",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "working",
				Prompt:          "She has been ___ on this video all morning.",
				SentenceBefore:  "She has been ",
				SentenceAfter:   " on this video all morning.",
				Hint:            "work (gerund -ing)",
				Options:         []string{"working", "worked", "works"},
				AcceptedAnswers: []string{"working"},
				Explanation:     "Present perfect continuous pairs have/has been with the -ing verb form.",
			},
		}
	}

	if tag == "be_supposed_to" || strings.Contains(lower, "supposed to") {
		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Be supposed to (Expectation / Obligation)",
			StructureTag:       "be_supposed_to",
			CefrLevel:          "B2",
			Formula:            "be + supposed to + base verb",
			Explanation:        "Expresses what is intended, expected, or required by rule, custom, or schedule.",
			NativeExplanation:  "Конструкция be supposed to: предполагается, должен по правилам или договоренности.",
			HighlightedSegment: "supposed to",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "wear",
				Prompt:          "You are supposed to ___ safety equipment here.",
				SentenceBefore:  "You are supposed to ",
				SentenceAfter:   " safety equipment here.",
				Hint:            "base verb form",
				Options:         []string{"wear", "wearing", "wore"},
				AcceptedAnswers: []string{"wear"},
				Explanation:     "'Be supposed to' takes the bare infinitive (base verb).",
			},
		}
	}

	if tag == "modal_deduction" || (strings.Contains(lower, "must be") || strings.Contains(lower, "can't be")) {
		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Modal Deduction (Certainty / Impossibility)",
			StructureTag:       "modal_deduction",
			CefrLevel:          "B1",
			Formula:            "must / can't + be + Adj/Noun",
			Explanation:        "Draws a logical conclusion about a present situation based on clear evidence or context.",
			NativeExplanation:  "Модальная дедукция: логический вывод о настоящем (должно быть, не может быть).",
			HighlightedSegment: "be",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "must be",
				Prompt:          "After traveling for 20 hours, they ___ exhausted.",
				SentenceBefore:  "After traveling for 20 hours, they ",
				SentenceAfter:   " exhausted.",
				Hint:            "logical certainty (must + be)",
				Options:         []string{"must be", "can be", "should being"},
				AcceptedAnswers: []string{"must be"},
				Explanation:     "'Must be' expresses strong logical deduction of certainty.",
			},
		}
	}

	if tag == "concession" || strings.Contains(lower, "even though") || strings.Contains(lower, "although") {
		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Concession & Contrast",
			StructureTag:       "concession",
			CefrLevel:          "B2",
			Formula:            "Even though / Although + Clause, Main Clause",
			Explanation:        "Connects two facts where one circumstance makes the main clause unexpected or surprising.",
			NativeExplanation:  "Придаточное уступки: связывает факты вопреки трудностям или неожиданным обстоятельствам.",
			HighlightedSegment: "even though",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "Even though",
				Prompt:          "___ it was raining heavily, they enjoyed the walk.",
				SentenceBefore:  "",
				SentenceAfter:   " it was raining heavily, they enjoyed the walk.",
				Hint:            "Concession conjunction (2 words)",
				Options:         []string{"Even though", "Despite", "Because"},
				AcceptedAnswers: []string{"Even though"},
				Explanation:     "'Even though' connects two full clauses with contrasting circumstances.",
			},
		}
	}

	if tag == "indirect_question" || strings.Contains(lower, "i wonder") || strings.Contains(lower, "do you know") {
		return &dto.AnalyzeGrammarResponse{
			RuleName:           "Indirect / Embedded Question",
			StructureTag:       "indirect_question",
			CefrLevel:          "B1",
			Formula:            "Introductory phrase + wh-word / if + Subject + Verb",
			Explanation:        "Polite, natural phrasing embedding a question inside a statement with normal word order.",
			NativeExplanation:  "Косвенный вопрос: вежливая формулировка с прямым порядком слов.",
			HighlightedSegment: "wonder",
			Exercise: dto.PracticeExercise{
				ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
				Type:            "gap_fill",
				TargetWord:      "it starts",
				Prompt:          "Do you know what time ___?",
				SentenceBefore:  "Do you know what time ",
				SentenceAfter:   "?",
				Hint:            "affirmative order (subject + verb)",
				Options:         []string{"it starts", "does it start", "starts it"},
				AcceptedAnswers: []string{"it starts"},
				Explanation:     "Indirect questions use affirmative word order without inversion or dummy auxiliaries.",
			},
		}
	}

	return &dto.AnalyzeGrammarResponse{
		RuleName:           "Grammar in Context",
		StructureTag:       "general_grammar",
		CefrLevel:          "B1",
		Formula:            "Subject + Verb Phrase + Object/Complement",
		Explanation:        "Authentic sentence structure captured from natural dialogue.",
		NativeExplanation:  "Грамматическая конструкция в контексте живой речи.",
		HighlightedSegment: sentence,
		Exercise: dto.PracticeExercise{
			ID:              fmt.Sprintf("quiz-%d", time.Now().UnixNano()),
			Type:            "gap_fill",
			TargetWord:      "complete",
			Prompt:          "Review this authentic sentence carefully: \"" + sentence + "\"",
			SentenceBefore:  "Review: \"",
			SentenceAfter:   "\"",
			Hint:            "Pay attention to verb tenses and clause connectors",
			Options:         []string{"complete", "practice", "analyze"},
			AcceptedAnswers: []string{"complete"},
			Explanation:     "Recognizing natural collocations and clause balance is key to fluency.",
		},
	}
}
