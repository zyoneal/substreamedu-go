import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Layout from 'lucide-react/dist/esm/icons/layout';
import Languages from 'lucide-react/dist/esm/icons/languages';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import MessageSquare from 'lucide-react/dist/esm/icons/message-square';
import Check from 'lucide-react/dist/esm/icons/check';
import AlertCircle from 'lucide-react/dist/esm/icons/alert-circle';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';

import { DictionaryService } from '../../services/DictionaryService';
import { LanguageContext } from '../LanguageContext';
import { useTTS } from '../../hooks/useTTS';
import Flashcard from './Flashcard';
import { useFlashcardsSession, DictionaryItem, Rating } from './hooks/useFlashcardsSession';
import { useFlashcardsKeyboard } from './hooks/useFlashcardsKeyboard';
import { highlightStoryText, decodeHtmlEntities } from './utils/storyHighlightUtils';
import styles from './Flashcards.module.css';

export type { DictionaryItem, Rating };

export interface FlashcardsProps {
    onStartActivePractice?: (words: Array<{ word: string; translation?: string; definition?: string; context?: string }>) => void;
}

const FlashcardsGame: React.FC<FlashcardsProps> = ({ onStartActivePractice }) => {
    const intl = useIntl();
    const navigate = useNavigate();
    const { play: playTTS, playingItemId } = useTTS();
    const { learningLanguage, fluentLanguage } = useContext(LanguageContext);

    // 1. Session Domain Hook (Humble Object pattern)
    const {
        reviewWords,
        currentWord,
        currentIndex,
        revealLevel,
        loading,
        totalDictionarySize,
        initialCardsCount,
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
        nextCard,
        prevCard,
        handleRefresh,
        handleFinishEarly,
        handleContinueCheckpoint,
        setCompletionStage,
        setRevealLevel,
    } = useFlashcardsSession();

    // 2. Keyboard Navigation Hook
    useFlashcardsKeyboard({
        enabled: !loading && !showCheckpoint && completionStage === 'learning',
        currentIndex,
        totalCards: reviewWords.length,
        revealLevel,
        currentCard: currentWord,
        isInFlight: currentWord ? isCardInFlight(currentWord.id) : false,
        onPrevCard: prevCard,
        onNextCard: nextCard,
        onRevealNext: revealNext,
        onRateAgain: () => handleRating('again'),
        onRateGood: () => handleRating('good'),
    });

    // 3. Audio & Gesture Auto-Unlock
    const [hasStarted, setHasStarted] = useState(false);
    useEffect(() => {
        if (hasStarted) return;
        const start = () => setHasStarted(true);
        window.addEventListener('pointerdown', start, { once: true });
        window.addEventListener('keydown', start, { once: true });
        return () => {
            window.removeEventListener('pointerdown', start);
            window.removeEventListener('keydown', start);
        };
    }, [hasStarted]);

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

    // 4. AI Story Generation State
    const [generatedText, setGeneratedText] = useState<string | null>(null);
    const [fluentStory, setFluentStory] = useState<string | null>(null);
    const [sessionQuestions, setSessionQuestions] = useState<string | null>(null);
    const [isGeneratingText, setIsGeneratingText] = useState(false);
    const [generationError, setGenerationError] = useState<string | null>(null);
    const [activeStoryTab, setActiveStoryTab] = useState<'original' | 'fluent' | 'questions'>('original');
    const hasTriggeredGeneration = useRef(false);

    const handleGenerateStory = useCallback(async () => {
        if (sessionWords.length === 0 || loading || isGeneratingText) return;

        hasTriggeredGeneration.current = true;
        setIsGeneratingText(true);
        setGenerationError(null);

        try {
            const apiWords = sessionWords.map(w => ({
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
        } catch (error: unknown) {
            console.error('Failed to generate session content:', error);
            const message = error instanceof Error ? error.message : 'Failed to generate session content';
            setGenerationError(message);
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
        if (
            completionStage === 'story' &&
            sessionWords.length > 0 &&
            !generatedText &&
            !isGeneratingText &&
            !loading &&
            !hasTriggeredGeneration.current &&
            !generationError
        ) {
            handleGenerateStory();
        }
    }, [completionStage, sessionWords.length, generatedText, isGeneratingText, loading, generationError, handleGenerateStory]);

    // 5. Interactive Tooltip Handling
    const [tooltipState, setTooltipState] = useState<{ text: string; x: number; y: number } | null>(null);

    const highlightText = useCallback((text: string | null) => {
        return highlightStoryText(text, sessionWords, styles.dictionaryWord);
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

                    if ('touches' in e && e.touches.length > 0) {
                        const touch = e.touches[0];
                        x = touch.pageX;
                        y = touch.pageY - 60;
                    }

                    setTooltipState({ text: translation, x, y });
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

    const redirectToYouglish = (word: string) => {
        const youglishURL = `https://youglish.com/pronounce/${word}/english`;
        window.open(youglishURL, '_blank');
    };

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
        enter: (dir: number) => ({
            x: dir > 0 ? 40 : -40,
            opacity: 0,
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1,
        },
        exit: (dir: number) => ({
            zIndex: 0,
            x: dir < 0 ? 40 : -40,
            opacity: 0,
        })
    };

    const progressPercent = sessionTotal > 0 ? Math.min(100, (goodIds.size / sessionTotal) * 100) : 0;

    return (
        <div className={styles.pageContainer}>
            <div className={styles.ambientGlow} />
            <div className={`${styles.ambientGlow} ${styles.ambientGlowSecond}`} />

            <div className={styles.content}>
                <div className="flex flex-col flex-1 items-center justify-start pt-28 pb-4">
                    {showCheckpoint ? (
                        <div className={styles.completionContainer}>
                            <div className={styles.checkpointContent}>
                                <h2 className={styles.checkpointTitle}>
                                    {intl.formatMessage({ id: 'flashcards.checkpointTitle', defaultMessage: '{count} cards done' }, { count: ratingsCount })}
                                </h2>
                                <p className={styles.checkpointDescription}>
                                    {intl.formatMessage({ id: 'flashcards.checkpointDescription', defaultMessage: 'Nice work. You can stop here and the rest will wait for you, or keep going.' })}
                                </p>
                                <div className={styles.checkpointActions}>
                                    <button
                                        onClick={handleContinueCheckpoint}
                                        className={styles.primaryButton}
                                    >
                                        <span>{intl.formatMessage({ id: 'flashcards.checkpointContinue', defaultMessage: 'Keep going' })}</span>
                                    </button>
                                    <button
                                        onClick={handleFinishEarly}
                                        className={styles.refreshButton}
                                    >
                                        <span>{intl.formatMessage({ id: 'flashcards.checkpointFinish', defaultMessage: 'Finish for today' })}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : currentWord ? (
                        <div className="w-full max-w-2xl mx-auto px-6 relative perspective-1000 z-0">
                            <div className={styles.progressWrap}>
                                <div
                                    className={styles.progressTrack}
                                    role="progressbar"
                                    aria-label={intl.formatMessage({ id: 'flashcards.progressLabel', defaultMessage: 'Session progress' })}
                                    aria-valuemin={0}
                                    aria-valuemax={sessionTotal}
                                    aria-valuenow={goodIds.size}
                                >
                                    <div className={styles.progressFill} style={{ width: `${progressPercent}%` }}>
                                        {goodIds.size > 0 && <span key={goodIds.size} className={styles.progressSpark} />}
                                    </div>
                                </div>
                                {progressPercent >= 50 && progressPercent < 100 && (
                                    <p className={styles.milestone}>
                                        {intl.formatMessage({ id: 'flashcards.halfway', defaultMessage: 'Halfway there. Keep it up!' })}
                                    </p>
                                )}
                            </div>
                            <div className="grid place-items-center">
                                <AnimatePresence initial={false} custom={direction}>
                                    <motion.div
                                        key={currentWord.id}
                                        custom={direction}
                                        variants={variants}
                                        initial="enter"
                                        animate="center"
                                        exit="exit"
                                        transition={{ duration: 0.15, ease: 'easeOut' }}
                                        className="w-full col-start-1 row-start-1"
                                    >
                                        <div className="relative w-full h-full">
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
                                                onRevealNext={revealNext}
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
                                        disabled={revealLevel < 1 || isCardInFlight(currentWord.id)}
                                        className={styles.ratingButtonAgain}
                                        aria-label={intl.formatMessage({ id: 'flashcards.again', defaultMessage: 'Again' })}
                                        title="Mark as again (Shortcut: 1)"
                                    >
                                        <RefreshCw className={styles.ratingIconAgain} />
                                        <span className={styles.ratingLabel}>Again</span>
                                    </button>
                                    <button
                                        onClick={() => handleRating('good')}
                                        disabled={revealLevel < 1 || isCardInFlight(currentWord.id)}
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
                                        aria-label={`${goodIds.size} of ${sessionTotal}`}
                                    >
                                        {goodIds.size} / {sessionTotal}
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
                                        <div className={styles.storyTabs} role="tablist">
                                            <button
                                                onClick={() => setActiveStoryTab('original')}
                                                className={`${styles.storyTab} ${activeStoryTab === 'original' ? styles.storyTabActive : ''}`}
                                                title={intl.formatMessage({ id: 'flashcards.originalStory' })}
                                                aria-label="Native Integration"
                                                role="tab"
                                                aria-selected={activeStoryTab === 'original'}
                                            >
                                                <Languages size={18} />
                                            </button>
                                            <button
                                                onClick={() => setActiveStoryTab('fluent')}
                                                className={`${styles.storyTab} ${activeStoryTab === 'fluent' ? styles.storyTabActive : ''}`}
                                                title={intl.formatMessage({ id: 'flashcards.fluentStory' })}
                                                aria-label="Dual-Language Mastery"
                                                role="tab"
                                                aria-selected={activeStoryTab === 'fluent'}
                                            >
                                                <Sparkles size={18} />
                                            </button>
                                            <button
                                                onClick={() => setActiveStoryTab('questions')}
                                                className={`${styles.storyTab} ${activeStoryTab === 'questions' ? styles.storyTabActive : ''}`}
                                                title={intl.formatMessage({ id: 'flashcards.sessionQuestions' })}
                                                aria-label="Speaking Practice"
                                                role="tab"
                                                aria-selected={activeStoryTab === 'questions'}
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
                                    <span>{generatedText ? intl.formatMessage({ id: 'flashcards.iNotedIt' }) : intl.formatMessage({ id: 'flashcards.skip', defaultMessage: 'Skip' })}</span>
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
                                    {Math.max(initialCardsCount, answeredIds.size) > 0 && sessionWords.length > 0
                                        ? intl.formatMessage({ id: 'flashcards.sessionSummary', defaultMessage: "Great job today! You've reviewed {cards} cards across {words} unique words." }, { cards: Math.max(initialCardsCount, answeredIds.size), words: sessionWords.length })
                                        : intl.formatMessage({ id: 'flashcards.greatJob' })}
                                </p>

                                <div className={styles.completionActions}>
                                    {onStartActivePractice && sessionWords.length > 0 && (
                                        <button
                                            onClick={() => onStartActivePractice(sessionWords)}
                                            className={styles.activePracticeButton}
                                        >
                                            <Sparkles size={16} />
                                            <span>{intl.formatMessage({ id: 'flashcards.practiceActively', defaultMessage: 'Practice these {count} words actively' }, { count: sessionWords.length })}</span>
                                        </button>
                                    )}

                                    <button
                                        onClick={handleRefresh}
                                        disabled={loading}
                                        className={styles.refreshButton}
                                    >
                                        <RefreshCw className={`${styles.refreshIcon} ${loading ? styles.spinning : ''}`} />
                                        <span>{loading ? intl.formatMessage({ id: 'flashcards.studyingMore' }) : intl.formatMessage({ id: 'flashcards.studyMore' })}</span>
                                    </button>
                                </div>
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