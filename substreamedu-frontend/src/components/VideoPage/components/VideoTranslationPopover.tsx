import React from 'react';
import { createPortal } from 'react-dom';
import X from 'lucide-react/dist/esm/icons/x';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import { useIntl } from 'react-intl';
import styles from '../css/VideoPlayerPopover.module.css';
import { TranslationData, SelectionPosition } from '../types';
import { TranslationOptionsGrid, TranslationOption } from './TranslationOptionsGrid';

export type PopoverPosition = SelectionPosition;

export interface VideoTranslationPopoverProps {
    selectionPosition: SelectionPosition | null;
    isPopoverOpen: boolean;
    isLoading: boolean;
    isMobile: boolean;
    selectedText: string | null;
    selectedSentence?: string | null;
    translationData: TranslationData;
    translationOptions: TranslationOption[];
    isSaving: boolean;
    isAdmin?: boolean;
    showSubmitButton?: boolean;
    showSubscribeButton?: boolean;
    onSelectOption: (option: TranslationOption) => void;
    onChunkClick: (chunk: string) => void;
    onSaveToDict: () => void;
    onOpenReelModal?: () => void;
    onClose: () => void;
    onMouseEnter?: () => void;
    onRemoveImage?: () => void;
}

export const VideoTranslationPopover: React.FC<VideoTranslationPopoverProps> = ({
    selectionPosition,
    isPopoverOpen,
    isLoading,
    isMobile,
    selectedText,
    selectedSentence,
    translationData,
    translationOptions,
    isSaving,
    isAdmin,
    showSubmitButton = true,
    showSubscribeButton,
    onSelectOption,
    onChunkClick,
    onSaveToDict,
    onOpenReelModal,
    onClose,
    onMouseEnter,
    onRemoveImage,
}) => {
    const intl = useIntl();

    if (!selectionPosition || !isPopoverOpen || (!translationData.translation && !isLoading)) {
        return null;
    }

    const hasReachedLimit = translationData.translation && translationData.translation.includes('You have reached your free limit of 100 translations');
    const isErrorTranslation = translationData.translation?.includes('could not translate') || translationData.translation?.includes('Error fetching translation');

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
                zIndex: 1001,
                ...(selectionPosition?.maxHeight ? { maxHeight: `${selectionPosition.maxHeight}px` } : {}),
            }}
            onMouseEnter={onMouseEnter}
        >
            <div className={styles.popoverArrow}></div>
            <div className={styles.popoverContent}>
                <div className={styles.selectedTextRow}>
                    <h3 className={styles.selectedText}>{selectedText}</h3>
                    {translationData.transcription && (
                        <span className={styles.transcription}>[/{translationData.transcription}/]</span>
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
                        {translationData.translation?.trim() && (
                            <div className={styles.mainTranslationRow}>
                                <span
                                    className={`${styles.mainTranslationText} ${isErrorTranslation ? styles.errorText : ''}`}
                                >
                                    {translationData.translation}
                                </span>
                                {(translationData.partOfSpeech || translationData.register) && (
                                    <div className={styles.inlineBadges}>
                                        {translationData.partOfSpeech && (
                                            <span className={styles.posTagSm}>{translationData.partOfSpeech}</span>
                                        )}
                                        {translationData.register && (
                                            <span className={`${styles.registerBadgeSm} ${styles[`register_${translationData.register}`] || ''}`}>
                                                {translationData.register}
                                            </span>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {translationData.definition && translationData.definition.trim() !== '' && translationData.definition !== translationData.translation && (
                            <div className={styles.popoverDefinitionSubtitle}>
                                {translationData.definition}
                            </div>
                        )}
                    </div>

                    {translationData.imageUrl && translationData.showImage && (
                        <div className={styles.popoverBodyImage} style={{ position: 'relative' }}>
                            <img
                                src={translationData.imageUrl}
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
                    currentTranslation={translationData.translation}
                    selectedSentence={selectedSentence}
                    recommendedSelections={translationData.recommendedSelections}
                    translationOptions={translationOptions}
                    chunks={translationData.chunks}
                    synonyms={translationData.synonyms}
                    collocations={translationData.collocations}
                    examples={translationData.examples}
                    typicalContexts={translationData.typicalContexts}
                    onSelectOption={onSelectOption}
                    onChunkClick={onChunkClick}
                />

                <div className={styles.popoverActions}>
                    <div className={styles.actionButtons}>
                        {showSubmitButton && !hasReachedLimit && (
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
                        {(showSubscribeButton || translationData.translation?.startsWith("You have reached")) && (
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
        document.fullscreenElement || document.body
    );
};
