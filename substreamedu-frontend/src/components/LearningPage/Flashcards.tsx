import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';
import { DictionaryService } from '../../services/DictionaryService';
import { LanguageContext } from '../LanguageContext';
import styles from './Flashcards.module.css';

import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Play from 'lucide-react/dist/esm/icons/play';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Layout from 'lucide-react/dist/esm/icons/layout';
import Languages from 'lucide-react/dist/esm/icons/languages';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Check from 'lucide-react/dist/esm/icons/check';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import { useNavigate } from 'react-router-dom';
import Flashcard from './Flashcard';
import { motion, AnimatePresence } from 'framer-motion';
import { useTTS } from '../../hooks/useTTS';

interface DictionaryItem {
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

type Rating = 'again' | 'good';


const SESSION_STORAGE_KEY = 'srs_session_state';

interface SessionState {
    sessionId: string;
    wordIds: number[];
    currentIndex: number;
    answeredIds: number[];
    startTime: number;
}

export interface FlashcardsProps {
    onStartActivePractice?: (words: Array<{ word: string; translation?: string; definition?: string; context?: string }>) => void;
}

const FlashcardsGame: React.FC<FlashcardsProps> = ({ onStartActivePractice }) => {
    const intl = useIntl();
    const navigate = useNavigate();
    const [reviewWords, setReviewWords] = useState<DictionaryItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [revealLevel, setRevealLevel] = useState<0 | 1 | 2 | 3>(0);
    const [loading, setLoading] = useState(true);
    const [totalDictionarySize, setTotalDictionarySize] = useState<number | null>(null);
    const initialCardsCount = useRef<number>(0);
    const [waveIndex, setWaveIndex] = useState(1);
    const [waveSize, setWaveSize] = useState(0);
    const [direction, setDirection] = useState(0);
    const [sessionId] = useState(() => Date.now().toString());
    const [answeredIds, setAnsweredIds] = useState<Set<number>>(new Set());
    const [cardStartTime, setCardStartTime] = useState<number>(Date.now());
    const [answerShownTime, setAnswerShownTime] = useState<number | null>(null);
    const { play: playTTS, playingItemId } = useTTS();
    const { learningLanguage, fluentLanguage } = useContext(LanguageContext);

    
    const [sessionWords, setSessionWords] = useState<{ word: string, translation: string, definition: string, context: string }[]>([]);
    const [generatedText, setGeneratedText] = useState<string | null>(null);
    const [fluentStory, setFluentStory] = useState<string | null>(null);
    const [sessionQuestions, setSessionQuestions] = useState<string | null>(null);
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [activeStoryTab, setActiveStoryTab] = useState<'original' | 'fluent' | 'questions'>('original');
    const hasTriggeredGeneration = useRef(false);
    const inFlightCardIds = useRef<Set<number>>(new Set());
    const [completionStage, setCompletionStage] = useState<'learning' | 'story' | 'finished'>('learning');
    const [tooltipState, setTooltipState] = useState<{ text: string; x: number; y: number } | null>(null);
    const [hasStarted, setHasStarted] = useState(false);
    const currentWord = reviewWords[currentIndex];

    const decodeHtmlEntities = (str: string) => {
        const txt = document.createElement("textarea");
        txt.innerHTML = str;
        return txt.value;
    };

    const highlightText = useCallback((text: string | null) => {
        if (!text || sessionWords.length === 0) return text || '';

        let result = text;
        const sortedWords = [...sessionWords].sort((a, b) => b.word.length - a.word.length);

        const allMatches: Array<{
            start: number;
            end: number;
            translation: string;
            definition: string;
            originalText: string;
        }> = [];

        const lowerText = text.toLowerCase();

        for (const item of sortedWords) {
            const searchTerm = item.word.toLowerCase();
            let searchIndex = 0;

            while (searchIndex < text.length) {
                const foundIndex = lowerText.indexOf(searchTerm, searchIndex);
                if (foundIndex === -1) break;

                // Robust boundary check: not preceded or followed by alphanumeric characters
                // This works for English words while remaining somewhat language-agnostic.
                const isWordStart = foundIndex === 0 || !/[a-zA-Z0-9]/.test(text[foundIndex - 1]);
                const isWordEnd = foundIndex + searchTerm.length === text.length || !/[a-zA-Z0-9]/.test(text[foundIndex + searchTerm.length]);

                if (isWordStart && isWordEnd) {
                    const overlap = allMatches.some(m =>
                        (foundIndex >= m.start && foundIndex < m.end) ||
                        (foundIndex + searchTerm.length > m.start && foundIndex + searchTerm.length <= m.end)
                    );

                    if (!overlap) {
                        allMatches.push({
                            start: foundIndex,
                            end: foundIndex + searchTerm.length,
                            translation: item.translation,
                            definition: item.definition,
                            originalText: text.slice(foundIndex, foundIndex + searchTerm.length)
                        });
                    }
                }
                searchIndex = foundIndex + 1;
            }
        }

        allMatches.sort((a, b) => b.start - a.start);

        for (const match of allMatches) {
            // Prioritize translation, fallback to definition
            const tooltipText = (match.translation && match.translation.trim()) ? match.translation : (match.definition || '');
            const escapedTooltip = tooltipText.replace(/"/g, '&quot;');
            const spanHtml = `<span class="${styles.dictionaryWord}" data-translation="${escapedTooltip}">${match.originalText}</span>`;
            result = result.slice(0, match.start) + spanHtml + result.slice(match.end);
        }

        return result;
    }, [sessionWords]);

    useEffect(() => {
        const handleShowTooltip = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.classList && target.classList.contains(styles.dictionaryWord)) {
                const translationRaw = target.getAttribute('data-translation');
                const translation = translationRaw ? decodeHtmlEntities(translationRaw).trim() : '';

                if (translation) {
                    const rect = target.getBoundingClientRect();
                    const scrollTop = window.scrollY || document.documentElement.scrollTop;
                    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

                    let x = rect.left + scrollLeft + rect.width / 2;
                    let y = rect.top + scrollTop - 30;

                    // If it's a touch event, use the touch coordinates for better accuracy with wrapped phrases
                    if ('touches' in e && e.touches.length > 0) {
                        const touch = e.touches[0];
                        x = touch.pageX;
                        y = touch.pageY - 60; 
                    }

                    setTooltipState({
                        text: translation,
                        x: x,
                        y: y
                    });
                }
            } else if (e.type === 'touchstart' || e.type === 'mousedown') {
                
                setTooltipState(null);
            }
        };

        const handleHideTooltip = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target && target.classList && target.classList.contains(styles.dictionaryWord)) {
                setTooltipState(null);
            }
        };

        document.addEventListener('mouseover', handleShowTooltip);
        document.addEventListener('mouseout', handleHideTooltip);
        document.addEventListener('touchstart', handleShowTooltip, { passive: true });

        return () => {
            document.removeEventListener('mouseover', handleShowTooltip);
            document.removeEventListener('mouseout', handleHideTooltip);
            document.removeEventListener('touchstart', handleShowTooltip);
        };
    }, []); 

    useEffect(() => {
        restoreOrFetchSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    
    const saveSessionState = useCallback((words: DictionaryItem[], index: number, answered: Set<number>) => {
        const state: SessionState = {
            sessionId,
            wordIds: words.map(w => w.id),
            currentIndex: index,
            answeredIds: Array.from(answered),
            startTime: cardStartTime
        };
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(state));
    }, [sessionId, cardStartTime]);

    const restoreOrFetchSession = async () => {
        setLoading(true);
        try {
            
            const savedState = localStorage.getItem(SESSION_STORAGE_KEY);
            if (savedState) {
                const state: SessionState = JSON.parse(savedState);
                
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
                        setWaveIndex(1);
                        setWaveSize(restoredWords.length);
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
    };

    const fetchReviewWords = async (forceRefresh = false) => {
        setLoading(true);
        try {
            if (forceRefresh) {
                await DictionaryService.refreshSRSSession();
            }
            const data = await DictionaryService.fetchSRSToday();
            setReviewWords(data.cards || []);
            initialCardsCount.current = data.cards ? data.cards.length : 0;
            setWaveIndex(1);
            setWaveSize(data.cards ? data.cards.length : 0);
            setTotalDictionarySize(data.totalDictionarySize);
            setAnsweredIds(new Set());
            setCurrentIndex(0);
            setCardStartTime(Date.now());
            
            localStorage.removeItem(SESSION_STORAGE_KEY);
            
            setSessionWords([]);
            setGeneratedText(null);
            setFluentStory(null);
            setSessionQuestions(null);
            setGenerationError(null);
            setIsGeneratingText(false);
            setActiveStoryTab('original');
            hasTriggeredGeneration.current = false;
            setCompletionStage('learning');
        } catch (error) {
            console.error('Failed to fetch review words:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        fetchReviewWords(true);
    };

    const changeCard = useCallback((newIndex: number) => {
        setDirection(newIndex > currentIndex ? 1 : -1);
        setRevealLevel(0);
        setCurrentIndex(newIndex);
        setCardStartTime(Date.now());
    }, [currentIndex]);

    const handleRating = useCallback((rating: Rating) => {
        const word = reviewWords[currentIndex];
        if (!word || inFlightCardIds.current.has(word.id)) return;

        inFlightCardIds.current.add(word.id);

        if (navigator.vibrate) {
            navigator.vibrate(rating === 'again' ? 20 : 10); 
        }

        let nextSessionWords = sessionWords;
        const wordText = word.highlightedText || '';
        if (!sessionWords.find((i: any) => i.word === wordText)) {
            nextSessionWords = [...sessionWords, {
                word: wordText,
                translation: word.translatedText || '',
                definition: word.definition || '',
                context: word.context || ''
            }];
            setSessionWords(nextSessionWords);
        }

        // 1. Calculate response time immediately for the background API call
        const responseTimeMs = answerShownTime ? Date.now() - answerShownTime : 5000;

        // 2. Prepare next state OPTIMISTICALLY and update UI immediately
        const newAnsweredIds = new Set(answeredIds);
        newAnsweredIds.add(word.id);

        let updatedList = [...reviewWords];
        const currentRef = updatedList[currentIndex];

        // Remove current from list
        updatedList.splice(currentIndex, 1);

        // If AGAIN - optimistically add word to end of session for re-review
        if (rating === 'again') {
            updatedList.push(currentRef);
        }

        setAnsweredIds(newAnsweredIds);
        setReviewWords(updatedList);
        setRevealLevel(0);
        setAnswerShownTime(null);
        setCardStartTime(Date.now());
        setDirection(1);

        const nextIdx = currentIndex >= updatedList.length
            ? Math.max(0, updatedList.length - 1)
            : currentIndex;
        setCurrentIndex(nextIdx);

        let nextWaveIndex = waveIndex + 1;
        let nextWaveSize = waveSize;
        if (nextWaveIndex > waveSize) {
            nextWaveIndex = 1;
            nextWaveSize = updatedList.length;
        }
        setWaveIndex(nextWaveIndex);
        setWaveSize(nextWaveSize);

        saveSessionState(updatedList, nextIdx, newAnsweredIds);

        if (updatedList.length === 0) {
            localStorage.removeItem(SESSION_STORAGE_KEY);
            if (nextSessionWords.length > 0) {
                setCompletionStage('story');
            } else {
                setCompletionStage('finished');
            }
        }

        // 3. Background asynchronous persistence (zero UI freezing)
        const apiRating = rating === 'again' ? 'forgot' : 'remember';
        DictionaryService.reviewCard2Button(word.id, apiRating, responseTimeMs)
            .then((result) => {
                // If GOOD on a learning/new card and FSRS requires repeat in session (Step 1 of 2):
                if (rating === 'good' && result && result.repeatInSession) {
                    setReviewWords((prev) => {
                        const next = [...prev, result.card || currentRef];
                        saveSessionState(next, nextIdx, newAnsweredIds);
                        return next;
                    });
                    setCompletionStage((prev) => (prev !== 'learning' ? 'learning' : prev));
                }
            })
            .catch((error) => {
                console.error('Review card background sync failed:', error);
            })
            .finally(() => {
                inFlightCardIds.current.delete(word.id);
            });
    }, [reviewWords, currentIndex, answerShownTime, answeredIds, saveSessionState, sessionWords, waveIndex, waveSize]);

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

    const redirectToYouglish = (word: string) => {
        const youglishURL = `https://youglish.com/pronounce/${word}/english`;
        window.open(youglishURL, '_blank');
    };

    const handleGenerateStory = useCallback(async () => {
        if (sessionWords.length === 0 || loading || isGeneratingText) return;

        hasTriggeredGeneration.current = true;
        setIsGeneratingText(true);
        setGenerationError(null);

        try {
            const apiWords = sessionWords.map((w: any) => ({
                word: w.word,
                meaning: w.definition
                    ? (w.translation && w.translation !== w.definition
                        ? `${w.definition} (${w.translation})`
                        : w.definition)
                    : w.translation || '',
                context: w.context
            }));

            const summary = await DictionaryService.generateSessionSummary(
                apiWords,
                learningLanguage || 'en',
                fluentLanguage || 'ru'
            );

            if (summary && summary.originalStory) {
                setGeneratedText(summary.originalStory);
                setFluentStory(summary.fluentStory || summary.originalStory);
                setSessionQuestions(Array.isArray(summary.questions) ? summary.questions.join('\n') : (summary.questions || ''));
                setGenerationError(null);
            } else {
                setGenerationError('empty_response');
            }
        } catch (error: any) {
            console.error('Failed to generate session content:', error);
            setGenerationError(error?.message || 'Failed to generate session content');
        } finally {
            setIsGeneratingText(false);
        }
    }, [sessionWords, loading, isGeneratingText, learningLanguage, fluentLanguage]);

    const handleRetryGeneration = useCallback(() => {
        hasTriggeredGeneration.current = false;
        setGenerationError(null);
        setGeneratedText(null);
        setFluentStory(null);
        setSessionQuestions(null);
        handleGenerateStory();
    }, [handleGenerateStory]);

    useEffect(() => {
        if (completionStage === 'story' && sessionWords.length > 0 && !generatedText && !isGeneratingText && !loading && !hasTriggeredGeneration.current && !generationError) {
            handleGenerateStory();
        }
    }, [completionStage, sessionWords.length, generatedText, isGeneratingText, loading, generationError, handleGenerateStory]);


    
    useEffect(() => {
        if (!loading && currentWord && currentWord.highlightedText && completionStage === 'learning' && hasStarted) {
            const isRecognition = !currentWord.cardType || currentWord.cardType === 0;
            const isProduction = currentWord.cardType === 1;

            if ((isRecognition && revealLevel === 0) || (isProduction && revealLevel === 1)) {
                
                const timer = setTimeout(() => {
                    const cleanWord = decodeHtmlEntities(currentWord.highlightedText || '');
                    playTTS(cleanWord, currentWord.id, learningLanguage || 'en');
                }, 300);
                return () => clearTimeout(timer);
            }
        }
    }, [currentIndex, currentWord, loading, completionStage, revealLevel, learningLanguage, playTTS, hasStarted]);


    useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            const currentCard = reviewWords[currentIndex];
            if (loading || event.repeat || (currentCard && inFlightCardIds.current.has(currentCard.id))) return;

            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    if (currentIndex > 0) prevCard();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    if (currentIndex < reviewWords.length - 1) nextCard();
                    break;
                case ' ':
                case 'Enter':
                    event.preventDefault();
                    if (revealLevel < 3) {
                        const currentWord = reviewWords[currentIndex];
                        const hasDefinition = currentWord?.definition && currentWord.definition.trim();
                        const hasTranslatedText = currentWord?.translatedText && currentWord.translatedText.trim();
                        
                        const maxLevel = hasDefinition
                            ? (hasTranslatedText ? 3 : 2)
                            : (hasTranslatedText ? 2 : 1);
                        setRevealLevel(prev => Math.min(prev + 1, maxLevel) as 0 | 1 | 2 | 3);
                        if (revealLevel === 0) {
                            setAnswerShownTime(Date.now());
                        }
                    }
                    break;
                case '1':
                    event.preventDefault();
                    {
                        const word = reviewWords[currentIndex];
                        const hasDef = word?.definition?.trim();
                        const hasTrans = word?.translatedText?.trim();
                        const max = hasDef ? (hasTrans ? 3 : 2) : (hasTrans ? 2 : 1);
                        if (revealLevel >= max) handleRating('again');
                    }
                    break;
                case '2':
                    event.preventDefault();
                    {
                        const word = reviewWords[currentIndex];
                        const hasDef = word?.definition?.trim();
                        const hasTrans = word?.translatedText?.trim();
                        const max = hasDef ? (hasTrans ? 3 : 2) : (hasTrans ? 2 : 1);
                        if (revealLevel >= max) handleRating('good');
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [currentIndex, reviewWords.length, revealLevel, loading, handleRating, nextCard, prevCard, reviewWords]);

    if (loading) {
        return (
            <div className={styles.pageContainer}>
                <div className={styles.ambientGlow} />
                <div className={`${styles.ambientGlow} ${styles.ambientGlowSecond}`} />
                <div className={styles.content}>
                    <div className={styles.loadingContainer}>
                        <div className={styles.loadingText}>Loading...</div>
                    </div>
                </div>
            </div>
        );
    }

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9,
            rotateY: direction > 0 ? 20 : -20,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
            scale: 1,
            rotateY: 0,
        },
        exit: (direction: number) => ({
            zIndex: 0,
            x: direction < 0 ? 300 : -300,
            opacity: 0,
            scale: 0.9,
            rotateY: direction < 0 ? 20 : -20,
        })
    };
    return (
        <div className={styles.pageContainer}>
            <div className={styles.ambientGlow} />
            <div className={`${styles.ambientGlow} ${styles.ambientGlowSecond}`} />

            <div className={styles.content}>
        <div className="flex flex-col flex-1 items-center justify-start pt-28 pb-4" >
            {
                currentWord ? (
                    <div className="w-full max-w-2xl mx-auto px-6 relative perspective-1000 z-0">
                        <div className="grid place-items-center">
                            <AnimatePresence initial={false} custom={direction} mode="wait">
                                <motion.div
                                    key={currentWord.id}
                                    custom={direction}
                                    variants={variants}
                                    initial="enter"
                                    animate="center"
                                    exit="exit"
                                    transition={{
                                        x: { type: "spring", stiffness: 300, damping: 30 },
                                        opacity: { duration: 0.2 },
                                        scale: { duration: 0.2 },
                                        rotateY: { duration: 0.4 }
                                    }}
                                    className="w-full col-start-1 row-start-1"
                                    style={{ perspective: 1000 }}
                                >
                                    <div className="relative w-full h-full">
                                        <AnimatePresence>
                                            {!hasStarted && (
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    className={styles.startOverlay}
                                                >
                                                    <div className={styles.startOverlayContent}>
                                                        <button
                                                            className={styles.startButton}
                                                            onClick={() => setHasStarted(true)}
                                                        >
                                                            <Play className={styles.startIcon} />
                                                            {intl.formatMessage({ id: 'srs.start_learning', defaultMessage: 'Start Learning' })}
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                        <Flashcard
                                            word={currentWord.highlightedText || ''}
                                            transcription={currentWord.transcription || ''}
                                            definition={currentWord.definition || ''}
                                            translatedText={currentWord.translatedText || ''}
                                            context={currentWord.context || ''}
                                            imageUrl={currentWord.imageUrl || ''}
                                            revealLevel={revealLevel}
                                            cardType={currentWord.cardType}
                                            isPlaying={playingItemId === currentWord.id}
                                            onRevealNext={() => {
                                                const hasDefinition = currentWord.definition && currentWord.definition.trim();
                                                const hasTranslatedText = currentWord.translatedText && currentWord.translatedText.trim();
                                                // If definition exists: max 2/3, if not: max 1/2
                                                const maxLevel = hasDefinition
                                                    ? (hasTranslatedText ? 3 : 2)
                                                    : (hasTranslatedText ? 2 : 1);
                                                setRevealLevel(prev => Math.min(prev + 1, maxLevel) as 0 | 1 | 2 | 3);
                                                if (revealLevel === 0) {
                                                    setAnswerShownTime(Date.now());
                                                }
                                            }}
                                            onPlayPronunciation={() => currentWord.highlightedText && playTTS(decodeHtmlEntities(currentWord.highlightedText), currentWord.id, learningLanguage || 'en')}
                                            onWordClick={() => currentWord.highlightedText && redirectToYouglish(currentWord.highlightedText)}
                                        />
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        </div>

                        <div className="mt-3 z-10">
                            <div className="grid grid-cols-2 gap-3 mb-2">
                                <button
                                    onClick={() => handleRating('again')}
                                    disabled={revealLevel < 1 || Boolean(currentWord && inFlightCardIds.current.has(currentWord.id))}
                                    className={styles.ratingButtonAgain}
                                    aria-label={intl.formatMessage({ id: 'flashcards.again', defaultMessage: 'Again' })}
                                    title="Mark as again (Shortcut: 1)"
                                >
                                    <RefreshCw className={styles.ratingIconAgain} />
                                    <span className={styles.ratingLabel}>Again</span>
                                </button>
                                <button
                                    onClick={() => handleRating('good')}
                                    disabled={revealLevel < 1 || Boolean(currentWord && inFlightCardIds.current.has(currentWord.id))}
                                    className={styles.ratingButtonGood}
                                    aria-label={intl.formatMessage({ id: 'flashcards.good', defaultMessage: 'Good' })}
                                    title="Mark as good (Shortcut: 2)"
                                >
                                    <Check className={styles.ratingIconGood} />
                                    <span className={styles.ratingLabel}>Good</span>
                                </button>
                            </div>

                            <div className="flex items-center justify-between mt-3">
                                <button
                                    onClick={prevCard}
                                    disabled={currentIndex === 0 || !currentWord}
                                    className={styles.navButton}
                                    aria-label={`Previous card, currently on card ${currentIndex + 1} of ${reviewWords.length}`}
                                    title="Previous (Left Arrow)"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 transition-transform duration-300 ease-in-out hover:scale-120" aria-hidden="true">
                                        <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>

                                <span
                                    className={styles.cardCounter}
                                    role="status"
                                    aria-live="polite"
                                    aria-label={`Card ${waveSize > 0 ? waveIndex : 0} of ${waveSize}`}
                                >
                                    {waveSize > 0 ? waveIndex : 0} / {waveSize}
                                </span>

                                <button
                                    onClick={nextCard}
                                    disabled={currentIndex >= reviewWords.length - 1 || !currentWord}
                                    className={styles.navButton}
                                    aria-label={`Next card, currently on card ${currentIndex + 1} of ${reviewWords.length}`}
                                    title="Next (Right Arrow)"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10 transition-transform duration-300 ease-in-out hover:scale-120" aria-hidden="true">
                                        <path d="M9 6L15 12L9 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : reviewWords.length === 0 && answeredIds.size === 0 && totalDictionarySize === 0 ? (
                    <div className={styles.emptyContainer}>
                        <div className={styles.emptyContent}>
                            <div className={styles.emptyIconWrapper}>
                                <BookOpen size={48} className={styles.emptyIcon} />
                            </div>
                            <h2 className={styles.emptyTitle}>
                                {intl.formatMessage({ id: 'flashcards.emptyDictionaryTitle' })}
                            </h2>
                            <p className={styles.emptyDescription}>
                                {intl.formatMessage({ id: 'flashcards.emptyDictionaryDescription' })}
                            </p>
                            <div className={styles.emptyActions}>
                                <button
                                    onClick={() => navigate('/')}
                                    className={styles.primaryButton}
                                >
                                    <Layout size={20} />
                                    <span>{intl.formatMessage({ id: 'flashcards.backToDashboard' })}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                ) : completionStage === 'story' ? (
                    <div className={styles.completionContainer}>
                        <div className={styles.storyContent}>
                            <div className={styles.storyBlock}>
                                <div className={styles.storyHeaderWrapper}>
                                    <div className={styles.storyTabs}>
                                        <button
                                            onClick={() => setActiveStoryTab('original')}
                                            className={`${styles.storyTab} ${activeStoryTab === 'original' ? styles.storyTabActive : ''}`}
                                            title={intl.formatMessage({ id: 'flashcards.originalStory' })}
                                        >
                                            <Languages size={18} />
                                        </button>
                                        <button
                                            onClick={() => setActiveStoryTab('fluent')}
                                            className={`${styles.storyTab} ${activeStoryTab === 'fluent' ? styles.storyTabActive : ''}`}
                                            title={intl.formatMessage({ id: 'flashcards.fluentStory' })}
                                        >
                                            <Sparkles size={18} />
                                        </button>
                                        <button
                                            onClick={() => setActiveStoryTab('questions')}
                                            className={`${styles.storyTab} ${activeStoryTab === 'questions' ? styles.storyTabActive : ''}`}
                                            title={intl.formatMessage({ id: 'flashcards.sessionQuestions' })}
                                        >
                                            <MessageSquare size={18} />
                                        </button>
                                    </div>
                                    {generatedText && !isGeneratingText && (
                                        <button
                                            onClick={handleRetryGeneration}
                                            className={styles.storyActionBtn}
                                            title={intl.formatMessage({ id: 'flashcards.regenerate', defaultMessage: 'Regenerate' })}
                                            aria-label="Regenerate story"
                                        >
                                            <RotateCcw size={16} />
                                        </button>
                                    )}
                                </div>

                                {isGeneratingText ? (
                                    <div className={styles.storyLoadingContainer}>
                                        <div className={styles.storyLoadingHeader}>
                                            <Sparkles size={18} className={styles.spinningIcon} />
                                            <span>
                                                {intl.formatMessage({ id: 'flashcards.generatingStory', defaultMessage: "Generating story..." })}
                                            </span>
                                        </div>
                                        <div className={styles.pulseContainer}>
                                            <div className={styles.pulseLine} style={{ width: '100%' }}></div>
                                            <div className={styles.pulseLine} style={{ width: '88%' }}></div>
                                            <div className={styles.pulseLine} style={{ width: '92%' }}></div>
                                            <div className={styles.pulseLine} style={{ width: '65%' }}></div>
                                        </div>
                                    </div>
                                ) : generationError && !generatedText ? (
                                    <div className={styles.storyErrorContainer}>
                                        <div className={styles.storyErrorIconWrapper}>
                                            <AlertCircle size={24} className={styles.storyErrorIcon} />
                                        </div>
                                        <h3 className={styles.storyErrorTitle}>
                                            {intl.formatMessage({ id: 'flashcards.generationErrorTitle', defaultMessage: 'Story generation unavailable' })}
                                        </h3>
                                        <p className={styles.storyErrorText}>
                                            {intl.formatMessage({ id: 'flashcards.generationError', defaultMessage: 'Could not generate story with current AI providers. You can try again or proceed.' })}
                                        </p>
                                        <div style={{ display: 'flex', gap: '10px', marginTop: '12px', justifyContent: 'center' }}>
                                            <button
                                                onClick={handleRetryGeneration}
                                                className={styles.storyRetryButton}
                                            >
                                                <RotateCcw size={16} />
                                                <span>{intl.formatMessage({ id: 'flashcards.retry', defaultMessage: 'Try again' })}</span>
                                            </button>
                                            <button
                                                onClick={() => setCompletionStage('finished')}
                                                className={styles.storyRetryButton}
                                                style={{ background: 'rgba(255, 255, 255, 0.08)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                                            >
                                                <span>{intl.formatMessage({ id: 'flashcards.continue', defaultMessage: 'Continue' })}</span>
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={styles.storyText}>
                                        {activeStoryTab === 'original' && (
                                            <div dangerouslySetInnerHTML={{
                                                __html: highlightText(generatedText) || ''
                                            }} />
                                        )}
                                        {activeStoryTab === 'fluent' && (
                                            <div dangerouslySetInnerHTML={{
                                                __html: highlightText(fluentStory || generatedText) || ''
                                            }} />
                                        )}
                                        {activeStoryTab === 'questions' && (
                                            <div className={styles.questionsList}>
                                                {sessionQuestions ? sessionQuestions.split('\n').filter(q => q.trim()).map((q, i) => (
                                                    <div
                                                        key={i}
                                                        className={styles.questionItem}
                                                        dangerouslySetInnerHTML={{ __html: highlightText(q.trim()) }}
                                                    />
                                                )) : (
                                                    <div className={styles.emptyQuestionsHint}>
                                                        {intl.formatMessage({ id: 'flashcards.noQuestions', defaultMessage: 'No practice questions available for this session.' })}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => setCompletionStage('finished')}
                                className={styles.primaryButton}
                                style={{ marginTop: '1rem' }}
                            >
                                <span>{intl.formatMessage({ id: 'flashcards.iNotedIt' })}</span>
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className={styles.completionContainer}>
                        <div className={styles.completionContent}>
                            <div className={styles.completionIcon}>
                                <svg className={styles.checkIcon} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h2 className={styles.completionTitle}>
                                {intl.formatMessage({ id: 'flashcards.allCardsReviewed' })}
                            </h2>
                            <p className={styles.completionDescription}>
                                {intl.formatMessage({ id: 'flashcards.greatJob' })}
                            </p>

                            <button
                                onClick={handleRefresh}
                                disabled={loading}
                                className={styles.refreshButton}
                            >
                                <RefreshCw className={`${styles.refreshIcon} ${loading ? styles.spinning : ''}`} />
                                {loading ? intl.formatMessage({ id: 'flashcards.studyingMore' }) : intl.formatMessage({ id: 'flashcards.studyMore' })}
                            </button>

                            {onStartActivePractice && sessionWords.length > 0 && (
                                <button
                                    onClick={() => onStartActivePractice(sessionWords)}
                                    className={styles.primaryButton}
                                    style={{ marginTop: '12px', background: 'linear-gradient(135deg, #f0c674, #e6b800)', color: '#0d0c0b' }}
                                >
                                    <Sparkles size={16} />
                                    <span>Practice these {sessionWords.length} words actively</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}
            {tooltipState && createPortal(
                <div
                    className={styles.wordTooltip}
                    style={{
                        left: tooltipState.x,
                        top: tooltipState.y
                    }}
                >
                    {tooltipState.text}
                </div>,
                document.body
            )}
        </div>
            </div>
        </div>
    );
};

export default FlashcardsGame;