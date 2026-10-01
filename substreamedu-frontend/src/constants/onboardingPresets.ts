export interface OnboardingPreset {
    id: string;
    title: string;
    description: string;
    type: 'youtube' | 'song' | 'movie';
    url: string;
    startTime: number;
    endTime: number;
    recommendedWords: string[];
    subtitlesFile?: string;
    thumbnailUrl: string;
}

export const ONBOARDING_PRESETS: OnboardingPreset[] = [
    {
        id: 'comprehensible-nature',
        title: 'Comprehensible Input: Walking in Nature',
        description: 'Natural conversational English, clear everyday vocabulary, and easy storytelling.',
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=hsUkTQ1YTOQ',
        startTime: 0,
        endTime: 60,
        recommendedWords: ['compilation', 'comprehensible', 'input', 'listening', 'translate'],
        subtitlesFile: '/subtitles/hsUkTQ1YTOQ.json',
        thumbnailUrl: 'https://img.youtube.com/vi/hsUkTQ1YTOQ/hqdefault.jpg',
    },
    {
        id: 'canadian-phrasal-verbs',
        title: '150 Everyday Phrasal Verbs',
        description: 'Clear Canadian pronunciation, everyday verbs, and practical speaking examples.',
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=d9gkFenaKFs',
        startTime: 0,
        endTime: 60,
        recommendedWords: ['phrasal verbs', 'lesson', 'everyday', 'practice'],
        subtitlesFile: '/subtitles/d9gkFenaKFs.json',
        thumbnailUrl: 'https://img.youtube.com/vi/d9gkFenaKFs/hqdefault.jpg',
    },
    {
        id: 'bbc-lifestyle-boxset',
        title: 'BBC 6 Minute English: Lifestyle',
        description: 'Classic British RP dialogues, rich cultural vocabulary, and clear explanations.',
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=b5DOQ7iOzO4',
        startTime: 0,
        endTime: 60,
        recommendedWords: ['lifestyle', 'conversations', 'vocabulary', 'culture'],
        subtitlesFile: '/subtitles/b5DOQ7iOzO4.json',
        thumbnailUrl: 'https://img.youtube.com/vi/b5DOQ7iOzO4/hqdefault.jpg',
    },
    {
        id: 'vanessa-fluency-masterclass',
        title: 'Fluency & Pronunciation Masterclass',
        description: 'Natural American speaking rhythms, common expressions, and clear enunciation.',
        type: 'youtube',
        url: 'https://www.youtube.com/watch?v=BnRub9D5Ch8',
        startTime: 0,
        endTime: 60,
        recommendedWords: ['fluency', 'pronunciation', 'grammar', 'expressions'],
        subtitlesFile: '/subtitles/BnRub9D5Ch8.json',
        thumbnailUrl: 'https://img.youtube.com/vi/BnRub9D5Ch8/hqdefault.jpg',
    },
];

export const DEFAULT_ONBOARDING_PRESET = ONBOARDING_PRESETS[0];
