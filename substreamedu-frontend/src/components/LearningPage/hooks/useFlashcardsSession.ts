import { useState, useEffect, useRef, useCallback } from 'react';
import { DictionaryService } from '../../../services/DictionaryService';
import { SessionWord } from '../utils/storyHighlightUtils';

export interface DictionaryItem {
    id: number;
    resourceName: string;
    highlightedText: string | null;
    translatedText: string | null;
    context: string | null;
    note: string | null;
    definition: string | null;
    imageUrl: string | null;
    transcription: string | null;
    repetitionLevel: number;
    interval: number;
    easeFactor: number;
    nextRepetitionDate: string;
    isLeech?: boolean;
    cardType?: number;
}

export type Rating = 'again' | 'good';

export const SESSION_STORAGE_KEY = 'srs_session_state';
export const SESSION_CHECKPOINT = 20;

interface StoredSessionState {
    sessionId: string;
    wordIds: number[];
    currentIndex: number;
    answeredIds: number[];
    goodIds?: number[];
    startTime: number;
}

export interface UseFlashcardsSessionReturn {
    reviewWords: DictionaryItem[];
    currentWord?: DictionaryItem;
    currentIndex: number;
    revealLevel: 0 | 1 | 2 | 3;
    loading: boolean;
    totalDictionarySize: number | null;
    initialCardsCount: number;
    goodIds: Set<number>;
    sessionTotal: number;
    ratingsCount: number;
    showCheckpoint: boolean;
    direction: number;
    answeredIds: Set<number>;
    sessionWords: SessionWord[];
    completionStage: 'learning' | 'story' | 'finished';
    isCardInFlight: (id: number) => boolean;
    handleRating: (rating: Rating) => void;
    revealNext: () => void;
    changeCard: (index: number) => void;
    nextCard: () => void;
    prevCard: () => void;
    handleRefresh: () => void;
    handleFinishEarly: () => void;
    handleContinueCheckpoint: () => void;
    setCompletionStage: React.Dispatch<React.SetStateAction<'learning' | 'story' | 'finished'>>;
    setRevealLevel: React.Dispatch<React.SetStateAction<0 | 1 | 2 | 3>>;
    setSessionWords: React.Dispatch<React.SetStateAction<SessionWord[]>>;
}

export const useFlashcardsSession = (): UseFlashcardsSessionReturn => {
    const [reviewWords, setReviewWords] = useState<DictionaryItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [revealLevel, setRevealLevel] = useState<0 | 1 | 2 | 3>(0);
    const [loading, setLoading] = useState(true);
    const [totalDictionarySize, setTotalDictionarySize] = useState<number | null>(null);
    const initialCardsCount = useRef<number>(0);
    const [goodIds, setGoodIds] = useState<Set<number>>(new Set());
    const [sessionTotal, setSessionTotal] = useState(0);
    const [ratingsCount, setRatingsCount] = useState(0);
    const [showCheckpoint, setShowCheckpoint] = useState(false);
    const checkpointShown = useRef(false);
    const [direction, setDirection] = useState(0);
    const [sessionId] = useState(() => Date.now().toString());
    const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set());
    const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
    const [answerShownTime, setAnswerShownTime] = useState<number | null>(null);

    const [sessionWords, setSessionWords] = useState<SessionWord[]>([]);
    const inFlightCardIds = useRef<Set<number>>(new Set());
    const [completionStage, setCompletionStage] = useState<'learning' | 'story' | 'finished'>('learning');

    const saveSessionState = useCallback((
        words: DictionaryItem[],
        index: number,
        answered: Set<number>,
        good: Set<number>
    ) => {
        const state: StoredSessionState = {
            sessionId,
            wordIds: words.map(w => w.id),
            currentIndex: index,
            answeredIds: Array.from(answered),
            goodIds: Array.from(good),
            startTime: cardStartTime
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
    }, [sessionId, cardStartTime]);

    const fetchReviewWords = useCallback(async (forceRefresh = false) => {
        setLoading(true);
        try {
            if (forceRefresh) {
                await DictionaryService.refreshSRSSession();
            }
            const data = await DictionaryService.fetchSRSToday();
            const cards = data.cards || [];
            setReviewWords(cards);
            initialCardsCount.current = cards.length;
            setGoodIds(new Set());
            setSessionTotal(cards.length);
            setRatingsCount(0);
            setShowCheckpoint(false);
            checkpointShown.current = false;
            setTotalDictionarySize(data.totalDictionarySize);
            setAnsweredIds(new Set());
            setCurrentIndex(0);
            setCardStartTime(Date.now());

            localStorage.removeItem(SESSION_STORAGE_KEY);
            setSessionWords([]);
            setCompletionStage('learning');
        } catch (error) {
            console.error('Failed to fetch review words:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const restoreOrFetchSession = useCallback(async () => {
        setLoading(true);
        try {
            const savedState = localStorage.getItem(SESSION_STORAGE_KEY);
            if (savedState) {
                const state: StoredSessionState = JSON.parse(savedState);
                const sessionAge = Date.now() - state.startTime;
                if (sessionAge < 60 * 60 * 1000) {
                    const sessionData = await DictionaryService.fetchSRSToday();
                    setTotalDictionarySize(sessionData.totalDictionarySize);
                    const freshWords = sessionData.cards || [];
                    const wordsMap = new Map(freshWords.map(w => [w.id, w]));

                    const restoredWords = state.wordIds
                        .map(id => wordsMap.get(id))
                        .filter((w): w is DictionaryItem => w !== undefined);

                    if (restoredWords.length > 0) {
                        setReviewWords(restoredWords);
                        initialCardsCount.current = Math.max(state.wordIds.length, restoredWords.length);
                        const restoredGood = (state.goodIds || []).filter(id => Number.isFinite(id));
                        setGoodIds(new Set(restoredGood));
                        setSessionTotal(new Set([...restoredWords.map(w => w.id), ...restoredGood]).size);
                        setRatingsCount(0);
                        setShowCheckpoint(false);
                        checkpointShown.current = false;
                        setCurrentIndex(Math.min(state.currentIndex, restoredWords.length - 1));
                        setAnsweredIds(new Set(state.answeredIds));
                        setCardStartTime(Date.now());
                        setLoading(false);
                        return;
                    }
                }
            }
            await fetchReviewWords(true);
        } catch (error) {
            console.error('Failed to restore session:', error);
            await fetchReviewWords(true);
        }
    }, [fetchReviewWords]);

    useEffect(() => {
        restoreOrFetchSession();
    }, [restoreOrFetchSession]);

    const handleRefresh = useCallback(() => {
        fetchReviewWords(true);
    }, [fetchReviewWords]);

    const handleFinishEarly = useCallback(() => {
        localStorage.removeItem(SESSION_STORAGE_KEY);
        setShowCheckpoint(false);
        setReviewWords([]);
        setRevealLevel(0);
        setCompletionStage(sessionWords.length > 0 ? 'story' : 'finished');
    }, [sessionWords.length]);

    const handleContinueCheckpoint = useCallback(() => {
        setShowCheckpoint(false);
    }, []);

    const changeCard = useCallback((newIndex: number) => {
        setDirection(newIndex > currentIndex ? 1 : -1);
        setRevealLevel(0);
        setCurrentIndex(newIndex);
        setCardStartTime(Date.now());
    }, [currentIndex]);

    const nextCard = useCallback(() => {
        if (currentIndex < reviewWords.length - 1) {
            changeCard(currentIndex + 1);
        }
    }, [currentIndex, reviewWords.length, changeCard]);

    const prevCard = useCallback(() => {
        if (currentIndex > 0) {
            changeCard(currentIndex - 1);
        }
    }, [currentIndex, changeCard]);

    const revealNext = useCallback(() => {
        const currentWord = reviewWords[currentIndex];
        if (!currentWord) return;

        const hasDef = Boolean(currentWord.definition && currentWord.definition.trim());
        const hasTrans = Boolean(currentWord.translatedText && currentWord.translatedText.trim());
        const maxLevel = hasDef ? (hasTrans ? 3 : 2) : (hasTrans ? 2 : 1);

        setRevealLevel(prev => Math.min(prev + 1, maxLevel) as 0 | 1 | 2 | 3);
        if (revealLevel === 0) {
            setAnswerShownTime(Date.now());
        }
    }, [currentIndex, reviewWords, revealLevel]);

    const handleRating = useCallback((rating: Rating) => {
        const word = reviewWords[currentIndex];
        if (!word || inFlightCardIds.current.has(word.id)) return;

        inFlightCardIds.current.add(word.id);

        if (navigator.vibrate) {
            navigator.vibrate(rating === 'again' ? 20 : 10);
        }

        let nextSessionWords = sessionWords;
        const wordText = word.highlightedText || '';
        if (!sessionWords.find(i => i.word === wordText)) {
            nextSessionWords = [
                ...sessionWords,
                {
                    word: wordText,
                    translation: word.translatedText || '',
                    definition: word.definition || '',
                    context: word.context || ''
                }
            ];
            setSessionWords(nextSessionWords);
        }

        const responseTimeMs = answerShownTime ? Date.now() - answerShownTime : 5000;

        const newAnsweredIds = new Set(answeredIds);
        newAnsweredIds.add(word.id);
        const newGoodIds = new Set(goodIds);
        if (rating === 'good') newGoodIds.add(word.id);

        const updatedList = [...reviewWords];
        const currentRef = updatedList[currentIndex];

        updatedList.splice(currentIndex, 1);

        if (rating === 'again') {
            updatedList.push(currentRef);
        }

        setAnsweredIds(newAnsweredIds);
        setGoodIds(newGoodIds);
        setReviewWords(updatedList);
        setRevealLevel(0);
        setAnswerShownTime(null);
        setCardStartTime(Date.now());
        setDirection(1);

        const nextIdx = currentIndex >= updatedList.length
            ? Math.max(0, updatedList.length - 1)
            : currentIndex;
        setCurrentIndex(nextIdx);

        const nextRatingsCount = ratingsCount + 1;
        setRatingsCount(nextRatingsCount);
        if (nextRatingsCount >= SESSION_CHECKPOINT && !checkpointShown.current && updatedList.length > 0) {
            checkpointShown.current = true;
            setShowCheckpoint(true);
        }

        saveSessionState(updatedList, nextIdx, newAnsweredIds, newGoodIds);

        if (updatedList.length === 0) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            if (nextSessionWords.length > 0) {
                setCompletionStage('story');
            } else {
                setCompletionStage('finished');
            }
        }

        const apiRating = rating === 'again' ? 'forgot' : 'remember';
        DictionaryService.reviewCard2Button(word.id, apiRating, responseTimeMs)
            .then(result => {
                if (rating === 'good' && result && result.repeatInSession) {
                    setReviewWords(prev => {
                        const next = [...prev, result.card || currentRef];
                        saveSessionState(next, nextIdx, newAnsweredIds, newGoodIds);
                        return next;
                    });
                    setCompletionStage(prev => (prev !== 'learning' ? 'learning' : prev));
                }
            })
            .catch(error => {
                console.error('Review card background sync failed:', error);
            })
            .finally(() => {
                inFlightCardIds.current.delete(word.id);
            });
    }, [
        reviewWords,
        currentIndex,
        answerShownTime,
        answeredIds,
        goodIds,
        ratingsCount,
        saveSessionState,
        sessionWords
    ]);

    const isCardInFlight = useCallback((id: number): boolean => {
        return inFlightCardIds.current.has(id);
    }, []);

    return {
        reviewWords,
        currentWord: reviewWords[currentIndex],
        currentIndex,
        revealLevel,
        loading,
        totalDictionarySize,
        initialCardsCount: initialCardsCount.current,
        goodIds,
        sessionTotal,
        ratingsCount,
        showCheckpoint,
        direction,
        answeredIds,
        sessionWords,
        completionStage,
        isCardInFlight,
        handleRating,
        revealNext,
        changeCard,
        nextCard,
        prevCard,
        handleRefresh,
        handleFinishEarly,
        handleContinueCheckpoint,
        setCompletionStage,
        setRevealLevel,
        setSessionWords,
    };
};
