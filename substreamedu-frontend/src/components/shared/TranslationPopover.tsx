import React from 'react';
import { createPortal } from 'react-dom';
import X from 'lucide-react/dist/esm/icons/x';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import { useIntl } from 'react-intl';
import styles from '../VideoPage/css/VideoPlayerPopover.module.css';
import { TranslationData, SelectionPosition, TranslationOption } from '../VideoPage/types';
import { TranslationOptionsGrid } from '../VideoPage/components/TranslationOptionsGrid';

export interface TranslationPopoverProps {
    selectionPosition: SelectionPosition | null;
    isPopoverOpen: boolean;
    isLoading: boolean;
    isMobile?: boolean;
    selectedText: string | null;
    selectedSentence?: string | null;

    // Structured or flat translation data
    translationData?: TranslationData;
    translation?: string | null;
    definition?: string | null;
    transcription?: string | null;
    imageUrl?: string | null;
    showImage?: boolean;
    partOfSpeech?: string | null;
    register?: string | null;

    // AI contextual metadata fields
    recommendedSelections?: string[] | null;
    examples?: string[] | null;
    synonyms?: string[] | null;
    otherMeanings?: string[] | null;
    collocations?: string[] | null;
    chunks?: string[] | null;
    typicalContexts?: string[] | null;

    // Options grid
    translationOptions?: TranslationOption[];
    onSelectOption?: (option: TranslationOption) => void;
    onChunkClick?: (chunk: string) => void;
    onSelectMeaning?: (meaning: string) => void;

    // Actions & state
    isSaving?: boolean;
    isAdmin?: boolean;
    showSubmitButton?: boolean;
    showSubscribeButton?: boolean;
    onSaveToDict?: () => void;
    onOpenReelModal?: () => void;
    onClose: () => void;
    onMouseEnter?: () => void;
    onRemoveImage?: () => void;
}

export const TranslationPopover: React.FC<TranslationPopoverProps> = ({
    selectionPosition,
    isPopoverOpen,
    isLoading,
    isMobile = false,
    selectedText,
    selectedSentence,
    translationData,
    translation,
    definition,
    transcription,
    imageUrl,
    showImage = true,
    partOfSpeech,
    register,
    recommendedSelections,
    examples,
    synonyms,
    otherMeanings,
    collocations,
    chunks,
    typicalContexts,
    translationOptions,
    onSelectOption,
    onChunkClick,
    onSelectMeaning,
    isSaving = false,
    isAdmin = false,
    showSubmitButton = true,
    showSubscribeButton,
    onSaveToDict,
    onOpenReelModal,
    onClose,
    onMouseEnter,
    onRemoveImage,
}) => {
    const intl = useIntl();

    const activeTranslation = translationData?.translation ?? translation ?? null;
    const activeDefinition = translationData?.definition ?? definition ?? null;
    const activeTranscription = translationData?.transcription ?? transcription ?? null;
    const activeImageUrl = translationData?.imageUrl ?? imageUrl ?? null;
    const activeShowImage = translationData ? translationData.showImage : showImage;
    const activePartOfSpeech = translationData?.partOfSpeech ?? partOfSpeech ?? null;
    const activeRegister = translationData?.register ?? register ?? null;
    const activeRecommendedSelections = translationData?.recommendedSelections ?? recommendedSelections ?? null;
    const activeExamples = translationData?.examples ?? examples ?? null;
    const activeSynonyms = translationData?.synonyms ?? synonyms ?? null;
    const activeCollocations = translationData?.collocations ?? collocations ?? null;
    const activeChunks = translationData?.chunks ?? chunks ?? null;
    const activeTypicalContexts = translationData?.typicalContexts ?? typicalContexts ?? null;

    if (!selectionPosition || !isPopoverOpen || (!activeTranslation && !isLoading)) {
        return null;
    }

    const activeOptions: TranslationOption[] = translationOptions || (
        (translationData?.otherMeanings || otherMeanings)
            ? (translationData?.otherMeanings || otherMeanings || []).map((m) => ({
                text: m,
                source: 'also' as const,
            }))
            : []
    );

    const handleSelectOption = (opt: TranslationOption) => {
        if (onSelectOption) {
            onSelectOption(opt);
        } else if (onSelectMeaning) {
            onSelectMeaning(opt.text);
        }
    };

    const hasReachedLimit = activeTranslation && activeTranslation.includes('You have reached your free limit of 100 translations');
    const isErrorTranslation = activeTranslation?.includes('could not translate') || activeTranslation?.includes('Error fetching translation');

    return createPortal(
        <div
            id="popover-id"
            className={`${styles.popover} ${styles.glass3d} ${selectionPosition?.showBelow ? styles.popoverBelow : ''} ${selectionPosition?.isConstrained ? styles.popoverConstrained : ''}`}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: selectionPosition?.showBelow
                    ? `translate(${isMobile ? window.innerWidth / 2 : selectionPosition.x}px, ${selectionPosition.y}px) translate(-50%, 0)`
                    : `translate(${isMobile ? window.innerWidth / 2 : selectionPosition.x}px, ${selectionPosition.y}px) translate(-50%, -100%)`,
                ...(typeof CSS !== 'undefined' && CSS.supports && CSS.supports('backdrop-filter', 'blur(25px)')
                    ? {
                        backdropFilter: 'blur(25px)',
                        WebkitBackdropFilter: 'blur(25px)',
                    }
                    : {
                        background: 'rgba(22, 22, 28, 0.6)',
                    }),
                zIndex: 10001,
                ...(selectionPosition?.maxHeight ? { maxHeight: `${selectionPosition.maxHeight}px` } : {}),
            }}
            onMouseEnter={onMouseEnter}
        >
            <div className={styles.popoverArrow}></div>
            <div className={styles.popoverContent}>
                <div className={styles.selectedTextRow}>
                    <h3 className={styles.selectedText}>{selectedText}</h3>
                    {activeTranscription && (
                        <span className={styles.transcription}>[/{activeTranscription}/]</span>
                    )}
                </div>

                {isLoading && (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                        <div className={styles.loader}>
                            <p className={styles['loader-text']}>Loading</p>
                            <div className={styles.load}></div>
                        </div>
                    </div>
                )}

                <div className={styles.popoverBody}>
                    <div className={styles.popoverBodyText}>
                        {activeTranslation?.trim() && (
                            <div className={styles.mainTranslationRow}>
                                <span className={`${styles.mainTranslationText} ${isErrorTranslation ? styles.errorText : ''}`}>
                                    {activeTranslation}
                                </span>
                                {(activePartOfSpeech || activeRegister) && (
                                    <div className={styles.inlineBadges}>
                                        {activePartOfSpeech && (
                                            <span className={styles.posTagSm}>{activePartOfSpeech}</span>
                                        )}
                                        {activeRegister && (
                                            <span className={`${styles.registerBadgeSm} ${styles[`register_${activeRegister}`] || ''}`}>
                                                {activeRegister}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {activeDefinition && activeDefinition.trim() !== '' && activeDefinition !== activeTranslation && (
                            <div className={styles.popoverDefinitionSubtitle}>
                                {activeDefinition}
                            </div>
                        )}
                    </div>

                    {activeImageUrl && activeShowImage && (
                        <div className={styles.popoverBodyImage} style={{ position: 'relative' }}>
                            <img
                                src={activeImageUrl}
                                alt="Visual reference"
                                className={styles.translationImage}
                            />
                            {onRemoveImage && (
                                <button
                                    type="button"
                                    className={styles.imageCloseButton}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRemoveImage();
                                    }}
                                    title="Remove image"
                                    aria-label="Remove image"
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <TranslationOptionsGrid
                    currentTranslation={activeTranslation}
                    selectedSentence={selectedSentence}
                    recommendedSelections={activeRecommendedSelections}
                    translationOptions={activeOptions}
                    chunks={activeChunks}
                    synonyms={activeSynonyms}
                    collocations={activeCollocations}
                    examples={activeExamples}
                    typicalContexts={activeTypicalContexts}
                    onSelectOption={handleSelectOption}
                    onChunkClick={onChunkClick || (() => {})}
                />

                <div className={styles.popoverActions}>
                    <div className={styles.actionButtons}>
                        {showSubmitButton && !hasReachedLimit && onSaveToDict && (
                            <button
                                type="button"
                                onClick={onSaveToDict}
                                className={styles.saveButton}
                                disabled={isSaving}
                                title={isSaving ? "Saving..." : "Add to dictionary"}
                            >
                                <span>{isSaving ? "SAVING..." : "SAVE"}</span>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                    <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                    <polyline points="7 3 7 8 15 8"></polyline>
                                </svg>
                            </button>
                        )}
                        {isAdmin && selectedText && onOpenReelModal && (
                            <button
                                type="button"
                                onClick={onOpenReelModal}
                                className={styles.reelButton}
                                title="Generate 9:16 Reel / TikTok"
                            >
                                <span className="flex items-center gap-1.5"><Smartphone size={14} /> REEL</span>
                            </button>
                        )}
                        {(showSubscribeButton || activeTranslation?.startsWith("You have reached")) && (
                            <button
                                type="button"
                                className={styles.iconButton}
                                style={{ color: '#D4AF37', background: 'rgba(255, 215, 0, 0.1)' }}
                                onClick={() => {
                                    window.location.href = "/subscribe";
                                }}
                                aria-label={intl.formatMessage({
                                    id: "subscribeNow",
                                    defaultMessage: "Subscribe"
                                })}
                                title={intl.formatMessage({
                                    id: "subscribeNow",
                                    defaultMessage: "Subscribe"
                                })}
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                </svg>
                            </button>
                        )}
                        <button
                            type="button"
                            className={styles.closeButton}
                            onClick={onClose}
                            aria-label="Close translation"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        (typeof document !== 'undefined' && (document.fullscreenElement || document.body)) || document.body
    );
};
