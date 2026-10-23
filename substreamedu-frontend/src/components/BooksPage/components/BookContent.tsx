import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useIntl } from 'react-intl';
import { useQueryClient } from '@tanstack/react-query';
import { SubtitleService, TranslationProdResponse } from '../../../services/SubtitleService';
import { useSaveWord, SaveWordData, useUserDictionaryItemsLight } from '../../../hooks/useDictionary';
import { TranslationPopover } from '../../shared/TranslationPopover';
import { SelectionPosition, TranslationData, INITIAL_TRANSLATION_DATA } from '../../VideoPage/types';
import styles from '../css/BookReader.module.css';

interface BookContentProps {
    bookTitle: string;
    chapterTitle: string;
    content: string;
    fontSize: number;
    learningLanguage: string;
    fluentLanguage: string;
    onWordSaved?: (word: string) => void;
}

export const BookContent: React.FC<BookContentProps> = ({
    bookTitle,
    chapterTitle,
    content,
    fontSize,
    learningLanguage,
    fluentLanguage,
    onWordSaved
}) => {
    const intl = useIntl();
    const queryClient = useQueryClient();
    const { data: userDictionaryItems } = useUserDictionaryItemsLight();

    const [selectedText, setSelectedText] = useState<string | null>(null);
    const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
    const [selectionPosition, setSelectionPosition] = useState<SelectionPosition | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [isLoadingTranslation, setIsLoadingTranslation] = useState(false);
    const [translationData, setTranslationData] = useState<TranslationData | null>(null);
    const [notification, setNotification] = useState<string | null>(null);

    // Map of word -> translation for optimistic instant feedback on save
    const [optimisticSavedWords, setOptimisticSavedWords] = useState<Map<string, string>>(new Map());

    // Floating hover tooltip for underlined words
    const [tooltipState, setTooltipState] = useState<{
        text: string;
        x: number;
        y: number;
    } | null>(null);

    const contentRef = useRef<HTMLDivElement>(null);

    // Build lookup dictionary map: normalized word -> translatedText or definition
    const dictionaryMap = useMemo(() => {
        const map = new Map<string, string>();
        if (Array.isArray(userDictionaryItems)) {
            userDictionaryItems.forEach((item: { highlightedText?: string; translatedText?: string; definition?: string }) => {
                if (item.highlightedText) {
                    const key = item.highlightedText.toLowerCase().trim();
                    const trans = item.translatedText?.trim() || item.definition?.trim() || '';
                    if (!map.has(key)) {
                        map.set(key, trans || item.highlightedText);
                    }
                }
            });
        }
        optimisticSavedWords.forEach((val, key) => {
            map.set(key, val);
        });
        return map;
    }, [userDictionaryItems, optimisticSavedWords]);

    const showNotification = (msg: string) => {
        setNotification(msg);
        setTimeout(() => setNotification(null), 3000);
    };

    const paragraphs = useMemo(() => {
        return content.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    }, [content]);

    const findSentenceForText = (text: string, selected: string): string => {
        if (!text || !selected) return '';
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.includes(selected)) {
                return line.trim();
            }
        }
        const index = text.indexOf(selected);
        if (index >= 0) {
            const start = Math.max(0, index - 60);
            const end = Math.min(text.length, index + selected.length + 60);
            return text.substring(start, end).trim();
        }
        return selected;
    };

    const getPopoverPosition = useCallback((range: Range): SelectionPosition | null => {
        const rect = range.getBoundingClientRect();
        if (!rect || rect.width === 0) return null;

        let x = rect.left + rect.width / 2;
        const popoverWidth = 320;
        const margin = 10;
        const screenMiddle = window.innerHeight / 2;

        if (x < popoverWidth / 2) {
            x = popoverWidth / 2;
        } else if (x > window.innerWidth - popoverWidth / 2) {
            x = window.innerWidth - popoverWidth / 2;
        }

        let y: number;
        let showBelow = false;

        if (rect.top >= screenMiddle) {
            y = rect.top - margin;
            if (y < 0) y = margin;
            showBelow = false;
        } else {
            y = rect.bottom + margin;
            showBelow = true;
        }

        return {
            x: x + window.pageXOffset,
            y: y + window.pageYOffset,
            showBelow
        };
    }, []);

    const fetchTranslation = async (text: string, sentence: string) => {
        setIsLoadingTranslation(true);
        try {
            const res: TranslationProdResponse = await SubtitleService.getTranslationProd({
                resourceName: bookTitle,
                highlightedText: text,
                context: sentence,
                learningLanguage: learningLanguage || 'en',
                fluentLanguage: fluentLanguage || 'en'
            });

            if (res) {
                setTranslationData({
                    ...INITIAL_TRANSLATION_DATA,
                    translation: res.translation,
                    definition: res.definition,
                    transcription: res.transcription,
                    imageUrl: res.imageUrl,
                    examples: res.examples || [],
                    synonyms: res.synonyms || [],
                    recommendedSelections: res.recommended_selections || [],
                    otherMeanings: res.other_meanings || [],
                    collocations: res.context_analysis?.collocations || []
                });
            }
        } catch {
            setTranslationData({
                ...INITIAL_TRANSLATION_DATA,
                translation: 'Could not fetch translation',
                definition: '',
                transcription: ''
            });
        } finally {
            setIsLoadingTranslation(false);
        }
    };

    // Translation triggers strictly upon text selection (onMouseUp / onTouchEnd)
    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.isCollapsed) return;

        const rawSelected = selection.toString().trim();
        // Ignore single character or empty accidental clicks
        if (rawSelected.length < 2) return;

        const range = selection.getRangeAt(0);
        const position = getPopoverPosition(range);
        if (!position) return;

        const sentence = findSentenceForText(content, rawSelected);
        setSelectedText(rawSelected);
        setSelectedSentence(sentence);
        setSelectionPosition(position);
        setIsPopoverOpen(true);

        fetchTranslation(rawSelected, sentence);
    };

    // Tooltip mouse handlers for underlined dictionary items
    const handleWordMouseEnter = (e: React.MouseEvent, word: string) => {
        const clean = word.toLowerCase().trim();
        const translation = dictionaryMap.get(clean);

        if (translation) {
            const target = e.currentTarget as HTMLElement;
            const rect = target.getBoundingClientRect();
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

            setTooltipState({
                text: translation,
                x: rect.left + scrollLeft + rect.width / 2,
                y: rect.top + scrollTop - 34
            });
        }
    };

    const handleWordMouseLeave = () => {
        setTooltipState(null);
    };

    const saveWordMutation = useSaveWord({
        onSuccess: () => {
            if (selectedText) {
                const norm = selectedText.toLowerCase().trim();
                const trans = translationData?.translation || '';
                setOptimisticSavedWords(prev => new Map(prev).set(norm, trans));
                onWordSaved?.(selectedText);
            }
            queryClient.invalidateQueries({ queryKey: ['dictionaryItems', 'user'] });
            showNotification(intl.formatMessage({
                id: 'books.wordSaved',
                defaultMessage: 'Word saved to your dictionary'
            }));
            setIsPopoverOpen(false);
        },
        onError: () => {
            showNotification(intl.formatMessage({
                id: 'books.saveFailed',
                defaultMessage: 'Failed to save word. Please try again.'
            }));
        }
    });

    const handleSaveToDict = () => {
        if (!selectedText || !selectedSentence) return;

        const data: SaveWordData = {
            resourceName: bookTitle,
            highlightedText: selectedText,
            context: selectedSentence,
            translation: translationData?.translation || '',
            note: '',
            transcription: translationData?.transcription || '',
            definition: translationData?.definition || '',
            imageUrl: translationData?.imageUrl || ''
        };

        saveWordMutation.mutate(data);
    };

    // Close popover when clicking outside
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const popoverEl = document.getElementById('popover-id');
            if (popoverEl && !popoverEl.contains(e.target as Node)) {
                if (isPopoverOpen) {
                    setIsPopoverOpen(false);
                }
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isPopoverOpen]);

    return (
        <main className={styles.stageWrapper}>
            {/* Tooltip Portal for Underlined Words */}
            {tooltipState && createPortal(
                <div
                    className={styles.wordTooltip}
                    style={{
                        left: tooltipState.x,
                        top: tooltipState.y
                    }}
                    role="tooltip"
                >
                    {tooltipState.text}
                </div>,
                document.body
            )}

            <h2 className={styles.chapterTitle}>{chapterTitle}</h2>

            <div
                ref={contentRef}
                className={styles.textContent}
                style={{ fontSize: `${fontSize}px` }}
                onMouseUp={handleTextSelection}
                onTouchEnd={handleTextSelection}
            >
                {paragraphs.map((para, pIdx) => {
                    // Split paragraph by punctuation and spaces while preserving tokens
                    const tokens = para.split(/(\s+|[.,!?;:—“”"()]+)/);

                    return (
                        <p key={pIdx} className={styles.paragraph}>
                            {tokens.map((token, tIdx) => {
                                const clean = token.toLowerCase().trim();
                                const hasTranslation = clean.length >= 2 && dictionaryMap.has(clean);

                                if (hasTranslation) {
                                    return (
                                        <span
                                            key={tIdx}
                                            className={styles.highlightedText}
                                            data-translation={dictionaryMap.get(clean)}
                                            onMouseEnter={e => handleWordMouseEnter(e, clean)}
                                            onMouseLeave={handleWordMouseLeave}
                                        >
                                            {token}
                                        </span>
                                    );
                                }

                                return <span key={tIdx}>{token}</span>;
                            })}
                        </p>
                    );
                })}
            </div>

            {/* Translation Popover on Text Selection */}
            {isPopoverOpen && selectionPosition && (
                <TranslationPopover
                    selectionPosition={selectionPosition}
                    isPopoverOpen={isPopoverOpen}
                    isLoading={isLoadingTranslation}
                    selectedText={selectedText}
                    selectedSentence={selectedSentence}
                    translationData={translationData || undefined}
                    onSaveToDict={handleSaveToDict}
                    onClose={() => setIsPopoverOpen(false)}
                    isSaving={saveWordMutation.isPending}
                    showSubmitButton={Boolean(translationData?.translation)}
                />
            )}

            {/* Toast Notification */}
            {notification && (
                <div className={styles.notificationToast}>
                    <span>{notification}</span>
                </div>
            )}
        </main>
    );
};

export default BookContent;
