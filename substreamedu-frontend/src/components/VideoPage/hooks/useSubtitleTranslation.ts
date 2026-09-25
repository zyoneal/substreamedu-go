import { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { AxiosError } from 'axios';
import { useIntl } from 'react-intl';
import { useQueryClient } from '@tanstack/react-query';
import { SubtitleService } from '../../../services/SubtitleService';
import { useSaveWord, SaveWordData, SaveWordContext } from '../../../hooks/useDictionary';
import { debugLog, debugError } from '../../../utils/debug';
import {
    TranslationData,
    TranslationOption,
    SelectionPosition,
    DictionaryItem,
    ErrorResponse,
} from '../types';
import {
    getExtendedSubtitleContext,
    findSentenceForSubtitle,
    calculatePopoverPosition,
} from '../utils/subtitleTranslationUtils';

export interface UseSubtitleTranslationParams {
    currentSubtitle: string | null;
    subtitlesForVideo: Array<{ text: string; [key: string]: any }> | null;
    fluentLanguage: string | null;
    learningLanguage: string;
    getResourceName: () => string;
    isMobile: boolean;
    pauseVideo: () => void;
    playVideo: () => void;
    showNotification: (msg: string) => void;
    isMountedRef: React.RefObject<boolean>;
    dictionaryItems?: DictionaryItem[];
    setDictionaryItems?: React.Dispatch<React.SetStateAction<DictionaryItem[]>>;
    setHighlightedWords?: React.Dispatch<React.SetStateAction<DictionaryItem[]>>;
    setOnboardingStep?: (step: any) => void;
    onRequireLanguageSelection?: () => void;
    customSaveWordMutation?: any;
    isPopoverOpen?: boolean;
    setIsPopoverOpen?: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface UseSubtitleTranslationResult {
    translationData: TranslationData;
    setTranslationData: React.Dispatch<React.SetStateAction<TranslationData>>;
    selectedText: string | null;
    setSelectedText: React.Dispatch<React.SetStateAction<string | null>>;
    selectedSentence: string | null;
    setSelectedSentence: React.Dispatch<React.SetStateAction<string | null>>;
    isPopoverOpen: boolean;
    setIsPopoverOpen: React.Dispatch<React.SetStateAction<boolean>>;
    isLoading: boolean;
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
    showSubmitButton: boolean;
    setShowSubmitButton: React.Dispatch<React.SetStateAction<boolean>>;
    note: string;
    setNote: React.Dispatch<React.SetStateAction<string>>;
    selectionPosition: SelectionPosition | null;
    setSelectionPosition: React.Dispatch<React.SetStateAction<SelectionPosition | null>>;
    activeSelection: { text: string; range: Range } | null;
    setActiveSelection: React.Dispatch<React.SetStateAction<{ text: string; range: Range } | null>>;
    translationOptions: TranslationOption[];
    handleSelectOption: (opt: TranslationOption) => void;
    handleTextSelection: () => void;
    processSelection: (selectedText: string, range: Range) => void;
    fetchTranslation: (text: string, sentence: string, isSingleWord: boolean, extended?: string) => Promise<void>;
    resetPopoverState: () => void;
    saveToDict: () => void;
    isSaving: boolean;
}

const INITIAL_TRANSLATION_DATA: TranslationData = {
    translation: null,
    definition: null,
    imageUrl: null,
    showImage: true,
    transcription: null,
    hint: null,
    examples: null,
    synonyms: null,
    style: null,
    partOfSpeech: null,
    otherMeanings: null,
    collocations: null,
    recommendedSelections: null,
    minimalUnit: null,
    register: null,
    usageNote: null,
    alternatives: null,
    chunks: null,
    typicalContexts: null,
    selectedOptionText: null,
};

export const useSubtitleTranslation = ({
    currentSubtitle,
    subtitlesForVideo,
    fluentLanguage,
    learningLanguage,
    getResourceName,
    isMobile,
    pauseVideo,
    playVideo,
    showNotification,
    isMountedRef,
    dictionaryItems = [],
    setDictionaryItems,
    setHighlightedWords,
    setOnboardingStep,
    onRequireLanguageSelection,
    customSaveWordMutation,
    isPopoverOpen: externalIsPopoverOpen,
    setIsPopoverOpen: externalSetIsPopoverOpen,
}: UseSubtitleTranslationParams): UseSubtitleTranslationResult => {
    const intl = useIntl();
    const queryClient = useQueryClient();

    const [selectedText, setSelectedText] = useState<string | null>(null);
    const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
    const [translationData, setTranslationData] = useState<TranslationData>(INITIAL_TRANSLATION_DATA);
    const [internalIsPopoverOpen, setInternalIsPopoverOpen] = useState(false);
    const isPopoverOpen = externalIsPopoverOpen !== undefined ? externalIsPopoverOpen : internalIsPopoverOpen;
    const setIsPopoverOpen = externalSetIsPopoverOpen || setInternalIsPopoverOpen;
    const [isLoading, setIsLoading] = useState(false);
    const [showSubmitButton, setShowSubmitButton] = useState(false);
    const [note, setNote] = useState('');
    const [selectionPosition, setSelectionPosition] = useState<SelectionPosition | null>(null);
    const [activeSelection, setActiveSelection] = useState<{ text: string; range: Range } | null>(null);

    const originalTranslationRef = useRef<{
        translation: string | null;
        definition: string | null;
        usageNote: string | null;
        register: string | null;
    }>({ translation: null, definition: null, usageNote: null, register: null });

    const translationOptions = useMemo<TranslationOption[]>(() => {
        const options: TranslationOption[] = [];
        const seen = new Set<string>();

        const primaryText = originalTranslationRef.current?.translation?.trim() || translationData.translation?.trim();
        if (primaryText) {
            seen.add(primaryText.toLowerCase());
            options.push({
                text: primaryText,
                definition: originalTranslationRef.current?.definition || translationData.definition || undefined,
                usageNote: originalTranslationRef.current?.usageNote || translationData.usageNote || undefined,
                register: originalTranslationRef.current?.register || translationData.register || undefined,
                isPrimary: true,
                source: 'primary',
            });
        }

        if (translationData.alternatives && translationData.alternatives.length > 0) {
            translationData.alternatives.forEach(alt => {
                const cleanText = alt.text?.trim();
                if (cleanText && !seen.has(cleanText.toLowerCase())) {
                    seen.add(cleanText.toLowerCase());
                    options.push({
                        text: cleanText,
                        definition: alt.usageNote || undefined,
                        usageNote: alt.usageNote || undefined,
                        register: alt.register || undefined,
                        isPrimary: false,
                        source: 'alternative',
                    });
                }
            });
        }

        if (translationData.otherMeanings && translationData.otherMeanings.length > 0) {
            translationData.otherMeanings.forEach(meaning => {
                if (!meaning) return;
                const match = meaning.match(/^([^(]+)(?:\((.*)\))?$/);
                const cleanText = match ? match[1].trim() : meaning.trim();
                const noteContent = match && match[2] ? match[2].trim() : undefined;

                if (cleanText && !seen.has(cleanText.toLowerCase())) {
                    seen.add(cleanText.toLowerCase());
                    options.push({
                        text: cleanText,
                        definition: noteContent || undefined,
                        usageNote: noteContent || undefined,
                        register: undefined,
                        isPrimary: false,
                        source: 'also',
                    });
                }
            });
        }

        return options;
    }, [
        translationData.alternatives,
        translationData.otherMeanings,
        translationData.translation,
        translationData.definition,
        translationData.usageNote,
        translationData.register,
    ]);

    const handleSelectOption = useCallback((opt: TranslationOption) => {
        setTranslationData(prev => {
            let newDefinition = opt.definition;
            let newUsageNote = opt.usageNote;
            let newRegister = opt.register;

            if (opt.isPrimary && originalTranslationRef.current) {
                newDefinition = originalTranslationRef.current.definition || newDefinition;
                newUsageNote = originalTranslationRef.current.usageNote || newUsageNote;
                newRegister = originalTranslationRef.current.register || newRegister;
            }

            return {
                ...prev,
                translation: opt.text,
                definition: newDefinition || null,
                usageNote: newUsageNote || null,
                register: newRegister || null,
                selectedOptionText: opt.text,
            };
        });
    }, []);

    const resetPopoverState = useCallback(() => {
        setSelectedText(null);
        setSelectedSentence(null);
        originalTranslationRef.current = {
            translation: null,
            definition: null,
            usageNote: null,
            register: null,
        };
        setTranslationData(INITIAL_TRANSLATION_DATA);
        setNote('');
        setIsLoading(false);
        setShowSubmitButton(false);
        setSelectionPosition(null);
        setActiveSelection(null);
        setIsPopoverOpen(false);
    }, [setIsPopoverOpen]);

    const defaultSaveWordMutation = useSaveWord({
        onMutate: async (newData: SaveWordData) => {
            try {
                await queryClient.cancelQueries({ queryKey: ['dictionaryItems', 'user'] });
            } catch {}

            setOnboardingStep?.('completed');
            try {
                localStorage.setItem('substreamedu_onboarding_completed', 'true');
            } catch {}

            const previousItems = dictionaryItems;

            const optimisticItem: DictionaryItem = {
                id: Date.now(),
                resourceName: newData.resourceName,
                highlightedText: newData.highlightedText,
                translatedText: newData.translation || '',
                context: newData.context,
                definition: newData.definition || '',
            };

            setDictionaryItems?.(prev => [...prev, optimisticItem]);
            setHighlightedWords?.(prev => [...prev, optimisticItem]);

            showNotification('The word has been added to the dictionary');
            setShowSubmitButton(false);
            setIsPopoverOpen(false);
            resetPopoverState();

            return { previousItems };
        },
        onError: (err: any, _variables: SaveWordData, context: SaveWordContext | undefined) => {
            if (context?.previousItems && setDictionaryItems && setHighlightedWords) {
                setDictionaryItems(context.previousItems);
                setHighlightedWords(context.previousItems);
            }
            const errorResponse = err as ErrorResponse;
            const status = err?.status || err?.response?.status;
            const message = (err?.message || err?.response?.data?.message || '').toLowerCase();

            if (status === 403 || message.includes('save limit') || message.includes('word save')) {
                window.dispatchEvent(
                    new CustomEvent('substreamedu:premium_limit_reached', { detail: { type: 'save' } })
                );
            } else if (errorResponse?.status === 503 && errorResponse?.message) {
                setTranslationData(prev => ({ ...prev, translation: errorResponse.message }));
                setShowSubmitButton(false);
            } else {
                showNotification('Failed to save word. Please try again.');
            }
            debugError('Mutation failed', err);
        },
    });

    const activeSaveMutation = customSaveWordMutation || defaultSaveWordMutation;

    const showSelectionTooltip = useCallback((range: Range) => {
        const pos = calculatePopoverPosition(range);
        if (pos) {
            setSelectionPosition(pos);
            setIsPopoverOpen(true);
        }
    }, [setIsPopoverOpen]);

    const fetchTranslation = useCallback(
        async (text: string, sentence: string, _isSingleWord: boolean, extended?: string) => {
            if (!isMountedRef.current) return;

            setSelectedText(text);
            setIsLoading(true);
            setShowSubmitButton(false);
            pauseVideo();

            if (!fluentLanguage) {
                showNotification(
                    intl.formatMessage({
                        id: 'selectLanguageToTranslate',
                        defaultMessage: 'Select a language in the header to translate',
                    })
                );
                onRequireLanguageSelection?.();
                setIsLoading(false);
                return;
            }

            const extendedCtx = extended || getExtendedSubtitleContext(subtitlesForVideo, currentSubtitle);

            try {
                const originalResult = await SubtitleService.getTranslationProd({
                    resourceName: getResourceName(),
                    highlightedText: text,
                    context: sentence,
                    extendedContext: extendedCtx,
                    learningLanguage: learningLanguage,
                    fluentLanguage: fluentLanguage,
                });

                if (!isMountedRef.current) return;

                if (originalResult) {
                    debugLog('Original translation result:', originalResult);
                    originalTranslationRef.current = {
                        translation: originalResult.translation || null,
                        definition: originalResult.definition || null,
                        usageNote: originalResult.usage_note || null,
                        register: originalResult.register || originalResult.style || null,
                    };

                    setTranslationData(prev => ({
                        ...prev,
                        translation: originalResult.translation || ' ',
                        definition: originalResult.definition,
                        transcription: originalResult.transcription,
                        imageUrl: originalResult.imageUrl,
                        showImage: true,
                        hint: originalResult.hint || null,
                        examples: originalResult.examples || null,
                        synonyms: originalResult.synonyms || null,
                        style: originalResult.style || null,
                        partOfSpeech: originalResult.partOfSpeech || null,
                        otherMeanings: originalResult.other_meanings || null,
                        collocations: originalResult.context_analysis?.collocations || null,
                        recommendedSelections: originalResult.recommended_selections || null,
                        minimalUnit: originalResult.context_analysis?.minimal_unit || null,
                        register: originalResult.register || originalResult.style || null,
                        usageNote: originalResult.usage_note || null,
                        alternatives:
                            originalResult.alternatives?.map(a => ({
                                text: a.text,
                                register: a.register,
                                usageNote: a.usage_note,
                            })) || null,
                        chunks: originalResult.chunks || null,
                        typicalContexts: originalResult.typical_contexts || null,
                        selectedOptionText: originalResult.translation || null,
                    }));
                }

                const hasValidOriginal =
                    originalResult &&
                    originalResult.translation &&
                    originalResult.translation.trim() !== '' &&
                    !originalResult.translation.startsWith('You have reached');

                const hasValidDefinition =
                    originalResult &&
                    originalResult.definition !== null &&
                    originalResult.definition !== undefined &&
                    String(originalResult.definition).trim() !== '';

                setShowSubmitButton(Boolean(hasValidOriginal || hasValidDefinition));
            } catch (error: any) {
                if (error?.message === 'GUEST_LIMIT_REACHED') {
                    setIsLoading(false);
                    setIsPopoverOpen(false);
                    return;
                }
                debugError('Error in translation fetch:', error);
                const axiosError = error as AxiosError;
                if (axiosError.response?.status === 404) {
                    setTranslationData(prev => ({
                        ...prev,
                        translation: 'Try selecting a nearby phrase — we could not translate the selected word.',
                    }));
                } else {
                    setTranslationData(prev => ({
                        ...prev,
                        translation: 'Error fetching translation.',
                    }));
                }
                setShowSubmitButton(false);
            } finally {
                setIsLoading(false);
            }
        },
        [
            isMountedRef,
            pauseVideo,
            fluentLanguage,
            learningLanguage,
            getResourceName,
            showNotification,
            intl,
            onRequireLanguageSelection,
            subtitlesForVideo,
            currentSubtitle,
            setIsPopoverOpen,
        ]
    );

    const processSelection = useCallback(
        (text: string, range: Range) => {
            if (!text) return;

            setActiveSelection({ text, range });
            const wordCount = text.split(/\s+/).length;
            const isSingleWord = wordCount === 1;

            setTranslationData(INITIAL_TRANSLATION_DATA);
            setNote('');
            setIsLoading(true);
            setSelectedText(text);

            pauseVideo();
            showSelectionTooltip(range);

            const sentence = findSentenceForSubtitle(text, currentSubtitle, subtitlesForVideo);
            if (sentence) {
                setSelectedSentence(sentence);
                const extendedCtx = getExtendedSubtitleContext(subtitlesForVideo, currentSubtitle);
                fetchTranslation(text, sentence, isSingleWord, extendedCtx);
            }
        },
        [currentSubtitle, subtitlesForVideo, pauseVideo, showSelectionTooltip, fetchTranslation]
    );

    const handleTextSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length < 2) {
            setIsPopoverOpen(false);
            return;
        }

        const text = selection.toString().trim();
        const range = selection.getRangeAt(0);

        if (isMobile) {
            setTimeout(() => {
                processSelection(text, range);
            }, 300);
        } else {
            processSelection(text, range);
        }
    }, [isMobile, processSelection, setIsPopoverOpen]);

    const saveToDict = useCallback(() => {
        if (!selectedText || !selectedSentence || !isMountedRef.current) return;

        const translationDataToSave = {
            translation: translationData.translation,
            definition: translationData.definition,
            transcription: translationData.transcription,
            imageUrl: translationData.showImage ? translationData.imageUrl : null,
        };

        const extendedCtx = getExtendedSubtitleContext(subtitlesForVideo, currentSubtitle);

        activeSaveMutation.mutate({
            resourceName: getResourceName(),
            highlightedText: selectedText,
            context: selectedSentence,
            extendedContext: extendedCtx || undefined,
            translation: translationDataToSave.translation || '',
            note: note,
            transcription: translationDataToSave.transcription || '',
            definition: translationDataToSave.definition || '',
            imageUrl: translationDataToSave.imageUrl || '',
        });
    }, [
        selectedText,
        selectedSentence,
        isMountedRef,
        translationData,
        subtitlesForVideo,
        currentSubtitle,
        activeSaveMutation,
        getResourceName,
        note,
    ]);

    // Handle outside clicks to dismiss popover
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const popover = document.getElementById('popover-id');
            const loadingPopover = document.getElementById('popover-loading');
            const target = event.target as HTMLElement;

            const isClickInside = popover?.contains(target) || loadingPopover?.contains(target);

            if (!isClickInside && isPopoverOpen) {
                resetPopoverState();
                if (window.getSelection) {
                    window.getSelection()?.removeAllRanges();
                }
                playVideo();
                event.stopPropagation();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPopoverOpen, playVideo, resetPopoverState]);

    // Reposition popover on scroll while open
    useEffect(() => {
        const handleScroll = () => {
            if (activeSelection) {
                showSelectionTooltip(activeSelection.range);
            }
        };

        if (isPopoverOpen) {
            window.addEventListener('scroll', handleScroll, true);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [isPopoverOpen, activeSelection, showSelectionTooltip]);

    return {
        translationData,
        setTranslationData,
        selectedText,
        setSelectedText,
        selectedSentence,
        setSelectedSentence,
        isPopoverOpen,
        setIsPopoverOpen,
        isLoading,
        setIsLoading,
        showSubmitButton,
        setShowSubmitButton,
        note,
        setNote,
        selectionPosition,
        setSelectionPosition,
        activeSelection,
        setActiveSelection,
        translationOptions,
        handleSelectOption,
        handleTextSelection,
        processSelection,
        fetchTranslation,
        resetPopoverState,
        saveToDict,
        isSaving: Boolean(activeSaveMutation.isPending),
    };
};
