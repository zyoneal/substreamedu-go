import React from 'react';
import { Volume2, Folder, Edit, Trash2 } from 'lucide-react';
import { DictionaryItem, getHighlightedParts } from '../utils/dictionaryUtils';
import styles from '../DictionaryPage.module.css';

export interface DictionaryWordCardProps {
    word: DictionaryItem;
    index: number;
    onEdit: (word: DictionaryItem) => void;
    onDelete: (resourceName: string, id: number) => void;
    onListen: (text: string) => void;
}

export const DictionaryWordCard: React.FC<DictionaryWordCardProps> = ({
    word,
    index,
    onEdit,
    onDelete,
    onListen,
}) => {
    const getMasteryBadge = () => {
        if (word.mastered) {
            return <span className={`${styles.masteryBadge} ${styles.masteredBadge}`}>Mastered</span>;
        }
        if (word.reviewCount && word.reviewCount > 5) {
            return <span className={`${styles.masteryBadge} ${styles.advancedBadge}`}>Advanced</span>;
        }
        if (word.reviewCount && word.reviewCount > 2) {
            return <span className={`${styles.masteryBadge} ${styles.intermediateBadge}`}>Reviewing</span>;
        }
        return <span className={`${styles.masteryBadge} ${styles.beginnerBadge}`}>New</span>;
    };

    const definition = word.definition?.trim();
    const translation = word.translatedText?.trim();
    const rawTranscription = word.transcription?.trim();
    const cleanTranscription = rawTranscription
        ? rawTranscription.replace(/^[/\[\s]+|[/\]\s]+$/g, '').trim()
        : '';

    return (
        <div
            key={word.id || `word-${index}`}
            className={styles.wordCard}
        >
            {/* Column 1: Word, Audio, Meaning */}
            <div className={styles.wordPrimaryCol}>
                <div className={styles.wordTitleRow}>
                    <button
                        onClick={() => onListen(word.highlightedText || '')}
                        className={styles.wordClickableTitle}
                        title="Listen to pronunciation on YouGlish"
                        aria-label="Listen to pronunciation on YouGlish"
                    >
                        <span>{word.highlightedText || 'Untitled Word'}</span>
                        <Volume2 className={styles.soundWaveIcon} />
                    </button>
                    {cleanTranscription && (
                        <span className={styles.wordTranscription}>
                            [{cleanTranscription}]
                        </span>
                    )}
                </div>

                <div className={styles.wordDefinitionBox}>
                    <div className="flex flex-col gap-1 min-w-0">
                        {definition && (
                            <p className={styles.wordDefinitionText}>
                                {definition}
                            </p>
                        )}
                        {translation && translation !== definition && (
                            <p className={styles.wordTranslationText}>
                                {translation}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* Column 2: Context Quote & Tags */}
            <div className={styles.wordContextCol}>
                {word.context && word.context.trim().toLowerCase() !== (word.highlightedText || '').trim().toLowerCase() && (
                    <div className={styles.contextQuoteBox}>
                        {getHighlightedParts(word.context, word.highlightedText || '', styles.contextHighlight)}
                    </div>
                )}

                {word.tags && word.tags.length > 0 && (
                    <div className={styles.wordTagsRow}>
                        {word.tags.slice(0, 4).map((tag, tagIdx) => (
                            <span key={tagIdx} className={styles.tagPill}>
                                #{tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Column 3: Mastery & Actions */}
            <div className={styles.wordActionsCol}>
                <div className="flex items-center gap-2">
                    {getMasteryBadge()}
                </div>

                <span className={styles.sourcePill}>
                    <Folder size={11} />
                    <span>{word.resourceName || 'vault'}</span>
                </span>

                <div className={styles.actionButtonsGroup}>
                    <button
                        className={styles.actionIconBtn}
                        onClick={() => onEdit(word)}
                        title="Edit word"
                        aria-label="Edit word"
                    >
                        <Edit size={13} />
                    </button>
                    <button
                        className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                        onClick={() => onDelete(word.resourceName, word.id)}
                        title="Delete word"
                        aria-label="Delete word"
                    >
                        <Trash2 size={13} />
                    </button>
                </div>
            </div>
        </div>
    );
};
