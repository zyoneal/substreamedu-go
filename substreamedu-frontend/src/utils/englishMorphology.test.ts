import {
    matchesEnglishWord,
    findWordMatch,
    findPhraseMatch,
} from './englishMorphology';

describe('englishMorphology', () => {
    describe('matchesEnglishWord — CVC consonant doubling', () => {
        it.each([
            ['stemmed', 'stem'],
            ['stemming', 'stem'],
            ['stemmer', 'stem'],
            ['stems', 'stem'],
            ['stopped', 'stop'],
            ['stopping', 'stop'],
            ['planned', 'plan'],
            ['planning', 'plan'],
            ['planner', 'plan'],
            ['running', 'run'],
            ['runner', 'run'],
            ['runners', 'run'],
            ['sitting', 'sit'],
            ['swimming', 'swim'],
            ['bigger', 'big'],
            ['biggest', 'big'],
            ['hotter', 'hot'],
            ['hottest', 'hot'],
            ['sadder', 'sad'],
            ['saddest', 'sad'],
            ['thinner', 'thin'],
            ['foggy', 'fog'],
            ['foggier', 'fog'],
            ['funny', 'fun'],
            ['funnier', 'fun'],
            ['sunny', 'sun'],
            ['muddy', 'mud'],
            ['chatted', 'chat'],
            ['chatting', 'chat'],
            ['chatty', 'chat'],
            ['blurred', 'blur'],
            ['blurring', 'blur'],
            ['blurry', 'blur'],
            ['rotten', 'rot'],
            ['occurred', 'occur'],
            ['occurring', 'occur'],
            ['occurrence', 'occur'],
            ['preferred', 'prefer'],
            ['referred', 'refer'],
            ['admitted', 'admit'],
            ['permitted', 'permit'],
            ['regretted', 'regret'],
            ['beginning', 'begin'],
            ['forgetting', 'forget'],
            ['travelled', 'travel'],
            ['traveled', 'travel'],
            ['cancelled', 'cancel'],
            ['canceled', 'cancel'],
            ['programmed', 'program'],
            ['kidnapped', 'kidnap'],
            ['equipped', 'equip'],
            ['equipping', 'equip'],
            ['quizzed', 'quiz'],
            ['quizzes', 'quiz'],
            ['gasses', 'gas'],
        ])('matches %s for saved base %s', (candidate, saved) => {
            expect(matchesEnglishWord(candidate, saved)).toBe(true);
        });
    });

    describe('matchesEnglishWord — -ic to -ick spelling change', () => {
        it.each([
            ['panicked', 'panic'],
            ['panicking', 'panic'],
            ['panicky', 'panic'],
            ['mimicked', 'mimic'],
            ['mimicking', 'mimic'],
            ['picnicked', 'picnic'],
            ['picnicking', 'picnic'],
            ['trafficked', 'traffic'],
            ['trafficking', 'traffic'],
            ['trafficker', 'traffic'],
        ])('matches %s for saved base %s', (candidate, saved) => {
            expect(matchesEnglishWord(candidate, saved)).toBe(true);
        });
    });

    describe('matchesEnglishWord — silent -e drop, -ie to -ying, -le to -ly', () => {
        it.each([
            ['making', 'make'],
            ['maker', 'make'],
            ['loving', 'love'],
            ['loved', 'love'],
            ['lovable', 'love'],
            ['creating', 'create'],
            ['created', 'create'],
            ['creation', 'create'],
            ['creative', 'create'],
            ['creator', 'create'],
            ['using', 'use'],
            ['used', 'use'],
            ['usable', 'use'],
            ['usage', 'use'],
            ['hoping', 'hope'],
            ['hoped', 'hope'],
            ['smoking', 'smoke'],
            ['smoky', 'smoke'],
            ['noisy', 'noise'],
            ['noisier', 'noise'],
            ['larger', 'large'],
            ['largest', 'large'],
            ['simply', 'simple'],
            ['gently', 'gentle'],
            ['terribly', 'terrible'],
            ['possibly', 'possible'],
            ['truly', 'true'],
            ['arguing', 'argue'],
            ['argument', 'argue'],
            ['arguments', 'argue'],
            ['wholly', 'whole'],
            ['dying', 'die'],
            ['lying', 'lie'],
            ['tying', 'tie'],
            ['vying', 'vie'],
            ['underlying', 'underlie'],
            ['agreeing', 'agree'],
            ['agreed', 'agree'],
            ['seeing', 'see'],
        ])('matches %s for saved base %s', (candidate, saved) => {
            expect(matchesEnglishWord(candidate, saved)).toBe(true);
        });
    });

    describe('matchesEnglishWord — consonant + y -> i', () => {
        it.each([
            ['studies', 'study'],
            ['studied', 'study'],
            ['studying', 'study'],
            ['carries', 'carry'],
            ['carried', 'carry'],
            ['carrier', 'carry'],
            ['tries', 'try'],
            ['tried', 'try'],
            ['cities', 'city'],
            ['stories', 'story'],
            ['happier', 'happy'],
            ['happiest', 'happy'],
            ['happily', 'happy'],
            ['happiness', 'happy'],
            ['easier', 'easy'],
            ['easily', 'easy'],
            ['relies', 'rely'],
            ['relied', 'rely'],
            ['reliable', 'rely'],
            ['beautiful', 'beauty'],
            ['mysterious', 'mystery'],
            ['denied', 'deny'],
            ['denial', 'deny'],
            ['buried', 'bury'],
            ['burial', 'bury'],
            ['played', 'play'],
            ['playing', 'play'],
            ['paid', 'pay'],
            ['said', 'say'],
            ['laid', 'lay'],
        ])('matches %s for saved base %s', (candidate, saved) => {
            expect(matchesEnglishWord(candidate, saved)).toBe(true);
        });
    });

    describe('matchesEnglishWord — -f / -fe -> -ves plurals', () => {
        it.each([
            ['wolves', 'wolf'],
            ['knives', 'knife'],
            ['lives', 'life'],
            ['wives', 'wife'],
            ['leaves', 'leaf'],
            ['thieves', 'thief'],
            ['shelves', 'shelf'],
            ['halves', 'half'],
            ['loaves', 'loaf'],
            ['selves', 'self'],
        ])('matches %s for saved base %s', (candidate, saved) => {
            expect(matchesEnglishWord(candidate, saved)).toBe(true);
        });
    });

    describe('matchesEnglishWord — irregular verbs, plurals, comparatives', () => {
        it.each([
            ['went', 'go'],
            ['gone', 'go'],
            ['goes', 'go'],
            ['took', 'take'],
            ['taken', 'take'],
            ['began', 'begin'],
            ['begun', 'begin'],
            ['brought', 'bring'],
            ['bought', 'buy'],
            ['caught', 'catch'],
            ['taught', 'teach'],
            ['thought', 'think'],
            ['broke', 'break'],
            ['broken', 'break'],
            ['spoke', 'speak'],
            ['spoken', 'speak'],
            ['wrote', 'write'],
            ['written', 'write'],
            ['ran', 'run'],
            ['swam', 'swim'],
            ['swum', 'swim'],
            ['understood', 'understand'],
            ['withdrew', 'withdraw'],
            ['children', 'child'],
            ['men', 'man'],
            ['women', 'woman'],
            ['feet', 'foot'],
            ['teeth', 'tooth'],
            ['mice', 'mouse'],
            ['people', 'person'],
            ['crises', 'crisis'],
            ['analyses', 'analysis'],
            ['phenomena', 'phenomenon'],
            ['criteria', 'criterion'],
            ['indices', 'index'],
            ['better', 'good'],
            ['best', 'good'],
            ['worse', 'bad'],
            ['worst', 'bad'],
            ['further', 'far'],
        ])('matches %s for saved base %s', (candidate, saved) => {
            expect(matchesEnglishWord(candidate, saved)).toBe(true);
        });
    });

    describe('matchesEnglishWord — possessives & reverse inflectional matching', () => {
        it('handles straight and curly possessives', () => {
            expect(matchesEnglishWord("stem's", 'stem')).toBe(true);
            expect(matchesEnglishWord('stem\u2019s', 'stem')).toBe(true);
            expect(matchesEnglishWord("children's", 'child')).toBe(true);
        });

        it('matches base form when user saved an inflected form', () => {
            expect(matchesEnglishWord('stem', 'stemmed')).toBe(true);
            expect(matchesEnglishWord('study', 'studies')).toBe(true);
            expect(matchesEnglishWord('run', 'running')).toBe(true);
            expect(matchesEnglishWord('make', 'making')).toBe(true);
            expect(matchesEnglishWord('go', 'went')).toBe(true);
            expect(matchesEnglishWord('gone', 'went')).toBe(true);
        });

        it('does NOT over-match reverse derivational forms', () => {
            expect(matchesEnglishWord('art', 'artist')).toBe(false);
            expect(matchesEnglishWord('help', 'helpful')).toBe(false);
            expect(matchesEnglishWord('beauty', 'beautiful')).toBe(false);
        });
    });

    describe('matchesEnglishWord — strict false-positive guards', () => {
        it.each([
            ['system', 'stem'],
            ['steam', 'stem'],
            ['stamina', 'stem'],
            ['card', 'car'],
            ['care', 'car'],
            ['cart', 'car'],
            ['carpet', 'car'],
            ['scar', 'car'],
            ['hope', 'hop'],
            ['hoped', 'hop'],
            ['hoping', 'hop'],
            ['tape', 'tap'],
            ['taped', 'tap'],
            ['taping', 'tap'],
            ['planet', 'plan'],
            ['plant', 'plan'],
            ['plane', 'plan'],
            ['many', 'man'],
            ['manage', 'man'],
            ['manner', 'man'],
            ['letter', 'let'],
            ['matter', 'mat'],
            ['dinner', 'din'],
            ['stared', 'star'],
            ['scared', 'scar'],
            ['hated', 'hat'],
            ['wind', 'win'],
            ['wine', 'win'],
            ['wing', 'win'],
            ['band', 'ban'],
            ['bank', 'ban'],
            ['metal', 'met'],
            ['fatal', 'fat'],
            ['panic', 'pan'],
            ['army', 'arm'],
            ['inner', 'in'],
            ['into', 'in'],
            ['only', 'on'],
        ])('rejects false positive %s for saved %s', (candidate, saved) => {
            expect(matchesEnglishWord(candidate, saved)).toBe(false);
        });
    });

    describe('findWordMatch & findPhraseMatch', () => {
        it('highlights the full inflected word stemmed for saved stem', () => {
            const text = 'This issue stemmed from early exposure.';
            const match = findWordMatch(text, 'stem', 0);
            expect(match.found).toBe(true);
            expect(match.isValid).toBe(true);
            expect(text.slice(match.start, match.end)).toBe('stemmed');
        });

        it('trims possessive apostrophe-s from highlight span', () => {
            const text = "The stem's fibers are strong.";
            const match = findWordMatch(text, 'stem', 0);
            expect(match.found).toBe(true);
            expect(text.slice(match.start, match.end)).toBe('stem');
        });

        it('matches inflected phrasal verbs and plural noun phrases', () => {
            const text1 = 'It all stemmed from early exposure.';
            const m1 = findPhraseMatch(text1, 'stem from', 0);
            expect(m1.found).toBe(true);
            expect(m1.isValid).toBe(true);
            expect(text1.slice(m1.start, m1.end)).toBe('stemmed from');

            const text2 = 'She never gave up on her dream.';
            const m2 = findPhraseMatch(text2, 'give up', 0);
            expect(m2.found).toBe(true);
            expect(text2.slice(m2.start, m2.end)).toBe('gave up');

            const text3 = 'Watch out for side effects.';
            const m3 = findPhraseMatch(text3, 'side effect', 0);
            expect(m3.found).toBe(true);
            expect(text3.slice(m3.start, m3.end)).toBe('side effects');
        });

        it('does not match phrases across sentence punctuation', () => {
            const text = 'Never give, up is not an option.';
            const match = findPhraseMatch(text, 'give up', 0);
            expect(match.found).toBe(false);
        });
    });
});
