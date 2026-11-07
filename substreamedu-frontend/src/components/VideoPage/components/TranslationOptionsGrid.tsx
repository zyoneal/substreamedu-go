import React from 'react';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Layers from 'lucide-react/dist/esm/icons/layers';
import styles from '../css/VideoPlayerPopover.module.css';
import { TranslationOption } from '../types';

export type { TranslationOption };

export interface TranslationOptionsGridProps {
    currentTranslation?: string | null;
    selectedSentence?: string | null;
    recommendedSelections?: string[] | null;
    translationOptions: TranslationOption[];
    chunks?: string[] | null;
    synonyms?: string[] | null;
    collocations?: string[] | null;
    examples?: string[] | null;
    typicalContexts?: string[] | null;
    onSelectOption: (option: TranslationOption) => void;
    onChunkClick: (chunk: string) => void;
}

export const TranslationOptionsGrid: React.FC<TranslationOptionsGridProps> = ({
    currentTranslation,
    selectedSentence,
    recommendedSelections,
    translationOptions,
    chunks,
    synonyms,
    collocations,
    examples,
    typicalContexts,
    onSelectOption,
    onChunkClick,
}) => {
    const matchingSelections = (recommendedSelections || []).filter(
        rec => selectedSentence?.toLowerCase().includes(rec.toLowerCase())
    );
    const bestMatch = matchingSelections.sort((a, b) => b.length - a.length)[0];

    return (
        <>
            {bestMatch && (
                <div className={styles.aiHintBoxCompact}>
                    <Lightbulb size={12} className="text-primary flex-shrink-0" />
                    <span className={styles.aiHintText}>{bestMatch}</span>
                </div>
            )}

            {/* Interactive Options & Alternatives Pill Grid */}
            {translationOptions.length > 1 && (
                <div className={styles.optionsSection}>
                    <div className={styles.sectionHeaderSm}>
                        <BookOpen size={11} className={styles.sectionHeaderIcon} />
                        <span>Alternatives & Meanings</span>
                    </div>
                    <div className={styles.optionsList}>
                        {translationOptions.map((opt, idx) => {
                            const isSelected = (currentTranslation?.trim().toLowerCase() === opt.text.trim().toLowerCase());
                            return (
                                <button
                                    key={idx}
                                    type="button"
                                    className={`${styles.optionPill} ${isSelected ? styles.optionPillActive : ''}`}
                                    onClick={() => onSelectOption(opt)}
                                    title={opt.usageNote || opt.definition || opt.text}
                                >
                                    {isSelected && <span className={styles.optionCheck}>✓</span>}
                                    <span className={styles.optionPillText}>{opt.text}</span>
                                    {opt.register && (
                                        <span className={`${styles.optionRegisterTag} ${styles[`register_${opt.register}`] || ''}`}>
                                            {opt.register}
                                        </span>
                                    )}
                                    {opt.source === 'also' && !isSelected && (
                                        <span className={styles.optionAlsoTag}>also</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Chunks — multi-word units (collocations, phrasal verbs, idioms) */}
            {chunks && chunks.length > 0 && (
                <div className={styles.chunksSectionCompact}>
                    <div className={styles.sectionHeaderSm}>
                        <Layers size={11} className={styles.sectionHeaderIcon} />
                        <span>Chunks</span>
                    </div>
                    <div className={styles.chunksListCompact}>
                        {chunks.slice(0, 4).map((chunk, idx) => (
                            <button
                                key={idx}
                                type="button"
                                className={styles.chunkPill}
                                onClick={() => onChunkClick(chunk)}
                                title={`Translate "${chunk}" as a unit`}
                            >
                                {chunk}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Tags row: Synonyms & Collocations */}
            {(((synonyms && synonyms.length > 0)) || ((collocations && collocations.length > 0))) && (
                <div className={styles.tagGroup}>
                    {synonyms && synonyms.length > 0 && (
                        <div className={styles.compactTagRow}>
                            <span className={styles.tagLabel}>Syn:</span>
                            {synonyms.slice(0, 3).map((syn, idx) => (
                                <span key={idx} className={styles.tagChip}>{syn}</span>
                            ))}
                        </div>
                    )}

                    {collocations && collocations.length > 0 && (
                        <div className={styles.compactTagRow}>
                            <span className={styles.tagLabel}>Use with:</span>
                            {collocations.slice(0, 3).map((collocation, idx) => (
                                <span key={idx} className={`${styles.tagChip} ${styles.tagChipContrast}`}>{collocation}</span>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Examples — 1 compact item */}
            {examples && examples.length > 0 && (
                <div className={styles.compactExamples}>
                    <span className={styles.compactExampleLabel}>Ex:</span>
                    <span className={styles.compactExampleText}>"{examples[0]}"</span>
                </div>
            )}

            {/* Typical Contexts */}
            {typicalContexts && typicalContexts.length > 0 && (
                <div className={styles.compactTagRow} style={{ paddingTop: '2px' }}>
                    <span className={styles.tagLabel}>In:</span>
                    {typicalContexts.slice(0, 3).map((ctx, idx) => (
                        <span key={idx} className={styles.typicalContextTag}>{ctx}</span>
                    ))}
                </div>
            )}
        </>
    );
};
