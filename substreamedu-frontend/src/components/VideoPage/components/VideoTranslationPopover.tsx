import React from 'react';
import { TranslationData, SelectionPosition, TranslationOption } from '../types';
import { TranslationPopover } from '../../shared/TranslationPopover';

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

export const VideoTranslationPopover: React.FC<VideoTranslationPopoverProps> = (props) => {
    return <TranslationPopover {...props} />;
};
