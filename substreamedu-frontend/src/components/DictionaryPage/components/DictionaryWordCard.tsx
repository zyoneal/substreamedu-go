import React from 'react';
import { Link } from 'react-router-dom';
import { Volume2, Folder, Edit, Trash2, Clock } from 'lucide-react';
import { DictionaryItem, getHighlightedParts } from '../utils/dictionaryUtils';
import { buildVideoJumpUrl, formatTimestampSec } from '../../../utils/videoTimestampUtils';
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
    const getMasteryStatus = () => {
        if (word.mastered) {
            return { label: 'Mastered', className: styles.masteredBadge };
        }
        if (word.reviewCount && word.reviewCount > 5) {
            return { label: 'Advanced', className: styles.advancedBadge };
        }
        if (word.reviewCount && word.reviewCount > 2) {
            return { label: 'Reviewing', className: styles.intermediateBadge };
        }
        return { label: 'New', className: styles.beginnerBadge };
    };

    const mastery = getMasteryStatus();
    const definition = word.definition?.trim();
    const translation = word.translatedText?.trim();
    const rawTranscription = word.transcription?.trim();
    const cleanTranscription = rawTranscription
        ? rawTranscription.replace(/^[/\[\s]+|[/\]\s]+$/g, '').trim()
        : '';
    const hasContext = Boolean(
        word.context &&
        word.context.trim().toLowerCase() !== (word.highlightedText || '').trim().toLowerCase()
    );
    const sourceLabel = word.resourceName || 'vault';

    return (
        <article
            key={word.id || `word-${index}`}
            className={styles.wordCard}
        >
            {/* Column 1: Headword, Phonetics, Meaning */}
            <div className={styles.wordPrimaryCol}>
                <div className={styles.wordTitleRow}>
                    <button
                        type="button"
                        onClick={() => onListen(word.highlightedText || '')}
                        className={styles.wordClickableTitle}
                        title="Listen to pronunciation on YouGlish"
                        aria-label="Listen to pronunciation on YouGlish"
                    >
                        <span>{word.highlightedText || 'Untitled Word'}</span>
                        <Volume2 className={styles.soundWaveIcon} aria-hidden="true" />
                    </button>
                    {cleanTranscription && (
                        <span className={styles.wordTranscription}>
                            [{cleanTranscription}]
                        </span>
                    )}
                </div>

                {(definition || (translation && translation !== definition)) && (
                    <div className={styles.wordDefinitionBox}>
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
                )}
            </div>

            {/* Column 2: Unboxed Editorial Context, Note & Quiet Metadata */}
            <div className={styles.wordContextCol}>
                {hasContext && word.context && (
                    <p className={styles.contextQuoteBox}>
                        {getHighlightedParts(word.context, word.highlightedText || '', styles.contextHighlight)}
                    </p>
                )}

                {word.note && word.note.trim() && (
                    <p className={styles.wordNoteBox}>
                        {word.note}
                    </p>
                )}

                <div className={styles.wordMetaRow}>
                    <span className={styles.sourcePill} title={sourceLabel}>
                        <Folder size={11} aria-hidden="true" />
                        <span className={styles.sourcePillText}>{sourceLabel}</span>
                    </span>

                    {word.timestampSec !== null && word.timestampSec !== undefined && (
                        (() => {
                            const jumpUrl = buildVideoJumpUrl(word.resourceName, word.sourceUrl, word.timestampSec);
                            const formatted = formatTimestampSec(word.timestampSec);
                            return jumpUrl ? (
                                <Link
                                    to={jumpUrl}
                                    className={styles.timestampJumpLink}
                                    title={`Jump to ${formatted} in video`}
                                    aria-label={`Jump to ${formatted} in video`}
                                >
                                    <Clock size={11} aria-hidden="true" />
                                    <span>{formatted}</span>
                                </Link>
                            ) : (
                                <span className={styles.timestampBadge}>
                                    <Clock size={11} aria-hidden="true" />
                                    <span>{formatted}</span>
                                </span>
                            );
                        })()
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
            </div>

            {/* Column 3: Quiet Mastery Indicator & Ghost Actions */}
            <div className={styles.wordActionsCol}>
                <span className={`${styles.masteryBadge} ${mastery.className}`}>
                    <span className={styles.masteryDot} aria-hidden="true" />
                    <span>{mastery.label}</span>
                </span>

                <div className={styles.actionButtonsGroup}>
                    <button
                        type="button"
                        className={styles.actionIconBtn}
                        onClick={() => onEdit(word)}
                        title="Edit word"
                        aria-label="Edit word"
                    >
                        <Edit size={14} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                        onClick={() => onDelete(word.resourceName, word.id)}
                        title="Delete word"
                        aria-label="Delete word"
                    >
                        <Trash2 size={14} aria-hidden="true" />
                    </button>
                </div>
            </div>
        </article>
    );
};
