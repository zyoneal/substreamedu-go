import React, { useState, useEffect, useContext, useMemo } from 'react';
import { Sparkles, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { DetectedGrammarPoint, getNativeExplanation } from '../../../utils/grammarDetector';
import { DictionaryService, AnalyzeGrammarResponse } from '../../../services/DictionaryService';
import { LanguageContext } from '../../LanguageContext';
import styles from './GrammarSpotlightModal.module.css';

interface GrammarSpotlightModalProps {
  isOpen: boolean;
  onClose: () => void;
  grammarPoint: DetectedGrammarPoint | null;
  fullSentence: string;
  learningLanguage?: string;
  fluentLanguage?: string;
}

export const GrammarSpotlightModal: React.FC<GrammarSpotlightModalProps> = ({
  isOpen,
  onClose,
  grammarPoint,
  fullSentence,
  learningLanguage = 'en',
  fluentLanguage = 'ru'
}) => {
  const { fluentLanguage: contextFluentLanguage } = useContext(LanguageContext);
  const activeFluentLanguage =
    contextFluentLanguage ||
    (typeof window !== 'undefined' ? localStorage.getItem('fluentLanguage') || localStorage.getItem('fluent_language') : null) ||
    fluentLanguage ||
    'ru';
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [isDeepDiving, setIsDeepDiving] = useState(false);
  const [deepDiveData, setDeepDiveData] = useState<AnalyzeGrammarResponse | null>(null);

  const quizOptions = useMemo(() => {
    if (!grammarPoint?.miniQuiz?.options) return [];
    const arr = [...grammarPoint.miniQuiz.options];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }, [grammarPoint]);

  useEffect(() => {
    if (isOpen) {
      setSelectedOption(null);
      setIsCorrect(null);
      setIsDeepDiving(false);
      setDeepDiveData(null);
    }
  }, [isOpen, grammarPoint]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !grammarPoint) {
    return null;
  }

  const handleOptionClick = (option: string) => {
    setSelectedOption(option);
    const correct = option === grammarPoint.miniQuiz.answer;
    setIsCorrect(correct);
  };

  const handleDeepDive = async () => {
    if (isDeepDiving) return;
    setIsDeepDiving(true);
    try {
      const response = await DictionaryService.analyzeGrammar({
        sentence: fullSentence,
        ruleHint: grammarPoint.tag,
        learningLanguage,
        fluentLanguage: activeFluentLanguage
      });
      if (response) {
        setDeepDiveData(response);
      }
    } catch (err) {
      console.error('Failed to deep dive into grammar', err);
    } finally {
      setIsDeepDiving(false);
    }
  };

  const nativeExplanationText = grammarPoint
    ? (getNativeExplanation(grammarPoint.tag, activeFluentLanguage) || grammarPoint.nativeExplanation)
    : '';

  // Split sentence around the matched grammar pattern for optical highlight
  const renderHighlightedSentence = () => {
    const text = fullSentence.trim();
    const match = grammarPoint.matchedText;
    const idx = text.toLowerCase().indexOf(match.toLowerCase());

    if (idx === -1) {
      return <span>{text}</span>;
    }

    const before = text.slice(0, idx);
    const highlighted = text.slice(idx, idx + match.length);
    const after = text.slice(idx + match.length);

    return (
      <>
        {before}
        <span className={styles.highlight}>{highlighted}</span>
        {after}
      </>
    );
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.iconWrapper}>
              <Sparkles size={18} />
            </div>
            <h3 className={styles.title}>{grammarPoint.name}</h3>
            <span className={styles.cefrPill}>{grammarPoint.cefrLevel}</span>
          </div>
          <button
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className={styles.content}>
          {/* Subtitle Quote Box */}
          <div className={styles.quoteCard}>
            <div className={styles.quoteLabel}>Spoken in Video</div>
            <p className={styles.quoteText}>{renderHighlightedSentence()}</p>
          </div>

          {/* Formula */}
          <div className={styles.formulaSection}>
            <div className={styles.formulaLabel}>Structure Formula</div>
            <div className={styles.formulaPill}>{grammarPoint.formula}</div>
            {grammarPoint.formulaNote && (
              <div className={styles.formulaNote}>{grammarPoint.formulaNote}</div>
            )}
          </div>

          {/* Explanations */}
          <div className={styles.explanations}>
            <p className={styles.explanationMain}>{grammarPoint.explanation}</p>
            {nativeExplanationText && (
              <p className={styles.explanationNative}>{nativeExplanationText}</p>
            )}
          </div>

          {/* 1-Question Interactive Check */}
          <div className={styles.quizSection}>
            <div className={styles.quizHeader}>
              <span className={styles.quizTitle}>Quick Knowledge Check</span>
            </div>
            <p className={styles.quizPrompt}>{grammarPoint.miniQuiz.question}</p>
            <div className={styles.optionsGrid}>
              {quizOptions.map((opt, i) => {
                const isSelected = selectedOption === opt;
                let optClass = styles.optionButton;
                if (isSelected) {
                  optClass += isCorrect ? ` ${styles.selectedCorrect}` : ` ${styles.selectedIncorrect}`;
                }
                return (
                  <button
                    key={i}
                    className={optClass}
                    onClick={() => handleOptionClick(opt)}
                  >
                    <span>{opt}</span>
                    {isSelected && isCorrect && <Check size={16} />}
                    {isSelected && !isCorrect && <AlertCircle size={16} />}
                  </button>
                );
              })}
            </div>

            {selectedOption !== null && (
              <div
                className={`${styles.quizFeedback} ${
                  isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect
                }`}
              >
                {isCorrect ? (
                  <>
                    <Check size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Spot on!</strong> {grammarPoint.miniQuiz.explanation}
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>
                      <strong>Not quite.</strong> {grammarPoint.miniQuiz.hint}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* AI Deep Dive Result */}
          {deepDiveData && (
            <div className={styles.aiDeepDiveSection}>
              <div className={styles.aiDeepDiveCard}>
                <div className={styles.aiDeepDiveTitle}>
                  <Sparkles size={14} />
                  <span>AI Linguistic Breakdown</span>
                </div>
                <p className={styles.aiDeepDiveText}>{deepDiveData.explanation}</p>
                {deepDiveData.nativeExplanation && (
                  <p className={styles.explanationNative}>{deepDiveData.nativeExplanation}</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          {!deepDiveData ? (
            <button
              className={styles.aiButton}
              onClick={handleDeepDive}
              disabled={isDeepDiving}
              title="Request deep linguistic AI analysis for this sentence"
            >
              {isDeepDiving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>AI Breakdown</span>
                </>
              )}
            </button>
          ) : (
            <div />
          )}

          <button className={styles.gotItButton} onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
