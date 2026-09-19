import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { SubtitleService } from '../../services/SubtitleService';
import { cleanSubtitleText, cleanSubtitleSelection } from '../../utils/subtitleCleaner';

import styles from './css/SubtitleViewer.module.css';
import { LanguageContext } from "../LanguageContext";

import X from 'lucide-react/dist/esm/icons/x';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import { createPortal } from 'react-dom';
import { AxiosError } from 'axios';

import { useIntl } from 'react-intl';
import { debugLog, debugError } from '../../utils/debug';
import MobileHint from '../shared/MobileHint';
import { MOBILE_HINT_STEPS } from '../shared/MobileHint.types';
import { useSaveWord, SaveWordData, SaveWordContext, useUserDictionaryItemsLight } from '../../hooks/useDictionary';

interface DictionaryItem {
    id: number;
    resourceName: string;
    highlightedText: string;
    translatedText: string;
    context: string;
    definition: string;
    normalizedText?: string;
}

interface SelectionPosition {
    x: number;
    y: number;
    showBelow?: boolean;
}

const SubtitleViewer: React.FC = () => {
    const intl = useIntl();
    const { learningLanguage: contextLearningLanguage, fluentLanguage } = useContext(LanguageContext);
    const learningLanguage = contextLearningLanguage || 'en';
    const { fileId } = useParams<{ fileId: string }>();

    const { data: userDictionaryItems } = useUserDictionaryItemsLight();

    const [subtitles, setSubtitles] = useState<string[]>([]);
    const [dictionaryItems, setDictionaryItems] = useState<DictionaryItem[]>([]);
    const [highlightedWords, setHighlightedWords] = useState<string[]>([]);
    const [isLoadingSubtitles, setIsLoadingSubtitles] = useState<boolean>(true);
    const [error, setError] = useState<string>('');
    const [notification, setNotification] = useState<string | null>(null);

    const [selectedText, setSelectedText] = useState<string | null>(null);
    const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
    const [showSubmitButton, setShowSubmitButton] = useState(false);
    const [selectionPosition, setSelectionPosition] = useState<SelectionPosition | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [translation, setTranslation] = useState<string | null>(null);
    const [definition, setDefinition] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [showImage, setShowImage] = useState<boolean>(true);
    const [transcription, setTranscription] = useState<string | null>(null);
    const [note, setNote] = useState("");
    const [examples, setExamples] = useState<string[] | null>(null);
    const [synonyms, setSynonyms] = useState<string[] | null>(null);
    const [recommendedSelections, setRecommendedSelections] = useState<string[] | null>(null);
    const [otherMeanings, setOtherMeanings] = useState<string[] | null>(null);
    const [collocations, setCollocations] = useState<string[] | null>(null);

    const [isLoadingTranslation, setIsLoadingTranslation] = useState<boolean>(false);
    const subtitlesContainerRef = useRef<HTMLDivElement>(null);
    const [activeSelection, setActiveSelection] = useState<{ text: string; range: Range } | null>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [highlightedSubtitles, setHighlightedSubtitles] = useState<string[]>([]);
    const [showMobileHint, setShowMobileHint] = useState(true);
    const [tooltipState, setTooltipState] = useState<{
        text: string;
        x: number;
        y: number;
    } | null>(null);
    const [popoverTransform, setPopoverTransform] = useState<string>('translateX(-50%)');
    const [showLanguageOverlay, setShowLanguageOverlay] = useState(false);

    const fetchSubtitles = useCallback(async () => {
        if (!fileId) {
            setError('Invalid file ID.');
            return;
        }

        setIsLoadingSubtitles(true);
        setError('');
        try {
            const data = await SubtitleService.fetchSubtitles(fileId);
            const sanitized = Array.isArray(data)
                ? data.map(s => typeof s === 'string' ? cleanSubtitleText(s) : cleanSubtitleText(s?.text || ''))
                : [];
            setSubtitles(sanitized);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'An unknown error occurred.');
        } finally {
            setIsLoadingSubtitles(false);
        }
    }, [fileId]);

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        if (userDictionaryItems) {
            const items = userDictionaryItems;
            const normalizedItems = (Array.isArray(items) ? items : []).map((item: any) => ({
                ...item,
                normalizedText: item.highlightedText.toLowerCase().trim()
            }));
            setDictionaryItems(normalizedItems);
            setHighlightedWords(normalizedItems.map(item => item.normalizedText));
        }
    }, [userDictionaryItems]);

    useEffect(() => {
        fetchSubtitles();
    }, [fetchSubtitles]);

    // Memoize wordMap creation to avoid re-computation
    const wordMap = React.useMemo((): Map<string, { translations: string[], definitions: string[] }> | null => {
        if (!dictionaryItems || dictionaryItems.length === 0) return null;

        const map = new Map<string, { translations: string[], definitions: string[] }>();

        for (const item of dictionaryItems) {
            const searchTerm = item.normalizedText?.trim().toLowerCase() || item.highlightedText?.trim().toLowerCase();
            if (!searchTerm) continue;

            if (!map.has(searchTerm)) {
                map.set(searchTerm, { translations: [], definitions: [] });
            }

            const entry = map.get(searchTerm)!;
            const translation = item.translatedText && item.translatedText.trim()
                ? item.translatedText.trim()
                : item.definition && item.definition.trim()
                    ? item.definition.trim()
                    : null;

            if (translation) {
                entry.translations.push(translation);
            }
        }

        return map;
    }, [dictionaryItems]);

    // Process subtitles in chunks to avoid blocking UI
    useEffect(() => {
        if (!Array.isArray(subtitles) || subtitles.length === 0) return;

        if (!wordMap || wordMap.size === 0) {
            setHighlightedSubtitles(subtitles);
            return;
        }

        const sortedSearchTerms = Array.from(wordMap.keys() as Iterable<string>).sort((a, b) => b.length - a.length);

        // Process synchronously but show loading state first
        const processSubtitles = () => {
            const highlighted = subtitles.map(text => {
                if (!text) return text;

                const allMatches: Array<{
                    start: number;
                    end: number;
                    translation: string;
                    definition: string;
                    originalText: string;
                }> = [];

                for (const searchTerm of sortedSearchTerms) {
                    const entry = wordMap.get(searchTerm)!;
                    const filteredTranslations = entry.translations.filter((t: string) => t && t.trim().length > 0);
                    const uniqueTranslations = Array.from(new Set(filteredTranslations));
                    const translations = uniqueTranslations.join(', ');

                    const isPhrase = searchTerm.includes(' ');
                    let searchIndex = 0;

                    while (searchIndex < text.length) {
                        const matchResult = isPhrase
                            ? findPhraseMatch(text, searchTerm, searchIndex)
                            : findWordMatch(text, searchTerm, searchIndex);

                        if (!matchResult.found) break;

                        if (matchResult.isValid && !isRangeOverlapping(matchResult.start, matchResult.end, allMatches)) {
                            const originalWord = text.slice(matchResult.start, matchResult.end);
                            allMatches.push({
                                start: matchResult.start,
                                end: matchResult.end,
                                translation: translations,
                                definition: '',
                                originalText: originalWord
                            });
                        }

                        searchIndex = matchResult.nextSearchIndex;
                    }
                }

                allMatches.sort((a, b) => b.start - a.start);

                const escapeHtmlAttribute = (str: string) => {
                    if (!str) return '';
                    return str
                        .replace(/&/g, '&amp;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#x27;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');
                };

                let result = text;
                for (const match of allMatches) {
                    const escapedTranslation = escapeHtmlAttribute(match.translation);
                    const escapedOriginalText = match.originalText
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;');

                    const spanHtml = `<span class="${styles.highlightedText}" data-translation="${escapedTranslation}" data-definition="">${escapedOriginalText}</span>`;
                    result = result.slice(0, match.start) + spanHtml + result.slice(match.end);
                }

                return result;
            });

            setHighlightedSubtitles(highlighted);
        };

        const timeoutId = setTimeout(processSubtitles, 0);
        return () => clearTimeout(timeoutId);
    }, [subtitles, wordMap]);

    function findPhraseMatch(text: string, searchPhrase: string, startIndex: number) {
        const foundIndex = text.toLowerCase().indexOf(searchPhrase.toLowerCase(), startIndex);

        if (foundIndex === -1) {
            return { found: false, nextSearchIndex: text.length };
        }

        const isWordStart = foundIndex === 0 || !/[a-zA-Z]/.test(text[foundIndex - 1]);

        if (!isWordStart) {
            return {
                found: true,
                isValid: false,
                start: foundIndex,
                end: foundIndex + searchPhrase.length,
                nextSearchIndex: foundIndex + 1
            };
        }

        const endIndex = foundIndex + searchPhrase.length;
        const remainingText = text.slice(endIndex);

        let punctuationLength = 0;
        let hasValidEnd = false;

        if (remainingText.length === 0) {
            hasValidEnd = true;
        } else {
            for (let i = 0; i < remainingText.length; i++) {
                const char = remainingText[i];
                if (/[.,!?;:'"]/.test(char)) {
                    punctuationLength++;
                } else if (/ /.test(char)) {
                    hasValidEnd = true;
                    break;
                } else if (/[a-zA-Z]/.test(char)) {
                    break;
                } else {
                    hasValidEnd = true;
                    break;
                }
            }

            if (punctuationLength > 0 && punctuationLength === remainingText.length) {
                hasValidEnd = true;
            }
        }

        return {
            found: true,
            isValid: hasValidEnd,
            start: foundIndex,
            end: endIndex + punctuationLength,
            nextSearchIndex: foundIndex + 1
        };
    }

    function findWordMatch(text: string, searchTerm: string, startIndex: number) {
        const VALID_ENDINGS = [
            "s", "es", "’s", "ed", "d", "ing",
            "er", "r", "est",
            "ly",
            "ness", "ment", "ion", "tion", "sion", "ity",
            "or", "ist", "ship", "hood", "dom",
            "able", "ible", "ous", "ful", "less", "al", "ic", "ish", "y",
            "ize", "ise", "en", "ify",
            "ward", "wards", "wise"
        ];

        const foundIndex = text.toLowerCase().indexOf(searchTerm.toLowerCase(), startIndex);

        if (foundIndex === -1) {
            return { found: false, nextSearchIndex: text.length };
        }

        const isWordStart = foundIndex === 0 || !/[a-zA-Z]/.test(text[foundIndex - 1]);

        if (!isWordStart) {
            return {
                found: true,
                isValid: false,
                start: foundIndex,
                end: foundIndex + searchTerm.length,
                nextSearchIndex: foundIndex + 1
            };
        }

        const remainingText = text.slice(foundIndex + searchTerm.length);

        if (remainingText.length === 0 || !/[a-zA-Z]/.test(remainingText[0])) {
            return {
                found: true,
                isValid: true,
                start: foundIndex,
                end: foundIndex + searchTerm.length,
                nextSearchIndex: foundIndex + 1
            };
        }

        for (const ending of VALID_ENDINGS) {
            if (remainingText.toLowerCase().startsWith(ending)) {
                const afterEnding = remainingText.slice(ending.length);

                if (afterEnding.length === 0 || !/[a-zA-Z]/.test(afterEnding[0])) {
                    return {
                        found: true,
                        isValid: true,
                        start: foundIndex,
                        end: foundIndex + searchTerm.length,
                        nextSearchIndex: foundIndex + searchTerm.length + ending.length
                    };
                }
            }
        }

        return {
            found: true,
            isValid: false,
            start: foundIndex,
            end: foundIndex + searchTerm.length,
            nextSearchIndex: foundIndex + 1
        };
    }

    function isRangeOverlapping(
        start: number,
        end: number,
        existingRanges: Array<{ start: number, end: number }>
    ): boolean {
        return existingRanges.some(range =>
            start < range.end && end > range.start
        );
    }

    const findSentenceForText = (text: string, selected: string) => {
        if (!selected || !text) return null;
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.includes(selected)) {
                return line.trim();
            }
        }
        const cleanedText = cleanSubtitleSelection(text);
        const regex = new RegExp(`[^.!?]*${selected}[^.!?]*[.!?]*`, 'g');
        const sentences = cleanedText.match(regex);
        if (sentences && sentences.length > 0) {
            return sentences[0].trim();
        }
        const textIndex = cleanedText.indexOf(selected);
        if (textIndex >= 0) {
            const startIndex = Math.max(0, textIndex - 40);
            const endIndex = Math.min(cleanedText.length, textIndex + selected.length + 40);
            return cleanedText.substring(startIndex, endIndex).trim();
        }
        return null;
    };

    const getExtendedContextAtIndex = (lines: string[], index: number): string => {
        if (!lines || lines.length === 0 || index < 0 || index >= lines.length) return '';

        const contextParts: string[] = [];
        // Previous line
        if (index > 0) {
            contextParts.push(lines[index - 1].trim());
        }
        // Current line
        contextParts.push(lines[index].trim());
        // Next line
        if (index < lines.length - 1) {
            contextParts.push(lines[index + 1].trim());
        }

        return contextParts.join(' ');
    };

    const getExtendedContext = (text: string, selected: string): string => {
        const lines = text.split('\n').filter(line => line.trim());
        const currentLineIndex = lines.findIndex(line => line.includes(selected));

        if (currentLineIndex === -1) return '';

        const contextParts: string[] = [];
        // Previous line
        if (currentLineIndex > 0) {
            contextParts.push(lines[currentLineIndex - 1].trim());
        }
        // Current line
        contextParts.push(lines[currentLineIndex].trim());
        // Next line
        if (currentLineIndex < lines.length - 1) {
            contextParts.push(lines[currentLineIndex + 1].trim());
        }

        return contextParts.join(' ');
    };

    const fetchTranslation = async (text: string, sentence: string, isSingleWord: boolean, extended?: string) => {
        debugLog('Starting fetchTranslation for:', { text, sentence, isSingleWord });
        setIsLoadingTranslation(true);
        setShowSubmitButton(false);

        if (isMobile) {
            setActiveSelection(null);
        }

        if (!fluentLanguage) {
            setNotification(intl.formatMessage({ id: 'selectLanguageToTranslate', defaultMessage: 'Select a language in the header to translate' }));
            setShowLanguageOverlay(true);
            setIsLoadingTranslation(false);
            return;
        }

        const originalPromise = SubtitleService.getTranslationProd({
            resourceName: fileId || 'Unknown File',
            highlightedText: text,
            context: sentence,
            extendedContext: extended,
            learningLanguage: learningLanguage,
            fluentLanguage: fluentLanguage,
        }).catch(error => {
            if (error?.message === 'GUEST_LIMIT_REACHED') {
                return null;
            }
            debugError('Error in original translation:', error);
            const axiosError = error as AxiosError;
            if (axiosError.response?.status === 404) {
                setTranslation('Try selecting a nearby phrase — we could not translate the selected word.');
            } else {
                setTranslation('Error fetching translation.');
            }
            return null;
        });

        try {
            const originalResult = await originalPromise;

            if (originalResult) {
                debugLog('Original translation result:', originalResult);
                setTranslation(originalResult.translation || ' ');
                setDefinition(originalResult.definition);
                setTranscription(originalResult.transcription);
                setImageUrl(originalResult.imageUrl);
                setShowImage(true);
                setExamples(originalResult.examples || null);
                setSynonyms(originalResult.synonyms || null);
                setRecommendedSelections(originalResult.recommended_selections || null);
                setOtherMeanings(originalResult.other_meanings || null);
                setCollocations(originalResult.context_analysis?.collocations || null);
            }

            const hasValidOriginal = originalResult &&
                originalResult.translation &&
                originalResult.translation.trim() !== "" &&
                !originalResult.translation.startsWith("You have reached");

            const hasValidDefinition = originalResult &&
                originalResult.definition !== null &&
                originalResult.definition !== undefined &&
                String(originalResult.definition).trim() !== "";

            if (hasValidOriginal || hasValidDefinition) {
                setShowSubmitButton(true);
            } else {
                setShowSubmitButton(false);
            }
        } catch (error) {
            debugError('Error in fetchTranslation:', error);
            setShowSubmitButton(false);
        } finally {
            setIsLoadingTranslation(false);
        }
    };

    const resetPopoverState = () => {
        setSelectedText(null);
        setSelectedSentence(null);
        setTranslation(null);
        setDefinition(null);
        setImageUrl(null);
        setShowImage(true);
        setTranscription(null);
        setNote('');
        setShowSubmitButton(false);
        setSelectionPosition(null);
    };

    useEffect(() => {
        const checkDevice = () => {
            setIsMobile(window.innerWidth <= 768);
        };
        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => {
            window.removeEventListener('resize', checkDevice);
        };
    }, []);

    const getPopoverPosition = useCallback((range: Range) => {
        const rect = range.getBoundingClientRect();
        if (!rect || rect.width === 0) return null;

        let x = rect.left + (rect.width / 2);
        let y: number;
        let transform: string;

        const popoverWidth = 300;
        const margin = 10;
        const windowHeight = window.innerHeight;
        const screenMiddle = windowHeight / 2;

        if (x < popoverWidth / 2) {
            x = popoverWidth / 2;
        } else if (x > window.innerWidth - popoverWidth / 2) {
            x = window.innerWidth - popoverWidth / 2;
        }

        let showBelow = false;
        if (rect.top >= screenMiddle) {
            y = rect.top - margin;
            transform = 'translate(-50%, -100%)';
            if (y < 0) y = margin;
            showBelow = false;
        } else {
            y = rect.bottom + margin;
            transform = 'translateX(-50%)';
            showBelow = true;
        }

        return { x, y, transform, showBelow };
    }, []);

    const showSelectionTooltip = useCallback((range: Range) => {
        try {
            const position = getPopoverPosition(range);
            if (position) {
                setSelectionPosition({ x: position.x + window.pageXOffset, y: position.y + window.pageYOffset, showBelow: position.showBelow });
                setPopoverTransform(position.transform);
                setIsPopoverOpen(true);
            }
        } catch (err) {
            debugError('Error showing selection tooltip:', err);
        }
    }, [getPopoverPosition]);

    useEffect(() => {
        const handleScroll = () => {
            if (activeSelection) {
                const position = getPopoverPosition(activeSelection.range);
                if (position) {
                    setSelectionPosition({
                        x: position.x + window.pageXOffset,
                        y: position.y + window.pageYOffset,
                        showBelow: position.showBelow
                    });
                    setPopoverTransform(position.transform);
                }
            }
        };

        if (isPopoverOpen) {
            window.addEventListener('scroll', handleScroll, true);
            window.addEventListener('touchmove', handleScroll, { passive: true, capture: true } as AddEventListenerOptions);
        }

        return () => {
            window.removeEventListener('scroll', handleScroll, true);
            window.removeEventListener('touchmove', handleScroll, true);
        };
    }, [isPopoverOpen, activeSelection, getPopoverPosition]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isMobile) return;

            const popover = document.getElementById("popover-id");
            if (popover && !popover.contains(event.target as Node)) {
                if (isPopoverOpen) {
                    setIsPopoverOpen(false);
                    resetPopoverState();
                    if (window.getSelection) {
                        window.getSelection()?.removeAllRanges();
                    }
                    event.stopPropagation();
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isPopoverOpen, isMobile]);

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length < 2) {
            setActiveSelection(null);
            setIsPopoverOpen(false);
            return;
        }

        const selectedText = selection.toString().trim();
        const range = selection.getRangeAt(0);

        let node = range.commonAncestorContainer;
        let element = node.nodeType === 3 ? node.parentElement : node as HTMLElement;
        while (element && !element.hasAttribute('data-index') && element.tagName !== 'DIV') {
            element = element.parentElement;
        }
        const lineIndex = element?.getAttribute('data-index') ? parseInt(element.getAttribute('data-index')!) : null;

        debugLog('handleTextSelection called:', { selectedText, isMobile, lineIndex });

        if (isMobile) {
            setTimeout(() => {
                processSelection(selectedText, range, lineIndex);
            }, 300);
        } else {
            processSelection(selectedText, range, lineIndex);
        }
    };

    const queryClient = useQueryClient();

    const saveWordMutation = useSaveWord({
        onMutate: async (newData: SaveWordData) => {
            await queryClient.cancelQueries({ queryKey: ['dictionaryItems', 'user'] });

            const previousItems = dictionaryItems;
            const previousHighlightedWords = highlightedWords;

            const optimisticItem: DictionaryItem = {
                id: Date.now(),
                resourceName: newData.resourceName,
                highlightedText: newData.highlightedText,
                translatedText: newData.translation || '',
                context: newData.context,
                definition: newData.definition || '',
                normalizedText: newData.highlightedText.toLowerCase().trim()
            };

            setDictionaryItems(prev => [...prev, optimisticItem]);
            setHighlightedWords(prev => [...prev, optimisticItem.normalizedText!]);

            // Close UI immediately
            showNotification('The word has been added to the dictionary');
            setIsPopoverOpen(false);
            resetPopoverState();

            return { previousItems, previousHighlightedWords };
        },
        onError: (err: any, _variables: SaveWordData, context: SaveWordContext | undefined) => {
            if (context?.previousItems) {
                setDictionaryItems(context.previousItems);
            }
            if (context?.previousHighlightedWords) {
                setHighlightedWords(context.previousHighlightedWords);
            }
            const status = err?.status || err?.response?.status;
            const message = (err?.message || err?.response?.data?.message || '').toLowerCase();

            if (status === 403 || message.includes('save limit') || message.includes('word save')) {
                window.dispatchEvent(new CustomEvent('substreamedu:premium_limit_reached', { detail: { type: 'save' } }));
            } else {
                showNotification('Failed to save word. Please try again.');
            }
            debugError("Mutation failed", err);
        },
    });

    const saveToDict = () => {
        if (!selectedText || !selectedSentence) {
            return;
        }

        const translationData = {
            translation: translation,
            definition: definition,
            transcription: transcription,
            imageUrl: showImage ? imageUrl : null
        };

        saveWordMutation.mutate({
            resourceName: fileId || 'Unknown File',
            highlightedText: selectedText,
            context: selectedSentence,
            translation: translationData.translation || '',
            note: note,
            transcription: translationData.transcription || '',
            definition: translationData.definition || '',
            imageUrl: translationData.imageUrl || ''
        });
    };

    const processSelection = (selectedText: string, range: Range, lineIndex?: number | null) => {
        if (!selectedText) {
            debugError('processSelection called with null/undefined selectedText');
            return;
        }

        const wordCount = selectedText.split(/\s+/).length;
        const isSingleWord = wordCount === 1;

        setTranslation(null);
        setDefinition(null);
        setImageUrl(null);
        setTranscription(null);
        setExamples(null);
        setSynonyms(null);
        setRecommendedSelections(null);
        setOtherMeanings(null);
        setCollocations(null);
        setNote('');
        setIsLoadingTranslation(true);

        setActiveSelection({
            text: selectedText,
            range: range
        });

        setSelectedText(selectedText);

        showSelectionTooltip(range);

        const fullText = subtitles.join('\n');
        const sentence = (lineIndex !== null && lineIndex !== undefined && lineIndex >= 0 && lineIndex < subtitles.length)
            ? subtitles[lineIndex]
            : findSentenceForText(fullText, selectedText);

        const extendedCtx = (lineIndex !== null && lineIndex !== undefined && lineIndex >= 0 && lineIndex < subtitles.length)
            ? getExtendedContextAtIndex(subtitles, lineIndex)
            : getExtendedContext(fullText, selectedText);

        debugLog('Found sentence:', sentence);
        debugLog('Extended context:', extendedCtx);
        if (sentence) {
            setSelectedSentence(sentence);
            fetchTranslation(selectedText, sentence, isSingleWord, extendedCtx);
        }
    };

    useEffect(() => {
        if ((translation || definition) && activeSelection) {
            showSelectionTooltip(activeSelection.range);
        }
    }, [translation, definition, imageUrl, activeSelection, showSelectionTooltip]);

    useEffect(() => {
        const decodeHtmlEntities = (str: string): string => {
            if (!str) return '';
            const textarea = document.createElement('textarea');
            textarea.innerHTML = str;
            return textarea.value;
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains(styles.highlightedText)) {
                const translationRaw = target.getAttribute('data-translation');
                const translation = translationRaw ? decodeHtmlEntities(translationRaw).trim() : '';
                const word = target.textContent;

                if (word) {
                    let finalTranslation = translation || '';

                    if (!finalTranslation && word.length > 2) {
                        finalTranslation = `Click to translate "${word}"`;
                    }

                    if (finalTranslation) {
                        const rect = target.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                        setTooltipState({
                            text: finalTranslation,
                            x: rect.left + scrollLeft + rect.width / 2,
                            y: rect.top + scrollTop - 30
                        });
                    }
                }
            }
        };
        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target?.classList?.contains(styles.highlightedText)) {
                setTooltipState(null);
            }
        };
        const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target?.classList?.contains(styles.highlightedText) && tooltipState) {
                const translationRaw = target.getAttribute('data-translation');
                const translation = translationRaw ? decodeHtmlEntities(translationRaw).trim() : '';
                const word = target.textContent;

                if (word) {
                    let finalTranslation = translation || '';

                    if (!finalTranslation && word.length > 2) {
                        finalTranslation = `Click to translate "${word}"`;
                    }

                    if (finalTranslation) {
                        const rect = target.getBoundingClientRect();
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                        setTooltipState({
                            text: finalTranslation,
                            x: rect.left + scrollLeft + rect.width / 2,
                            y: rect.top + scrollTop - 30
                        });
                    }
                }
            }
        };
        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);
        document.addEventListener('mousemove', handleMouseMove);
        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [dictionaryItems, highlightedWords, tooltipState]);

    return (
        <div className={styles.container}>
            <div className={styles.ambientGlow} />
            <div className={`${styles.ambientGlow} ${styles.ambientGlowSecond}`} />

            <div className={styles.content}>
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

                <div className={styles.headerGroup}>
                    <span className={styles.eyebrow}>06 // SUBTITLE VIEWER</span>
                    <h1 className={styles.pageTitle}>{fileId ? decodeURIComponent(fileId) : 'Subtitles'}</h1>
                </div>

                {isLoadingSubtitles ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: '100px 0' }}>
                        <div className={styles.loader}>
                            <p className={styles['loader-text']}>Loading</p>
                            <div className={styles.load}></div>
                        </div>
                    </div>
                ) : error ? (
                    <div className={styles.error}>{error}</div>
                ) : subtitles.length > 0 ? (
                    <>
                        <MobileHint
                            isVisible={isMobile && showMobileHint}
                            onClose={() => setShowMobileHint(false)}
                            steps={MOBILE_HINT_STEPS.SONGS_AND_TEXT}
                        />
                        <div
                            className={styles.subtitlesList}
                            ref={subtitlesContainerRef}
                            onMouseUp={handleTextSelection}
                            onTouchEnd={handleTextSelection}
                            onContextMenu={(e) => e.preventDefault()}
                        >
                            {highlightedSubtitles.map((subtitle, idx) => (
                                <p key={idx} data-index={idx} className={styles.subtitleLine}>
                                    <span dangerouslySetInnerHTML={{ __html: subtitle }} />
                                </p>
                            ))}
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center py-20 border-t border-white/10 w-full mt-12">
                        <h3 className="font-medium text-xl text-white mb-2">No subtitles found.</h3>
                    </div>
                )}
            </div>

            {selectionPosition && isPopoverOpen && (translation || isLoadingTranslation) && createPortal(
                <div
                    id="popover-id"
                    className={`${styles.popover} ${styles.glass3d} ${selectionPosition?.showBelow ? styles.popoverBelow : ''}`}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        transform: `translate(${selectionPosition.x}px, ${selectionPosition.y}px) ${popoverTransform}`,
                        zIndex: 10000
                    }}
                    role="dialog"
                    aria-label="Translation Popover"
                >
                    <div className={styles.popoverArrow}></div>
                    <div className={styles.popoverContent}>
                        <div className={styles.selectedTextRow}>
                            <span className={styles.selectedText}>{selectedText}</span>
                            {(() => {
                                const currentTranscription = transcription;
                                if (currentTranscription) {
                                    return <span className={styles.transcription}>[/{currentTranscription}/]</span>;
                                }
                                return null;
                            })()}
                        </div>

                        {isLoadingTranslation && (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
                                <div className={styles.loader}>
                                    <p className={styles['loader-text']}>Loading</p>
                                    <div className={styles.load}></div>
                                </div>
                            </div>
                        )}

                        <div className={styles.popoverBody}>
                            <div className={styles.popoverBodyText}>
                                {definition ? (
                                    <div className={styles.definitionRow}>
                                        <span className={styles.translationText}>
                                            {definition}
                                            {translation?.trim() && (
                                                <span style={{ opacity: 0.5, fontSize: '0.9em' }}>
                                                    <br />
                                                    ({translation})
                                                </span>
                                            )}
                                        </span>
                                    </div>
                                ) : (
                                    translation?.trim() && (
                                        <div className={styles.translationRow}>
                                            <span
                                                className={`${styles.translationText} ${
                                                    translation?.includes('could not translate') ||
                                                    translation?.includes('Error fetching translation')
                                                        ? styles.errorText
                                                        : ''
                                                }`}
                                            >
                                                {translation}
                                            </span>
                                        </div>
                                    )
                                )}
                            </div>
                            {imageUrl && showImage && (
                                <div className={styles.popoverBodyImage} style={{ position: 'relative' }}>
                                    <img
                                        src={imageUrl}
                                        alt="Visual reference"
                                        className={styles.translationImage}
                                    />
                                    <button
                                        className={styles.imageCloseButton}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowImage(false);
                                        }}
                                        title="Remove image"
                                    >
                                        ×
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* AI metadata fields matching VideoPlayer & SongSearchPlayer */}
                        {(() => {
                            const matchingSelections = (recommendedSelections || []).filter(
                                (rec: string) => selectedSentence?.toLowerCase().includes(rec.toLowerCase())
                            );
                            const bestMatch = matchingSelections.sort((a: string, b: string) => b.length - a.length)[0];

                            return (
                                <>
                                    {bestMatch && (
                                        <div className={styles.aiHintBox}>
                                            <Lightbulb size={14} className="text-body shrink-0" />
                                            <span className={styles.aiHintText}>{bestMatch}</span>
                                        </div>
                                    )}

                                    {examples && examples.length > 0 && (
                                        <div style={{ margin: '4px 0', fontSize: '11px', width: '100%' }}>
                                            <div style={{ fontWeight: '600', marginBottom: '4px', color: 'rgba(255,255,255,0.4)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                Examples
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                                {examples.slice(0, 2).map((example, idx) => (
                                                    <div key={idx} style={{
                                                        padding: '4px 8px',
                                                        backgroundColor: 'rgba(255,255,255,0.03)',
                                                        borderLeft: '2px solid rgba(255, 255, 255, 0.2)',
                                                        borderRadius: '2px',
                                                        fontSize: '11px',
                                                        color: 'rgba(255,255,255,0.7)',
                                                        lineHeight: '1.3',
                                                        textAlign: 'left'
                                                    }}>
                                                        {example}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', margin: '4px 0', width: '100%' }}>
                                        {synonyms && synonyms.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', marginRight: '2px' }}>Syn:</span>
                                                {synonyms.slice(0, 3).map((syn, idx) => (
                                                    <span key={idx} style={{ padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.6)' }}>{syn}</span>
                                                ))}
                                            </div>
                                        )}

                                        {otherMeanings && otherMeanings.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', marginRight: '2px' }}>Also:</span>
                                                {otherMeanings.slice(0, 3).map((meaning, idx) => (
                                                    <span key={idx} style={{ padding: '2px 6px', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontSize: '10px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }} onClick={() => setTranslation(meaning)}>{meaning}</span>
                                                ))}
                                            </div>
                                        )}

                                        {collocations && collocations.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', fontWeight: '600', textTransform: 'uppercase', marginRight: '2px' }}>Use with:</span>
                                                {collocations.slice(0, 3).map((collocation, idx) => (
                                                    <span key={idx} style={{ padding: '2px 6px', backgroundColor: 'rgba(255, 255, 255, 0.06)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '4px', fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)' }}>{collocation}</span>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </>
                            );
                        })()}

                        <div className={styles.popoverActions}>
                            <div className={styles.actionButtons}>
                                {showSubmitButton &&
                                    !(translation && translation.includes('You have reached your free limit of 100 translations. Please subscribe to continue.')) && (
                                        <button
                                            onClick={saveToDict}
                                            className={styles.saveButton}
                                            title="Add to dictionary"
                                        >
                                            <span>SAVE</span>
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                                <polyline points="7 3 7 8 15 8"></polyline>
                                            </svg>
                                        </button>
                                    )}
                                {(translation && (translation.startsWith('You have reached') || translation.includes('Please subscribe to continue'))) && (
                                    <button
                                        className={styles.iconButtonPremium}
                                        onClick={() => {
                                            window.location.href = "/subscribe";
                                        }}
                                        title="Subscribe"
                                        aria-label="Subscribe to premium for more translations"
                                    >
                                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                                            xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                            <path
                                                d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"
                                                fill="currentColor" stroke="currentColor" strokeWidth="2"
                                                strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                )}
                                <button
                                    className={styles.closeButton}
                                    onClick={() => {
                                        setIsPopoverOpen(false);
                                        resetPopoverState();
                                    }}
                                    aria-label="Close popover"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.fullscreenElement || document.body
            )}

            {notification && <div className={styles.notification}>{notification}</div>}

            {showLanguageOverlay && createPortal(
                <div
                    onClick={() => setShowLanguageOverlay(false)}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(8px)',
                        WebkitBackdropFilter: 'blur(8px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '16px'
                    }}
                >
                    <div
                        style={{
                            background: 'rgba(20,20,20,0.85)',
                            border: '1px solid rgba(250,249,47,0.6)',
                            color: '#EAEAEA',
                            borderRadius: '12px',
                            padding: '18px 20px',
                            maxWidth: '520px',
                            width: '100%',
                            textAlign: 'center',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-live="assertive"
                    >
                        <div style={{ margin: '6px 0 14px' }}>
                            {intl.formatMessage({ id: 'selectLanguageToTranslate', defaultMessage: 'Select a language in the header to translate' })}
                        </div>
                        <button
                            onClick={() => setShowLanguageOverlay(false)}
                            style={{
                                marginTop: '4px',
                                background: '#FAF92F',
                                color: '#000',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '8px 14px',
                                fontWeight: 700,
                                cursor: 'pointer'
                            }}
                        >
                            OK
                        </button>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default SubtitleViewer;