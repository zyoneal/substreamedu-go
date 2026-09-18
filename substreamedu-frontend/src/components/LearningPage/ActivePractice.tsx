import React, { useState, useEffect, useRef, useCallback, useContext } from 'react';
import { useIntl } from 'react-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Volume2, Sparkles, Check, X, ArrowRight, Lightbulb, RotateCcw, PenTool, Layers, BookOpen, Flame } from 'lucide-react';
import { DictionaryService, PracticeExercise, EvaluateSentenceResult } from '../../services/DictionaryService';
import { LanguageContext } from '../LanguageContext';
import { useTTS } from '../../hooks/useTTS';
import styles from './ActivePractice.module.css';

interface PracticeWord {
    word: string;
    translation?: string;
    definition?: string;
    context?: string;
}

interface ActivePracticeProps {
    initialWords?: PracticeWord[];
    onBackToFlashcards?: () => void;
}

type PracticeMode = 'gap_fill' | 'sentence_builder';

export const ActivePractice: React.FC<ActivePracticeProps> = ({
    initialWords,
    onBackToFlashcards
}) => {
    const intl = useIntl();
    const { learningLanguage, fluentLanguage } = useContext(LanguageContext);
    const { play: playTTS } = useTTS();

    const [practiceWords, setPracticeWords] = useState<PracticeWord[]>(initialWords || []);
    const [loadingWords, setLoadingWords] = useState(false);
    const [exercises, setExercises] = useState<PracticeExercise[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [activeMode, setActiveMode] = useState<PracticeMode>('gap_fill');

    // Gap fill state
    const [userAnswer, setUserAnswer] = useState('');
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [isAnswerChecked, setIsAnswerChecked] = useState(false);
    const [isAnswerCorrect, setIsAnswerCorrect] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [inputMode, setInputMode] = useState<'type' | 'options'>('type');

    // Sentence builder state
    const [userSentence, setUserSentence] = useState('');
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [evalResult, setEvalResult] = useState<EvaluateSentenceResult | null>(null);

    // Stats
    const [correctCount, setCorrectCount] = useState(0);
    const [streak, setStreak] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);

    // 1. Load words if not provided
    useEffect(() => {
        if (initialWords && initialWords.length > 0) {
            setPracticeWords(initialWords);
            return;
        }

        setLoadingWords(true);
        DictionaryService.fetchDictionaryItemsByUser()
            .then(items => {
                if (Array.isArray(items) && items.length > 0) {
                    const mapped: PracticeWord[] = items.slice(0, 15).map(item => ({
                        word: item.highlightedText || '',
                        translation: item.translatedText || '',
                        definition: item.definition || '',
                        context: item.context || ''
                    })).filter(w => w.word.trim().length > 0);
                    setPracticeWords(mapped);
                }
            })
            .catch(err => {
                console.error("Failed to load user dictionary for practice:", err);
            })
            .finally(() => {
                setLoadingWords(false);
            });
    }, [initialWords]);

    // 2. Generate exercises whenever practiceWords changes
    useEffect(() => {
        if (practiceWords.length === 0) return;

        // Instant algorithmic cloze generation for instant UI readiness
        const initialExercises: PracticeExercise[] = practiceWords.map((item, idx) => {
            const target = item.word.trim();
            const ctxText = (item.context || '').trim();
            let prompt = `She decided to ______ before making a final choice.`;
            let before = 'She decided to ';
            let after = ' before making a final choice.';

            if (ctxText && ctxText.toLowerCase().includes(target.toLowerCase())) {
                const targetIdx = ctxText.toLowerCase().indexOf(target.toLowerCase());
                before = ctxText.slice(0, targetIdx);
                after = ctxText.slice(targetIdx + target.length);
                prompt = `${before}______${after}`;
            }

            // Distractors
            const otherWords = practiceWords
                .map(w => w.word.trim())
                .filter(w => w && w.toLowerCase() !== target.toLowerCase());
            const options = [target];
            for (const ow of otherWords) {
                if (options.length < 4) options.push(ow);
            }
            const defaultDistractors = ['take over', 'look after', 'run into', 'set up', 'stand by'];
            for (const d of defaultDistractors) {
                if (options.length >= 4) break;
                if (!options.includes(d) && d !== target) options.push(d);
            }

            // Shuffle options
            const shuffledOptions = [...options].sort(() => Math.random() - 0.5);

            return {
                id: `ex_${idx + 1}`,
                type: 'gap_fill',
                target_word: target,
                prompt,
                sentence_before: before,
                sentence_after: after,
                hint: item.translation || item.definition || 'Target word',
                options: shuffledOptions,
                accepted_answers: [target, target.toLowerCase()],
                explanation: item.definition || `Contextual usage of "${target}"`
            };
        });

        setExercises(initialExercises);
        setCurrentIndex(0);
        setIsCompleted(false);

        // Enhance with server-side AI exercises asynchronously
        const apiPayload = practiceWords.map(w => ({
            word: w.word,
            meaning: w.translation || w.definition || '',
            context: w.context || ''
        }));

        DictionaryService.generatePracticeExercises(
            apiPayload,
            learningLanguage || 'en',
            fluentLanguage || 'ru'
        )?.then(resp => {
            if (resp && resp.exercises && resp.exercises.length > 0) {
                setExercises(resp.exercises);
            }
        })?.catch(err => {
            // Silently fall back to algorithmic exercises already set
            console.log("Using algorithmic exercises (AI generator skipped):", err);
        });
    }, [practiceWords, learningLanguage, fluentLanguage]);

    // Reset input state when moving to next exercise
    const resetCardState = useCallback(() => {
        setUserAnswer('');
        setSelectedOption(null);
        setIsAnswerChecked(false);
        setIsAnswerCorrect(false);
        setShowHint(false);
        setUserSentence('');
        setEvalResult(null);
        setIsEvaluating(false);

        setTimeout(() => {
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }, 100);
    }, []);

    const currentExercise = exercises[currentIndex];
    const currentWordItem = practiceWords[currentIndex];

    // Gap Fill Checking
    const handleCheckGapFill = useCallback(() => {
        if (!currentExercise || isAnswerChecked) return;

        const cleanUser = (selectedOption || userAnswer).trim().toLowerCase();
        if (!cleanUser) return;

        const accepted = currentExercise.accepted_answers.map(a => a.trim().toLowerCase());
        const isCorrect = accepted.some(ans => cleanUser === ans || cleanUser.includes(ans) || ans.includes(cleanUser));

        setIsAnswerCorrect(isCorrect);
        setIsAnswerChecked(true);

        if (isCorrect) {
            setCorrectCount(prev => prev + 1);
            setStreak(prev => prev + 1);
        } else {
            setStreak(0);
        }
    }, [currentExercise, isAnswerChecked, selectedOption, userAnswer]);

    // Sentence Builder Evaluation
    const handleEvaluateSentence = useCallback(async () => {
        if (!currentWordItem || !userSentence.trim() || isEvaluating) return;

        setIsEvaluating(true);
        try {
            const res = await DictionaryService.evaluateSentence(
                currentWordItem.word,
                currentWordItem.translation || currentWordItem.definition || '',
                userSentence.trim(),
                learningLanguage || 'en'
            );
            setEvalResult(res);
            if (res && res.is_correct) {
                setCorrectCount(prev => prev + 1);
                setStreak(prev => prev + 1);
            }
        } catch (err) {
            console.error("Sentence evaluation failed:", err);
            // Fallback client-side check
            const hasWord = userSentence.toLowerCase().includes(currentWordItem.word.toLowerCase());
            setEvalResult({
                is_correct: hasWord,
                status: hasWord ? 'natural' : 'minor_issues',
                feedback: hasWord
                    ? `Great job! Your sentence includes "${currentWordItem.word}".`
                    : `Make sure your sentence clearly contains the target word "${currentWordItem.word}".`,
                improved_version: userSentence
            });
        } finally {
            setIsEvaluating(false);
        }
    }, [currentWordItem, userSentence, isEvaluating, learningLanguage]);

    const handleNext = useCallback(() => {
        if (currentIndex < exercises.length - 1) {
            setCurrentIndex(prev => prev + 1);
            resetCardState();
        } else {
            setIsCompleted(true);
        }
    }, [currentIndex, exercises.length, resetCardState]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (!isAnswerChecked) {
                handleCheckGapFill();
            } else {
                handleNext();
            }
        }
    };

    const handleRestart = () => {
        setCurrentIndex(0);
        setCorrectCount(0);
        setStreak(0);
        setIsCompleted(false);
        resetCardState();
    };

    const progressPct = exercises.length > 0 ? ((currentIndex) / exercises.length) * 100 : 0;

    // --- Loading State ---
    if (loadingWords) {
        return (
            <div className={styles.container}>
                <div className={styles.exerciseCard} style={{ textAlign: 'center', padding: '3rem' }}>
                    <Sparkles className="animate-spin text-amber-300 mx-auto mb-4" size={32} />
                    <p style={{ color: 'var(--color-body, #9e988f)' }}>
                        {intl.formatMessage({ id: 'practice.loading', defaultMessage: 'Loading vocabulary exercises...' })}
                    </p>
                </div>
            </div>
        );
    }

    // --- Empty State ---
    if (!loadingWords && exercises.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.completionContainer}>
                    <div className={styles.completionIcon} style={{ background: 'rgba(240, 198, 116, 0.15)', color: '#f0c674' }}>
                        <BookOpen size={32} />
                    </div>
                    <h2 className={styles.completionTitle}>
                        {intl.formatMessage({ id: 'practice.noWordsTitle', defaultMessage: 'No words to practice yet' })}
                    </h2>
                    <p className={styles.completionSubtitle}>
                        {intl.formatMessage({ id: 'practice.noWordsDesc', defaultMessage: 'Watch videos or review cards in the dictionary to build your practice list.' })}
                    </p>
                    {onBackToFlashcards && (
                        <button onClick={onBackToFlashcards} className={styles.submitButton}>
                            <span>{intl.formatMessage({ id: 'practice.goToFlashcards', defaultMessage: 'Go to Flashcards' })}</span>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // --- Completed State ---
    if (isCompleted) {
        const accuracy = exercises.length > 0 ? Math.round((correctCount / exercises.length) * 100) : 100;
        return (
            <div className={styles.container}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={styles.completionContainer}
                >
                    <div className={styles.completionIcon}>
                        <Check size={36} />
                    </div>
                    <h2 className={styles.completionTitle}>
                        {intl.formatMessage({ id: 'practice.completedTitle', defaultMessage: 'Active Practice Complete!' })}
                    </h2>
                    <p className={styles.completionSubtitle}>
                        {intl.formatMessage({ id: 'practice.completedDesc', defaultMessage: 'You actively applied your vocabulary in real contexts.' })}
                    </p>

                    <div className={styles.statsGrid}>
                        <div className={styles.statCard}>
                            <div className={styles.statVal}>{exercises.length}</div>
                            <div className={styles.statLabel}>Words Practiced</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statVal}>{accuracy}%</div>
                            <div className={styles.statLabel}>Accuracy</div>
                        </div>
                        <div className={styles.statCard}>
                            <div className={styles.statVal}>{correctCount}</div>
                            <div className={styles.statLabel}>Correct Responses</div>
                        </div>
                    </div>

                    <div className={styles.completionActions}>
                        <button onClick={handleRestart} className={styles.secondaryButton}>
                            <RotateCcw size={16} />
                            <span>{intl.formatMessage({ id: 'practice.restart', defaultMessage: 'Practice Again' })}</span>
                        </button>
                        {onBackToFlashcards && (
                            <button onClick={onBackToFlashcards} className={styles.submitButton}>
                                <span>{intl.formatMessage({ id: 'practice.backToFlashcards', defaultMessage: 'Back to SRS Cards' })}</span>
                                <ArrowRight size={16} />
                            </button>
                        )}
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Mode Switcher */}
            <div className={styles.modeNav}>
                <button
                    onClick={() => { setActiveMode('gap_fill'); resetCardState(); }}
                    className={`${styles.modeTab} ${activeMode === 'gap_fill' ? styles.modeTabActive : ''}`}
                >
                    <Layers size={15} />
                    <span>Contextual Cloze</span>
                </button>
                <button
                    onClick={() => { setActiveMode('sentence_builder'); resetCardState(); }}
                    className={`${styles.modeTab} ${activeMode === 'sentence_builder' ? styles.modeTabActive : ''}`}
                >
                    <PenTool size={15} />
                    <span>AI Sentence Builder</span>
                </button>
            </div>

            {/* Progress Header */}
            <div className={styles.progressRow}>
                <div className={styles.counterBadge}>
                    <span>{currentIndex + 1}</span> / <span>{exercises.length}</span>
                </div>
                {streak > 1 && (
                    <div className={styles.streakBadge}>
                        <Flame size={15} />
                        <span>{streak} Streak!</span>
                    </div>
                )}
            </div>

            <div className={styles.progressBarBg}>
                <div className={styles.progressBarFill} style={{ width: `${progressPct}%` }} />
            </div>

            {/* Main Interactive Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={`${activeMode}_${currentIndex}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                    className={styles.exerciseCard}
                >
                    {/* Header: Word & Audio */}
                    <div className={styles.exerciseHeader}>
                        <div className={styles.typeBadge}>
                            {activeMode === 'gap_fill' ? 'Fill the Blank' : 'Produce a Sentence'}
                        </div>
                        <div className={styles.wordBadge}>
                            <span>{currentExercise?.target_word || currentWordItem?.word}</span>
                            <button
                                onClick={() => playTTS(currentExercise?.target_word || currentWordItem?.word, currentIndex, learningLanguage || 'en')}
                                className={styles.ttsButton}
                                title="Listen to pronunciation"
                            >
                                <Volume2 size={16} />
                            </button>
                        </div>
                    </div>

                    {/* GAP FILL MODE */}
                    {activeMode === 'gap_fill' && currentExercise && (
                        <>
                            {/* Sentence Prompt */}
                            <div className={styles.promptContainer}>
                                {currentExercise.sentence_before}
                                <span className={`${styles.clozeBlank} ${
                                    isAnswerChecked
                                        ? isAnswerCorrect ? styles.clozeBlankCorrect : styles.clozeBlankIncorrect
                                        : (userAnswer || selectedOption) ? styles.clozeBlankFilled : ''
                                }`}>
                                    {isAnswerChecked
                                        ? currentExercise.target_word
                                        : (selectedOption || userAnswer || '______')}
                                </span>
                                {currentExercise.sentence_after}
                            </div>

                            {/* Hint Toggle */}
                            <div className={styles.hintToggleRow}>
                                <button
                                    onClick={() => setShowHint(prev => !prev)}
                                    className={styles.hintButton}
                                >
                                    <Lightbulb size={13} />
                                    <span>{showHint ? 'Hide Hint' : 'Show Meaning Hint'}</span>
                                </button>
                                <button
                                    onClick={() => setInputMode(prev => prev === 'type' ? 'options' : 'type')}
                                    className={styles.hintButton}
                                    style={{ marginLeft: 'auto' }}
                                >
                                    <span>Switch to {inputMode === 'type' ? 'Options' : 'Typing'}</span>
                                </button>
                            </div>

                            {showHint && currentExercise.hint && (
                                <div className={styles.hintText}>
                                    💡 {currentExercise.hint}
                                </div>
                            )}

                            {/* Input Form: Type vs Options */}
                            {!isAnswerChecked && (
                                <div className={styles.inputForm}>
                                    {inputMode === 'type' ? (
                                        <div className={styles.inputGroup}>
                                            <input
                                                ref={inputRef}
                                                type="text"
                                                value={userAnswer}
                                                onChange={e => setUserAnswer(e.target.value)}
                                                onKeyDown={handleKeyDown}
                                                placeholder="Type the missing word or phrase..."
                                                className={styles.textInput}
                                                autoFocus
                                            />
                                            <button
                                                onClick={handleCheckGapFill}
                                                disabled={!userAnswer.trim()}
                                                className={styles.submitButton}
                                            >
                                                <span>Check</span>
                                                <Check size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={styles.optionsGrid}>
                                            {currentExercise.options?.map((opt, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => setSelectedOption(opt)}
                                                    className={`${styles.optionChip} ${selectedOption === opt ? styles.modeTabActive : ''}`}
                                                >
                                                    <span>{opt}</span>
                                                </button>
                                            ))}
                                            <div style={{ gridColumn: '1 / -1', marginTop: '8px' }}>
                                                <button
                                                    onClick={handleCheckGapFill}
                                                    disabled={!selectedOption}
                                                    className={styles.submitButton}
                                                    style={{ width: '100%' }}
                                                >
                                                    <span>Confirm Selection</span>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Feedback Block */}
                            {isAnswerChecked && (
                                <div className={`${styles.feedbackCard} ${isAnswerCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect}`}>
                                    <div className={styles.feedbackHeader}>
                                        <div className={`${styles.feedbackTitle} ${isAnswerCorrect ? styles.feedbackTitleCorrect : styles.feedbackTitleIncorrect}`}>
                                            {isAnswerCorrect ? <Check size={18} /> : <X size={18} />}
                                            <span>{isAnswerCorrect ? 'Excellent! Exact match.' : `Correct answer: "${currentExercise.target_word}"`}</span>
                                        </div>
                                    </div>
                                    {currentExercise.explanation && (
                                        <div className={styles.feedbackExplanation}>
                                            {currentExercise.explanation}
                                        </div>
                                    )}
                                    <button onClick={handleNext} className={styles.nextButton} autoFocus>
                                        <span>Continue</span>
                                        <ArrowRight size={15} />
                                    </button>
                                </div>
                            )}
                        </>
                    )}

                    {/* SENTENCE BUILDER MODE */}
                    {activeMode === 'sentence_builder' && currentWordItem && (
                        <div className={styles.builderSection}>
                            <p style={{ fontSize: '15px', color: 'var(--color-ink, #ede8e0)', lineHeight: '1.5' }}>
                                Compose an original sentence using <strong>"{currentWordItem.word}"</strong>. Our AI teacher will check your grammar, naturalness, and vocabulary usage in real time.
                            </p>

                            {currentWordItem.translation && (
                                <div style={{ fontSize: '13px', color: 'var(--color-body, #9e988f)', fontStyle: 'italic' }}>
                                    Meaning: {currentWordItem.translation} {currentWordItem.definition ? `• ${currentWordItem.definition}` : ''}
                                </div>
                            )}

                            <textarea
                                value={userSentence}
                                onChange={e => setUserSentence(e.target.value)}
                                placeholder={`e.g. Write a sentence featuring "${currentWordItem.word}"...`}
                                className={styles.builderTextarea}
                                disabled={isEvaluating}
                            />

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <button
                                    onClick={handleEvaluateSentence}
                                    disabled={!userSentence.trim() || isEvaluating}
                                    className={styles.submitButton}
                                >
                                    {isEvaluating ? (
                                        <>
                                            <Sparkles className="animate-spin" size={16} />
                                            <span>Evaluating...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles size={16} />
                                            <span>Check with AI</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Evaluation Result Card */}
                            {evalResult && (
                                <div className={styles.evalCard}>
                                    <div className={styles.statusRow}>
                                        <span className={`${styles.statusPill} ${
                                            evalResult.status === 'native' ? styles.statusNative :
                                            evalResult.status === 'natural' ? styles.statusNatural :
                                            evalResult.status === 'minor_issues' ? styles.statusMinorIssues :
                                            styles.statusIncorrect
                                        }`}>
                                            {evalResult.status.replace('_', ' ')}
                                        </span>
                                    </div>
                                    <div className={styles.evalFeedback}>
                                        {evalResult.feedback}
                                    </div>
                                    {evalResult.improved_version && evalResult.improved_version !== userSentence && (
                                        <div className={styles.improvedBox}>
                                            <div className={styles.improvedLabel}>Native Polish</div>
                                            <div>"{evalResult.improved_version}"</div>
                                        </div>
                                    )}
                                    <button onClick={handleNext} className={styles.nextButton} style={{ marginTop: '10px' }}>
                                        <span>Next Word</span>
                                        <ArrowRight size={15} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default ActivePractice;
