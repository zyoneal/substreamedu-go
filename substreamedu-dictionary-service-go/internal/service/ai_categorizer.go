package service

import (
	"strings"

	"github.com/substreamedu/substreamedu-dictionary-service/internal/dto"
)

var CategoryTaxonomy = map[int]string{
	1:  "Emotions & Traits",
	2:  "Work & Business",
	3:  "Tech & Science",
	4:  "Daily Life & Home",
	5:  "Food & Dining",
	6:  "Travel & Places",
	7:  "Social & Communication",
	8:  "Art, Media & Entertainment",
	9:  "Nature & Environment",
	10: "Health & Fitness",
	11: "Slang, Idioms & Phrasal Verbs",
	12: "Abstract & Philosophy",
}

func (s *AIService) CategorizePhrasesHeuristic(items []dto.PhraseItem) map[int64]string {
	result := make(map[int64]string, len(items))
	phrasalParticles := map[string]bool{
		"in": true, "out": true, "up": true, "down": true, "off": true, "on": true,
		"away": true, "back": true, "over": true, "into": true, "through": true, "around": true,
	}

	knownIdioms := map[string]bool{
		"spill the tea": true, "spill the beans": true, "piece of cake": true,
		"break a leg": true, "bite the bullet": true, "cut corners": true, "hit the jackpot": true,
		"call it a day": true, "no cap": true, "low key": true, "high key": true,
		"once in a blue moon": true, "food for thought": true,
	}

	for _, item := range items {
		clean := strings.ToLower(strings.TrimSpace(item.Text))
		words := strings.Fields(clean)

		// 1. Known idioms
		if knownIdioms[clean] {
			result[item.ID] = CategoryTaxonomy[11] // Slang, Idioms & Phrasal Verbs
			continue
		}

		// 2. Phrasal verb check
		if len(words) >= 2 {
			hasParticle := false
			for _, w := range words[1:] {
				if phrasalParticles[w] {
					hasParticle = true
					break
				}
			}
			if hasParticle {
				result[item.ID] = CategoryTaxonomy[11] // Slang, Idioms & Phrasal Verbs
				continue
			}
		}

		// 3. Keyword token/prefix checks
		category := CategoryTaxonomy[12] // Default: Abstract & Philosophy
		switch {
		case matchesAnyWord(words, "work", "job", "money", "cost", "pay", "contract", "invest", "office", "market", "trade", "salary", "client", "boss", "manager", "meeting", "deal", "profit", "tax", "career", "company", "firm", "finance", "business", "revenue", "venture", "capital"):
			category = CategoryTaxonomy[2]
		case matchesAnyWord(words, "tech", "computer", "comput", "code", "software", "digital", "data", "ai", "algorithm", "network", "cyber", "web", "app", "device", "robot", "science", "physics", "chemistry", "lab", "experiment", "system", "program", "quantum"):
			category = CategoryTaxonomy[3]
		case matchesAnyWord(words, "happy", "sad", "angry", "fear", "anxious", "love", "hate", "proud", "shame", "guilt", "envy", "brave", "calm", "nervous", "excited", "mood", "feeling", "emotion", "trait", "honest", "cruel", "kind", "gentle", "stubborn", "jealous", "resilient", "hesitant", "scared"):
			category = CategoryTaxonomy[1]
		case matchesAnyWord(words, "eat", "drink", "food", "cook", "restaurant", "meal", "dinner", "lunch", "breakfast", "bread", "meat", "vegetable", "fruit", "cake", "coffee", "tea", "beer", "wine", "taste", "delicious", "hungry", "bake", "snack", "pasta"):
			category = CategoryTaxonomy[5]
		case matchesAnyWord(words, "travel", "trip", "flight", "plane", "train", "car", "drive", "hotel", "tourist", "city", "country", "ticket", "visit", "arrive", "depart", "journey", "map", "destination", "passport", "vacation", "road", "street"):
			category = CategoryTaxonomy[6]
		case matchesAnyWord(words, "friend", "talk", "chat", "speak", "tell", "ask", "answer", "family", "relationship", "social", "party", "people", "community", "crowd", "group", "discuss", "agree", "argue", "debate", "neighbor", "greet", "conversation"):
			category = CategoryTaxonomy[7]
		case matchesAnyWord(words, "movie", "film", "music", "song", "dance", "theatre", "art", "paint", "draw", "actor", "concert", "game", "play", "show", "stage", "photo", "canvas", "story", "book", "read", "poem", "cinema", "guitar"):
			category = CategoryTaxonomy[8]
		case matchesAnyWord(words, "tree", "plant", "flower", "animal", "dog", "cat", "bird", "fish", "nature", "forest", "sea", "ocean", "river", "mountain", "sky", "sun", "rain", "snow", "wind", "weather", "earth", "climate", "wild"):
			category = CategoryTaxonomy[9]
		case matchesAnyWord(words, "health", "doctor", "hospital", "medicine", "medic", "pill", "disease", "pain", "sick", "ill", "exercise", "fit", "gym", "sport", "muscle", "run", "walk", "sleep", "body", "diet", "injury", "blood", "headache", "cardio"):
			category = CategoryTaxonomy[10]
		case matchesAnyWord(words, "home", "house", "room", "bed", "door", "window", "clean", "wash", "buy", "shop", "wear", "clothes", "routine", "clock", "morning", "night", "daily", "errand", "chore", "table", "chair", "kitchen"):
			category = CategoryTaxonomy[4]
		case len(words) >= 3:
			category = CategoryTaxonomy[11] // Idioms / multi-word expressions
		}

		result[item.ID] = category
	}

	return result
}

func matchesAnyWord(words []string, prefixes ...string) bool {
	for _, w := range words {
		for _, p := range prefixes {
			if w == p {
				return true
			}
			if len(p) >= 4 && strings.HasPrefix(w, p) {
				return true
			}
		}
	}
	return false
}
