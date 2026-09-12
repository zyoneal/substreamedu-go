import React from 'react';

import PlayIcon from 'lucide-react/dist/esm/icons/play';
import { useIntl } from 'react-intl';
import styles from './Flashcard.module.css';

interface FlashcardProps {
  word: string;
  transcription?: string;
  definition?: string;
  translatedText?: string;
  context?: string;
  imageUrl?: string;
  revealLevel: 0 | 1 | 2 | 3;
  cardType?: number;
  isPlaying?: boolean;
  onRevealNext: () => void;
  onPlayPronunciation: () => void;
  onWordClick: () => void;
}

const Flashcard: React.FC<FlashcardProps> = ({
  word,
  transcription,
  definition,
  translatedText,
  context,
  imageUrl,
  revealLevel,
  cardType = 0,
  isPlaying = false,
  onRevealNext,
  onPlayPronunciation,
  onWordClick,
}) => {
  const intl = useIntl();



  
  const wordToGaps = (text: string): string => {
    return text.replace(/[^\s]/g, '_');
  };

  
  const getProcessedContext = (forceShowWord = false) => {
    if (!context || !word) {
      return { __html: '' };
    }

    const cleanContext = context
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();

    if (!cleanContext) {
      return { __html: '' };
    }

    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedWord})`, 'gi');

    if (forceShowWord || revealLevel >= 1) {
      // Word revealed - show highlighted
      const highlighted = cleanContext.replace(regex, '<strong class="' + styles.contextHighlight + '">$1</strong>');
      return { __html: `"${highlighted}"` };
    } else {
      // Word hidden - show gaps
      const gaps = wordToGaps(word);
      const withGaps = cleanContext.replace(regex, '<span class="' + styles.contextGap + '">' + gaps + '</span>');
      return { __html: `"${withGaps}"` };
    }
  };

  const isProduction = cardType === 1;
  const isRevealed = revealLevel >= 1;



  const renderDefinitionTranslation = () => {
    const hasDef = definition && definition.trim();
    const hasTrans = translatedText && translatedText.trim();
    if (!hasDef && !hasTrans) return <h2 className={styles.definition}>—</h2>;

    return (
      <h2 className={styles.definition}>
        {hasDef && hasTrans ? `${definition} (${translatedText})` : (hasDef || translatedText)}
      </h2>
    );
  };

  const handleContextClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains(styles.contextHighlight)) {
      onWordClick();
    }
  };

  const renderFrontContent = () => {
    const contextContent = context && (
      <div className={styles.contextSection} onClick={handleContextClick}>
        <p className={styles.context} dangerouslySetInnerHTML={getProcessedContext(true)} />
      </div>
    );

    if (isProduction) {
      return (
        <>
          {renderDefinitionTranslation()}
        </>
      );
    }
    return (
      <>
        <div className={styles.wordSection}>
          <h1 className={styles.word} onClick={onWordClick}>{word}</h1>
          {transcription && <p className={styles.transcription}>[{transcription}]</p>}
          {word.trim() && (
            <button
              onClick={onPlayPronunciation}
              className={`${styles.playButton} ${isPlaying ? styles.playing : ''}`}
              disabled={isPlaying}
            >
              <PlayIcon className={styles.playIcon} />
            </button>
          )}
        </div>
        {contextContent}
      </>
    );
  };

  const renderBackContent = () => {
    const contextContent = context && (
      <div className={styles.contextSection} onClick={handleContextClick}>
        <p className={styles.context} dangerouslySetInnerHTML={getProcessedContext(true)} />
      </div>
    );

    return (
      <div className={styles.backContent}>
        {!isProduction && renderDefinitionTranslation()}
        {isProduction && (
          <div className={styles.wordSection}>
            <h1 className={styles.word} onClick={onWordClick}>{word}</h1>
            {transcription && <p className={styles.transcription}>[{transcription}]</p>}
            {word.trim() && (
              <button
                onClick={onPlayPronunciation}
                className={`${styles.playButton} ${isPlaying ? styles.playing : ''}`}
                disabled={isPlaying}
              >
                <PlayIcon className={styles.playIcon} />
              </button>
            )}
          </div>
        )}

        {isProduction && contextContent}

        {imageUrl && (
          <div className={styles.imageSection}>
            <img src={imageUrl} alt={word} className={styles.image} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.ankiCard}>
      <div className={styles.frontSide}>
        {renderFrontContent()}
      </div>

      {!isRevealed ? (
        <div className={styles.revealHint} onClick={onRevealNext}>
          <p className={styles.hintText}>
            {intl.formatMessage({ id: 'flashcards.tapToReveal', defaultMessage: 'Tap to reveal' })}
          </p>
        </div>
      ) : (
        <>
          <hr className={styles.divider} />
          <div className={styles.backSide}>
            {renderBackContent()}
          </div>
        </>
      )}
    </div>
  );
};

export default Flashcard;