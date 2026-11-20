/**
 * English morphological word and phrase matcher for subtitle and text highlighting.
 *
 * Covers:
 * - Exact matches and possessives ('s / ’s)
 * - Regular inflectional and derivational suffixes
 * - CVC consonant doubling (stem -> stemmed, stop -> stopping, equip -> equipped, travel -> travelled, quiz -> quizzes)
 * - -ic -> -ick spelling change (panic -> panicked, mimic -> mimicking)
 * - Silent -e drop (make -> making, love -> lovable), -ie -> -ying (die -> dying), -le -> -ly (simple -> simply), -ue -> -uly/-ument
 * - Consonant + y -> i (study -> studies/studied, happy -> happier/happily/happiness)
 * - -f / -fe -> -ves plurals (wolf -> wolves, knife -> knives)
 * - Irregular verbs, irregular plurals (including Latin/Greek), and irregular comparatives/superlatives
 * - Reverse inflectional matching when a saved dictionary term is itself inflected (stemmed -> stem)
 * - Inflected phrasal verbs and noun phrases (stem from -> stemmed from, give up -> gave up, side effect -> side effects)
 */

export interface MatchResult {
    found: boolean;
    isValid?: boolean;
    start?: number;
    end?: number;
    nextSearchIndex: number;
}

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const NON_DOUBLING_FINAL = new Set(['a', 'e', 'i', 'o', 'u', 'w', 'x', 'y', 'h']);
const ASCII_WORD_RE = /^[a-z]+$/;

const REGULAR_CONSONANT_INITIAL_INFLECTIONS = new Set(['s', 'es']);
const REGULAR_VOWEL_INITIAL_INFLECTIONS = new Set(['ed', 'ing', 'ings', 'er', 'ers', 'est']);

// Classic English false-cognate pairs where CVC doubling + "er" forms an unrelated word
const FALSE_COGNATE_PAIRS = new Set([
    'man:manner', 'ban:banner', 'let:letter', 'mat:matter', 'din:dinner',
    'but:butter', 'sum:summer', 'ham:hammer', 'cop:copper', 'pep:pepper',
    'sup:supper', 'bit:bitter', 'bet:better', 'lad:ladder', 'gut:gutter',
    'lit:litter',
]);

// Suffixes valid ONLY when the base ends in 'e' (prevents car -> card, win -> wind, ban -> band)
const SILENT_E_DIRECT_SUFFIXES = new Set([
    'd', 'r', 'rs', 'st',
]);

// Derivational suffixes safe for bases of length >= 3
const DERIVATIONAL_SUFFIXES_MIN3 = new Set([
    'ly', 'ness', 'ment', 'ments', 'ful', 'fully', 'less', 'lessly',
    'ship', 'hood', 'dom', 'ish', 'ist', 'ists',
    'able', 'ably', 'ability', 'ible', 'ibly', 'ibility',
    'ize', 'ized', 'izing', 'izer', 'izers', 'ization',
    'ise', 'ised', 'ising', 'iser', 'isers', 'isation',
    'ward', 'wards', 'wise',
    'ion', 'ions', 'tion', 'tions', 'sion', 'sions', 'ation', 'ations',
    'ive', 'ively', 'iveness', 'or', 'ors',
    'ingly', 'edly',
]);

// Short/ambiguous derivational suffixes restricted to bases of length >= 4
// (prevents met -> metal, fat -> fatal, pan -> panic, man -> many, arm -> army)
const DERIVATIONAL_SUFFIXES_MIN4 = new Set([
    'al', 'ally', 'ic', 'ical', 'ically', 'en', 'y', 'ous', 'ously', 'ousness',
    'ity', 'ify', 'ified', 'ifying', 'ance', 'ence', 'ant', 'ent', 'ary', 'ory', 'age', 'ty',
]);

// Vowel-initial suffixes that trigger CVC consonant doubling (stem -> stemmed, fog -> foggy, quiz -> quizzes)
const DOUBLING_INFLECTIONAL_SUFFIXES = new Set([
    'ed', 'ing', 'ings', 'er', 'ers', 'est', 'en', 'es',
]);

const DOUBLING_DERIVATIONAL_SUFFIXES = new Set([
    'y', 'ier', 'iest', 'ily', 'iness',
    'able', 'ible', 'ance', 'ence', 'ery', 'ish', 'ist', 'ize', 'ise',
]);

// Suffixes valid after -ic -> -ick (panic -> panicked, panicking, panicky)
const ICK_INFLECTIONAL_SUFFIXES = new Set(['ed', 'ing', 'er', 'ers']);
const ICK_DERIVATIONAL_SUFFIXES = new Set(['y']);

// Vowel-initial suffixes after dropping silent -e (make -> making, create -> creation, noise -> noisy)
const DROP_E_INFLECTIONAL_SUFFIXES = new Set([
    'ing', 'ings', 'ed', 'er', 'ers', 'est',
]);

const DROP_E_DERIVATIONAL_SUFFIXES = new Set([
    'able', 'ably', 'ability', 'ible', 'ibly', 'ibility',
    'ion', 'ions', 'tion', 'tions', 'ation', 'ations', 'ition', 'itions',
    'ive', 'ively', 'iveness', 'ative',
    'or', 'ors', 'ist', 'ists', 'ism',
    'ize', 'ized', 'izing', 'izer', 'ization',
    'ise', 'ised', 'ising', 'iser', 'isation',
    'al', 'ally', 'ic', 'ical', 'ically',
    'ous', 'ously', 'ious', 'iously',
    'y', 'ier', 'iest', 'ily', 'iness',
    'ance', 'ence', 'ant', 'ent', 'ancy', 'ency',
    'age', 'ary', 'ory', 'ity', 'ify', 'ified', 'ifying', 'ure',
    'ingly', 'edly',
]);

// Suffixes after consonant + y -> i (study -> studies/studied, happy -> happier/happily/happiness)
const Y_TO_I_INFLECTIONAL_SUFFIXES = new Set([
    'es', 'ed', 'er', 'ers', 'est',
]);

const Y_TO_I_DERIVATIONAL_SUFFIXES = new Set([
    'ly', 'ness', 'ful', 'fully', 'less', 'lessly',
    'able', 'ably', 'ible', 'ance', 'ant', 'ation', 'ations',
    'ous', 'ously', 'al', 'ally',
    'fy', 'fies', 'fied', 'fying', 'fication',
    'hood', 'ment', 'ments',
]);

/**
 * Irregular paradigms: [baseForm, ...inflectedForms].
 * Each base maps to all its irregular forms, and each irregular form maps back to its base(s).
 */
const IRREGULAR_PARADIGMS: ReadonlyArray<readonly string[]> = [
    // Core irregular verbs
    ['be', 'am', 'is', 'are', 'was', 'were', 'been', 'being'],
    ['have', 'has', 'had', 'having'],
    ['do', 'does', 'did', 'done', 'doing'],
    ['go', 'goes', 'went', 'gone', 'going'],
    ['say', 'says', 'said', 'saying'],
    ['make', 'makes', 'made', 'making'],
    ['take', 'takes', 'took', 'taken', 'taking'],
    ['come', 'comes', 'came', 'coming'],
    ['see', 'sees', 'saw', 'seen', 'seeing'],
    ['know', 'knows', 'knew', 'known', 'knowing'],
    ['get', 'gets', 'got', 'gotten', 'getting'],
    ['give', 'gives', 'gave', 'given', 'giving'],
    ['find', 'finds', 'found', 'finding'],
    ['think', 'thinks', 'thought', 'thinking'],
    ['tell', 'tells', 'told', 'telling'],
    ['become', 'becomes', 'became', 'becoming'],
    ['show', 'shows', 'showed', 'shown', 'showing'],
    ['leave', 'leaves', 'left', 'leaving'],
    ['feel', 'feels', 'felt', 'feeling'],
    ['bring', 'brings', 'brought', 'bringing'],
    ['begin', 'begins', 'began', 'begun', 'beginning'],
    ['keep', 'keeps', 'kept', 'keeping'],
    ['hold', 'holds', 'held', 'holding'],
    ['write', 'writes', 'wrote', 'written', 'writing'],
    ['stand', 'stands', 'stood', 'standing'],
    ['hear', 'hears', 'heard', 'hearing'],
    ['mean', 'means', 'meant', 'meaning'],
    ['meet', 'meets', 'met', 'meeting'],
    ['run', 'runs', 'ran', 'running'],
    ['pay', 'pays', 'paid', 'paying'],
    ['sit', 'sits', 'sat', 'sitting'],
    ['speak', 'speaks', 'spoke', 'spoken', 'speaking'],
    ['lie', 'lies', 'lay', 'lain', 'lying', 'lied'],
    ['lay', 'lays', 'laid', 'laying'],
    ['lead', 'leads', 'led', 'leading'],
    ['grow', 'grows', 'grew', 'grown', 'growing'],
    ['lose', 'loses', 'lost', 'losing'],
    ['fall', 'falls', 'fell', 'fallen', 'falling'],
    ['send', 'sends', 'sent', 'sending'],
    ['build', 'builds', 'built', 'building'],
    ['understand', 'understands', 'understood', 'understanding'],
    ['draw', 'draws', 'drew', 'drawn', 'drawing'],
    ['break', 'breaks', 'broke', 'broken', 'breaking'],
    ['spend', 'spends', 'spent', 'spending'],
    ['rise', 'rises', 'rose', 'risen', 'rising'],
    ['drive', 'drives', 'drove', 'driven', 'driving'],
    ['buy', 'buys', 'bought', 'buying'],
    ['wear', 'wears', 'wore', 'worn', 'wearing'],
    ['choose', 'chooses', 'chose', 'chosen', 'choosing'],
    ['seek', 'seeks', 'sought', 'seeking'],
    ['throw', 'throws', 'threw', 'thrown', 'throwing'],
    ['catch', 'catches', 'caught', 'catching'],
    ['deal', 'deals', 'dealt', 'dealing'],
    ['win', 'wins', 'won', 'winning'],
    ['forget', 'forgets', 'forgot', 'forgotten', 'forgetting'],
    ['sell', 'sells', 'sold', 'selling'],
    ['fight', 'fights', 'fought', 'fighting'],
    ['bear', 'bears', 'bore', 'borne', 'born', 'bearing'],
    ['teach', 'teaches', 'taught', 'teaching'],
    ['eat', 'eats', 'ate', 'eaten', 'eating'],
    ['sing', 'sings', 'sang', 'sung', 'singing'],
    ['strike', 'strikes', 'struck', 'stricken', 'striking'],
    ['hang', 'hangs', 'hung', 'hanging'],
    ['shake', 'shakes', 'shook', 'shaken', 'shaking'],
    ['ride', 'rides', 'rode', 'ridden', 'riding'],
    ['feed', 'feeds', 'fed', 'feeding'],
    ['shoot', 'shoots', 'shot', 'shooting'],
    ['drink', 'drinks', 'drank', 'drunk', 'drunken', 'drinking'],
    ['fly', 'flies', 'flew', 'flown', 'flying'],
    ['sleep', 'sleeps', 'slept', 'sleeping'],
    ['stick', 'sticks', 'stuck', 'sticking'],
    ['hide', 'hides', 'hid', 'hidden', 'hiding'],
    ['swim', 'swims', 'swam', 'swum', 'swimming'],
    ['steal', 'steals', 'stole', 'stolen', 'stealing'],
    ['blow', 'blows', 'blew', 'blown', 'blowing'],
    ['wake', 'wakes', 'woke', 'woken', 'waking'],
    ['bite', 'bites', 'bit', 'bitten', 'biting'],
    ['freeze', 'freezes', 'froze', 'frozen', 'freezing'],
    ['sink', 'sinks', 'sank', 'sunk', 'sunken', 'sinking'],
    ['ring', 'rings', 'rang', 'rung', 'ringing'],
    ['tear', 'tears', 'tore', 'torn', 'tearing'],
    ['swear', 'swears', 'swore', 'sworn', 'swearing'],
    ['dig', 'digs', 'dug', 'digging'],
    ['bend', 'bends', 'bent', 'bending'],
    ['lend', 'lends', 'lent', 'lending'],
    ['sweep', 'sweeps', 'swept', 'sweeping'],
    ['weep', 'weeps', 'wept', 'weeping'],
    ['creep', 'creeps', 'crept', 'creeping'],
    ['bleed', 'bleeds', 'bled', 'bleeding'],
    ['breed', 'breeds', 'bred', 'breeding'],
    ['flee', 'flees', 'fled', 'fleeing'],
    ['slide', 'slides', 'slid', 'sliding'],
    ['shine', 'shines', 'shone', 'shining'],
    ['light', 'lights', 'lit', 'lighting'],
    ['swing', 'swings', 'swung', 'swinging'],
    ['cling', 'clings', 'clung', 'clinging'],
    ['fling', 'flings', 'flung', 'flinging'],
    ['sting', 'stings', 'stung', 'stinging'],
    ['string', 'strings', 'strung', 'stringing'],
    ['wring', 'wrings', 'wrung', 'wringing'],
    ['sling', 'slings', 'slung', 'slinging'],
    ['spin', 'spins', 'spun', 'spinning'],
    ['shrink', 'shrinks', 'shrank', 'shrunk', 'shrunken', 'shrinking'],
    ['spring', 'springs', 'sprang', 'sprung', 'springing'],
    ['stink', 'stinks', 'stank', 'stunk', 'stinking'],
    ['bind', 'binds', 'bound', 'binding'],
    ['grind', 'grinds', 'ground', 'grinding'],
    ['wind', 'winds', 'wound', 'winding'],
    ['weave', 'weaves', 'wove', 'woven', 'weaving'],
    ['forgive', 'forgives', 'forgave', 'forgiven', 'forgiving'],
    ['forbid', 'forbids', 'forbade', 'forbidden', 'forbidding'],
    ['arise', 'arises', 'arose', 'arisen', 'arising'],
    ['awake', 'awakes', 'awoke', 'awoken', 'awaking'],
    ['kneel', 'kneels', 'knelt', 'kneeling'],
    ['dream', 'dreams', 'dreamt', 'dreaming'],
    ['lean', 'leans', 'leant', 'leaning'],
    ['leap', 'leaps', 'leapt', 'leaping'],
    ['burn', 'burns', 'burnt', 'burning'],
    ['learn', 'learns', 'learnt', 'learning'],
    ['smell', 'smells', 'smelt', 'smelling'],
    ['spell', 'spells', 'spelt', 'spelling'],
    ['spill', 'spills', 'spilt', 'spilling'],
    ['spoil', 'spoils', 'spoilt', 'spoiling'],
    ['dwell', 'dwells', 'dwelt', 'dwelling'],
    ['speed', 'speeds', 'sped', 'speeding'],
    ['spit', 'spits', 'spat', 'spitting'],
    ['strive', 'strives', 'strove', 'striven', 'striving'],
    ['thrive', 'thrives', 'throve', 'thriven', 'thriving'],
    ['tread', 'treads', 'trod', 'trodden', 'treading'],
    ['sew', 'sews', 'sewn', 'sewing'],
    ['sow', 'sows', 'sown', 'sowing'],
    ['swell', 'swells', 'swollen', 'swelling'],
    ['prove', 'proves', 'proven', 'proving'],
    ['dive', 'dives', 'dove', 'diving'],
    ['sneak', 'sneaks', 'snuck', 'sneaking'],
    ['plead', 'pleads', 'pled', 'pleading'],
    ['can', 'could'],
    ['may', 'might'],
    ['will', 'would'],
    ['shall', 'should'],

    // Common prefixed irregular verbs
    ['mistake', 'mistakes', 'mistook', 'mistaken', 'mistaking'],
    ['overcome', 'overcomes', 'overcame', 'overcoming'],
    ['overtake', 'overtakes', 'overtook', 'overtaken', 'overtaking'],
    ['undertake', 'undertakes', 'undertook', 'undertaken', 'undertaking'],
    ['withdraw', 'withdraws', 'withdrew', 'withdrawn', 'withdrawing'],
    ['withstand', 'withstands', 'withstood', 'withstanding'],
    ['undergo', 'undergoes', 'underwent', 'undergone', 'undergoing'],
    ['oversee', 'oversees', 'oversaw', 'overseen', 'overseeing'],
    ['overthrow', 'overthrows', 'overthrew', 'overthrown', 'overthrowing'],
    ['uphold', 'upholds', 'upheld', 'upholding'],
    ['behold', 'beholds', 'beheld', 'beholding'],
    ['foresee', 'foresees', 'foresaw', 'foreseen', 'foreseeing'],
    ['misunderstand', 'misunderstands', 'misunderstood', 'misunderstanding'],
    ['rebuild', 'rebuilds', 'rebuilt', 'rebuilding'],
    ['rewrite', 'rewrites', 'rewrote', 'rewritten', 'rewriting'],
    ['remake', 'remakes', 'remade', 'remaking'],
    ['rethink', 'rethinks', 'rethought', 'rethinking'],
    ['undo', 'undoes', 'undid', 'undone', 'undoing'],
    ['outgrow', 'outgrows', 'outgrew', 'outgrown', 'outgrowing'],
    ['underlie', 'underlies', 'underlay', 'underlain', 'underlying'],

    // Irregular plurals (native + Latin/Greek)
    ['child', 'children'],
    ['man', 'men'],
    ['woman', 'women'],
    ['foot', 'feet'],
    ['tooth', 'teeth'],
    ['goose', 'geese'],
    ['mouse', 'mice'],
    ['louse', 'lice'],
    ['person', 'people'],
    ['ox', 'oxen'],
    ['crisis', 'crises'],
    ['analysis', 'analyses'],
    ['basis', 'bases'],
    ['thesis', 'theses'],
    ['hypothesis', 'hypotheses'],
    ['diagnosis', 'diagnoses'],
    ['oasis', 'oases'],
    ['axis', 'axes'],
    ['emphasis', 'emphases'],
    ['parenthesis', 'parentheses'],
    ['synopsis', 'synopses'],
    ['phenomenon', 'phenomena'],
    ['criterion', 'criteria'],
    ['datum', 'data'],
    ['medium', 'media'],
    ['curriculum', 'curricula'],
    ['bacterium', 'bacteria'],
    ['stratum', 'strata'],
    ['memorandum', 'memoranda'],
    ['cactus', 'cacti'],
    ['focus', 'foci'],
    ['fungus', 'fungi'],
    ['nucleus', 'nuclei'],
    ['radius', 'radii'],
    ['stimulus', 'stimuli'],
    ['syllabus', 'syllabi'],
    ['alumnus', 'alumni'],
    ['index', 'indices'],
    ['appendix', 'appendices'],
    ['matrix', 'matrices'],
    ['vertex', 'vertices'],
    ['vortex', 'vortices'],
    ['formula', 'formulae'],
    ['antenna', 'antennae'],
    ['larva', 'larvae'],

    // Irregular comparatives & superlatives
    ['good', 'better', 'best'],
    ['bad', 'worse', 'worst'],
    ['far', 'farther', 'farthest', 'further', 'furthest'],
    ['little', 'less', 'least'],
    ['many', 'more', 'most'],
    ['much', 'more', 'most'],
    ['old', 'elder', 'eldest'],
];

const BASE_TO_IRREGULARS = new Map<string, Set<string>>();
const IRREGULAR_TO_BASES = new Map<string, Set<string>>();

for (const group of IRREGULAR_PARADIGMS) {
    const base = group[0];
    let formSet = BASE_TO_IRREGULARS.get(base);
    if (!formSet) {
        formSet = new Set<string>();
        BASE_TO_IRREGULARS.set(base, formSet);
    }
    for (let i = 1; i < group.length; i++) {
        const form = group[i];
        formSet.add(form);
        let bases = IRREGULAR_TO_BASES.get(form);
        if (!bases) {
            bases = new Set<string>();
            IRREGULAR_TO_BASES.set(form, bases);
        }
        bases.add(base);
    }
}

/**
 * Strips trailing possessive ('s / ’s / ' / ’) from a lowercase word token.
 */
function stripPossessive(word: string): string {
    if (word.endsWith("'s") || word.endsWith('\u2019s')) {
        return word.slice(0, -2);
    }
    if (word.endsWith("'") || word.endsWith('\u2019')) {
        return word.slice(0, -1);
    }
    return word;
}

/**
 * Returns true if `base` ends in a CVC pattern eligible for final consonant doubling
 * (e.g. stem, stop, plan, occur, travel, equip, quiz).
 */
function canDoubleFinalConsonant(base: string): boolean {
    const len = base.length;
    if (len < 3) return false;

    const last = base[len - 1];
    if (NON_DOUBLING_FINAL.has(last)) return false;

    const prev = base[len - 2];
    if (!VOWELS.has(prev)) return false;

    const prev2 = base[len - 3];
    if (!VOWELS.has(prev2)) return true;

    // Treat 'qu' as a consonant cluster (/kw/), e.g. equip -> equipped, quiz -> quizzed, squat -> squatted
    if (prev2 === 'u' && len >= 4 && base[len - 4] === 'q') {
        return true;
    }

    return false;
}

/**
 * Returns true if `base` is a single-syllable CVC word (e.g. hop, tap, stem, plan, star, quit).
 * In English, 1-syllable CVC words always double their final consonant before vowel-initial
 * inflections (-ed, -ing, -er, -est), so "hoped"/"hoping" belong to "hope", NOT "hop".
 */
function isSingleSyllableCvc(base: string): boolean {
    if (!canDoubleFinalConsonant(base)) return false;

    // Count vowel clusters (ignoring 'u' directly after 'q' as in quit/quiz/squat)
    let vowelClusters = 0;
    let inVowel = false;
    for (let i = 0; i < base.length; i++) {
        const ch = base[i];
        const isQuU = ch === 'u' && i > 0 && base[i - 1] === 'q';
        if (!isQuU && VOWELS.has(ch)) {
            if (!inVowel) {
                vowelClusters++;
                inVowel = true;
            }
        } else {
            inVowel = false;
        }
    }
    return vowelClusters === 1;
}

/**
 * Checks whether `candidate` is a valid morphological form derived from `base`.
 * When `allowDerivational` is false, only strict inflectional rules are allowed
 * (used for reverse matching so saving "artist" doesn't highlight "art").
 */
function isFormOfBase(candidate: string, base: string, allowDerivational: boolean): boolean {
    if (candidate === base) return true;
    if (FALSE_COGNATE_PAIRS.has(`${base}:${candidate}`)) return false;

    // 1. Irregular paradigms (works even for 2-letter words like go -> went, do -> did, be -> was)
    const irregularForms = BASE_TO_IRREGULARS.get(base);
    if (irregularForms && irregularForms.has(candidate)) {
        return true;
    }

    // Short 1-2 letter words do not take generic suffixes (prevents in -> inner, on -> only, or -> oral)
    if (base.length < 3) return false;

    const singleSyllableCvc = isSingleSyllableCvc(base);

    // 2. Direct suffixation: base + suffix
    if (candidate.startsWith(base)) {
        const suffix = candidate.slice(base.length);
        if (REGULAR_CONSONANT_INITIAL_INFLECTIONS.has(suffix)) return true;
        if (!singleSyllableCvc && REGULAR_VOWEL_INITIAL_INFLECTIONS.has(suffix)) return true;
        if (base.endsWith('e') && SILENT_E_DIRECT_SUFFIXES.has(suffix)) return true;
        if (allowDerivational) {
            if (DERIVATIONAL_SUFFIXES_MIN3.has(suffix)) return true;
            if (base.length >= 4 && DERIVATIONAL_SUFFIXES_MIN4.has(suffix)) return true;
        }

        // 3. CVC consonant doubling: stem + m + ed = stemmed, quiz + z + es = quizzes
        if (canDoubleFinalConsonant(base)) {
            const lastChar = base[base.length - 1];
            if (suffix.length >= 2 && suffix[0] === lastChar) {
                const afterDouble = suffix.slice(1);
                if (DOUBLING_INFLECTIONAL_SUFFIXES.has(afterDouble)) {
                    // 'es' doubling only applies to s/z (quizzes, gasses, busses)
                    if (afterDouble !== 'es' || lastChar === 's' || lastChar === 'z') {
                        return true;
                    }
                }
                if (allowDerivational && DOUBLING_DERIVATIONAL_SUFFIXES.has(afterDouble)) {
                    return true;
                }
            }
        }

        // 4. -ic -> -ick doubling: panic + k + ed = panicked
        if (base.endsWith('ic') && suffix.length >= 2 && suffix[0] === 'k') {
            const afterK = suffix.slice(1);
            if (ICK_INFLECTIONAL_SUFFIXES.has(afterK)) return true;
            if (allowDerivational && ICK_DERIVATIONAL_SUFFIXES.has(afterK)) return true;
        }
    }

    // 5. Silent -e rules (make -> making, die -> dying, simple -> simply, true -> truly)
    if (base.endsWith('e')) {
        // 5a. -ie -> -ying (die -> dying, lie -> lying, tie -> tying)
        if (base.endsWith('ie') && candidate === `${base.slice(0, -2)}ying`) {
            return true;
        }

        const stem = base.slice(0, -1);
        if (candidate.startsWith(stem)) {
            const suffix = candidate.slice(stem.length);

            // 5b. Consonant + -le -> -ly (simple -> simply, terrible -> terribly)
            if (
                allowDerivational &&
                base.endsWith('le') &&
                base.length >= 4 &&
                !VOWELS.has(base[base.length - 3]) &&
                suffix === 'y'
            ) {
                return true;
            }

            // 5c. -ue -> -uly / -ument (true -> truly, argue -> argument) and whole -> wholly
            if (allowDerivational) {
                if (base.endsWith('ue') && (suffix === 'ly' || suffix === 'ment' || suffix === 'ments')) {
                    return true;
                }
                if (base === 'whole' && suffix === 'ly') {
                    return true;
                }
            }

            // 5d. Standard silent -e drop before vowel-initial suffixes
            // (Words ending in ee/ye/oe keep their final 'e' before -ing: seeing, agreeing, dyeing, canoeing)
            const keepEBeforeIng = base.endsWith('ee') || base.endsWith('ye') || base.endsWith('oe');
            if (!(keepEBeforeIng && (suffix === 'ing' || suffix === 'ings'))) {
                if (DROP_E_INFLECTIONAL_SUFFIXES.has(suffix)) return true;
                if (allowDerivational && DROP_E_DERIVATIONAL_SUFFIXES.has(suffix)) return true;
            }
        }
    }

    // 6. Consonant + y -> i (study -> studies/studied, happy -> happier/happily/happiness)
    if (base.endsWith('y') && !VOWELS.has(base[base.length - 2])) {
        const iStem = `${base.slice(0, -1)}i`;
        if (candidate.startsWith(iStem)) {
            const suffix = candidate.slice(iStem.length);
            if (Y_TO_I_INFLECTIONAL_SUFFIXES.has(suffix)) return true;
            if (allowDerivational && Y_TO_I_DERIVATIONAL_SUFFIXES.has(suffix)) return true;
        }
    }

    // 7. -f / -fe -> -ves plurals (wolf -> wolves, knife -> knives)
    if (base.endsWith('fe') && candidate === `${base.slice(0, -2)}ves`) {
        return true;
    }
    if (base.endsWith('f') && candidate === `${base.slice(0, -1)}ves`) {
        return true;
    }

    return false;
}

/**
 * Returns true if a subtitle/text word token matches a saved dictionary word,
 * taking English inflectional and derivational morphology into account.
 */
export function matchesEnglishWord(candidateRaw: string, savedRaw: string): boolean {
    const candidateLower = candidateRaw.toLowerCase();
    const savedLower = savedRaw.toLowerCase();

    if (!candidateLower || !savedLower) return false;
    if (candidateLower === savedLower) return true;

    const candidate = stripPossessive(candidateLower);
    const saved = stripPossessive(savedLower);

    if (!candidate || !saved) return false;
    if (candidate === saved) return true;

    // Non-ASCII scripts (e.g. Ukrainian, German umlauts, etc.): exact/possessive match only
    if (!ASCII_WORD_RE.test(candidate) || !ASCII_WORD_RE.test(saved)) {
        return false;
    }

    // Forward match: saved is base form, candidate is inflected or derived form
    if (isFormOfBase(candidate, saved, true)) {
        return true;
    }

    // Reverse match (strictly inflectional): saved is an inflected form (e.g. "stemmed" or "went"),
    // candidate is the base form (e.g. "stem" or "go")
    if (isFormOfBase(saved, candidate, false)) {
        return true;
    }

    // Sibling irregular match: e.g. saved "went", subtitle has "gone" (both share base "go")
    const savedBases = IRREGULAR_TO_BASES.get(saved);
    if (savedBases) {
        const basesList = Array.from(savedBases);
        for (let i = 0; i < basesList.length; i++) {
            const base = basesList[i];
            if (candidate === base || isFormOfBase(candidate, base, false)) {
                return true;
            }
        }
    }

    return false;
}

interface TextToken {
    text: string;
    start: number;
    end: number;
}

const WORD_TOKEN_RE = /[\p{L}\p{N}]+(?:['’][\p{L}\p{N}]+)*/gu;

function tokenizeText(text: string): TextToken[] {
    const tokens: TextToken[] = [];
    WORD_TOKEN_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = WORD_TOKEN_RE.exec(text)) !== null) {
        tokens.push({
            text: match[0],
            start: match.index,
            end: match.index + match[0].length,
        });
    }
    return tokens;
}

/**
 * Computes the highlight end offset for a matched single-word token:
 * - When the token starts with the exact saved base word (e.g. "stemmed" for "stem",
 *   "jumping" for "jump", "panicked" for "panic", "stem's" for "stem"), highlights
 *   only the saved word prefix ("stem" in "stemmed").
 * - When the stem itself changed (e.g. "studies" for "study", "making" for "make",
 *   "went" for "go"), highlights the full word (trimming any trailing possessive 's/’s).
 */
function getWordHighlightEnd(token: TextToken, savedTerm: string): number {
    const lowerToken = token.text.toLowerCase();
    const lowerSaved = savedTerm.toLowerCase();

    if (lowerToken.startsWith(lowerSaved)) {
        return token.start + lowerSaved.length;
    }

    if (savedTerm.includes("'") || savedTerm.includes('\u2019')) {
        return token.end;
    }
    if (lowerToken.endsWith("'s") || lowerToken.endsWith('\u2019s')) {
        return token.end - 2;
    }
    return token.end;
}

/**
 * Computes the highlight end offset for the last token of a matched phrase,
 * trimming trailing possessive ('s / ’s) when the saved term has no apostrophe.
 */
function getPhraseEndOffset(token: TextToken, savedTerm: string): number {
    if (savedTerm.includes("'") || savedTerm.includes('\u2019')) {
        return token.end;
    }
    const lower = token.text.toLowerCase();
    if (lower.endsWith("'s") || lower.endsWith('\u2019s')) {
        return token.end - 2;
    }
    return token.end;
}

/**
 * Finds the next morphological match for a single word `searchTerm` in `text`
 * starting at or after `startIndex`.
 */
export function findWordMatch(text: string, searchTerm: string, startIndex: number): MatchResult {
    const trimmed = searchTerm.trim();
    if (!trimmed || startIndex >= text.length) {
        return { found: false, nextSearchIndex: text.length };
    }

    const tokens = tokenizeText(text);
    for (const token of tokens) {
        if (token.start < startIndex) continue;

        if (matchesEnglishWord(token.text, trimmed)) {
            const end = getWordHighlightEnd(token, trimmed);
            return {
                found: true,
                isValid: true,
                start: token.start,
                end,
                nextSearchIndex: token.end,
            };
        }
    }

    return { found: false, nextSearchIndex: text.length };
}

/**
 * Finds the next match for a multi-word phrase `searchPhrase` in `text`
 * starting at or after `startIndex`, supporting inflected phrasal verbs
 * (e.g. "stem from" -> "stemmed from", "give up" -> "gave up") and noun plurals
 * (e.g. "side effect" -> "side effects").
 */
export function findPhraseMatch(text: string, searchPhrase: string, startIndex: number): MatchResult {
    const phraseTokens = tokenizeText(searchPhrase.trim());
    if (phraseTokens.length === 0 || startIndex >= text.length) {
        return { found: false, nextSearchIndex: text.length };
    }
    if (phraseTokens.length === 1) {
        return findWordMatch(text, phraseTokens[0].text, startIndex);
    }

    const textTokens = tokenizeText(text);
    const maxStart = textTokens.length - phraseTokens.length;

    for (let i = 0; i <= maxStart; i++) {
        if (textTokens[i].start < startIndex) continue;

        let allMatched = true;
        for (let j = 0; j < phraseTokens.length; j++) {
            const candidateToken = textTokens[i + j];
            const phraseToken = phraseTokens[j];

            if (j > 0) {
                const gap = text.slice(textTokens[i + j - 1].end, candidateToken.start);
                // Allow only whitespace or hyphen between words of the same phrase
                if (!/^[\s-]+$/.test(gap)) {
                    allMatched = false;
                    break;
                }
            }

            if (!matchesEnglishWord(candidateToken.text, phraseToken.text)) {
                allMatched = false;
                break;
            }
        }

        if (allMatched) {
            const firstToken = textTokens[i];
            const lastToken = textTokens[i + phraseTokens.length - 1];
            const lastPhraseToken = phraseTokens[phraseTokens.length - 1];
            const end = getPhraseEndOffset(lastToken, lastPhraseToken.text);

            return {
                found: true,
                isValid: true,
                start: firstToken.start,
                end,
                nextSearchIndex: lastToken.end,
            };
        }
    }

    return { found: false, nextSearchIndex: text.length };
}
