import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StatusNotification } from '../VideoPage/components/StatusNotification';
import { SubtitleService } from '../../services/SubtitleService';

import X from 'lucide-react/dist/esm/icons/x';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Clipboard from 'lucide-react/dist/esm/icons/clipboard';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import styles from './TextPasteHighlighter.module.css';
import { DictionaryService } from '../../services/DictionaryService';
import { AuthService } from '../../services/AuthService';
import { createPortal } from 'react-dom';
import { LanguageContext } from "../LanguageContext";
import { useIntl } from 'react-intl';
import MobileHint from '../shared/MobileHint';
import { MOBILE_HINT_STEPS } from '../shared/MobileHint.types';
import { useSaveWord, SaveWordData, SaveWordContext } from '../../hooks/useDictionary';
import { useQueryClient } from '@tanstack/react-query';

interface SelectionPosition {
    x: number;
    y: number;
    showBelow?: boolean;
}



const TextPasteHighlighter: React.FC = () => {
    const intl = useIntl();
    const [notification, setNotification] = useState<string | null>(null);

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    };
    const [inputText, setInputText] = useState('');
    const [selectedText, setSelectedText] = useState<string | null>(null);
    const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
    const [selectionPosition, setSelectionPosition] = useState<SelectionPosition | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const [translation, setTranslation] = useState<string | null>(null);
    const [definition, setDefinition] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [showImage, setShowImage] = useState<boolean>(true);
    const [transcription, setTranscription] = useState<string | null>(null);
    // Enhanced translation fields
    const [examples, setExamples] = useState<string[] | null>(null);
    const [synonyms, setSynonyms] = useState<string[] | null>(null);
    const [recommendedSelections, setRecommendedSelections] = useState<string[] | null>(null);
    // New minimalist UI fields
    const [otherMeanings, setOtherMeanings] = useState<string[] | null>(null);
    const [collocations, setCollocations] = useState<string[] | null>(null);
    const [note, setNote] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showSubmitButton, setShowSubmitButton] = useState(false);
    const [dictionaryItems, setDictionaryItems] = useState<any[]>([]);
    const [highlightedWords, setHighlightedWords] = useState<string[]>([]);
    const [foundWordsCount, setFoundWordsCount] = useState<number>(0);
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [pendingPasteText, setPendingPasteText] = useState<string>('');
    const [isMobile, setIsMobile] = useState(false);
    const [activeSelection, setActiveSelection] = useState<{ text: string; range: Range } | null>(null);
    const [showMobileHint, setShowMobileHint] = useState(false);
    const [popoverTransform, setPopoverTransform] = useState<string>('translateX(-50%)');
    const [tooltipState, setTooltipState] = useState<{ text: string; x: number; y: number } | null>(null);
    const [showLanguageOverlay, setShowLanguageOverlay] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
    const [showLevelConfirmModal, setShowLevelConfirmModal] = useState(false);
    const [pendingLevel, setPendingLevel] = useState<string | null>(null);
    const [topicInput, setTopicInput] = useState<string>('');

    const textDisplayRef = useRef<HTMLDivElement>(null);

    const { learningLanguage: contextLearningLanguage, fluentLanguage } = React.useContext(LanguageContext);
    const learningLanguage = contextLearningLanguage || 'en';

    const findSentenceForText = (text: string, selected: string) => {
        if (!selected || !text) return null;

        
        const selectionIndex = text.indexOf(selected);
        if (selectionIndex === -1) return null;

        
        let sentenceStart = 0;
        for (let i = selectionIndex - 1; i >= 0; i--) {
            if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
                sentenceStart = i + 1;
                break;
            }
        }

        
        let sentenceEnd = text.length;
        for (let i = selectionIndex + selected.length; i < text.length; i++) {
            if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
                sentenceEnd = i + 1;
                break;
            }
        }

        return text.slice(sentenceStart, sentenceEnd).trim();
    };

    
    const getExtendedContext = (text: string, selected: string): string => {
        if (!text || !selected) return '';

        // Find the position of selected text
        const selectionIndex = text.indexOf(selected);
        if (selectionIndex === -1) return selected;

        // Find sentence start (look backwards for . ! ? or start of text)
        let sentenceStart = 0;
        for (let i = selectionIndex - 1; i >= 0; i--) {
            if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
                sentenceStart = i + 1;
                break;
            }
        }

        // Find sentence end (look forwards for . ! ? or end of text)
        let sentenceEnd = text.length;
        for (let i = selectionIndex + selected.length; i < text.length; i++) {
            if (text[i] === '.' || text[i] === '!' || text[i] === '?') {
                sentenceEnd = i + 1;
                break;
            }
        }

        return text.slice(sentenceStart, sentenceEnd).trim();
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

    useEffect(() => {
        if (isMobile) {
            setShowMobileHint(true);
        }
    }, [isMobile]);

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length < 2) {
            if (!isMobile) {
                setActiveSelection(null);
                setIsPopoverOpen(false);
            }
            return;
        }
        const selected = selection.toString().trim();
        const range = selection.getRangeAt(0);
        if (isMobile) {
            setTimeout(() => {
                processSelection(selected, range);
            }, 300);
        } else {
            processSelection(selected, range);
        }
    };

    const processSelection = (selected: string, range: Range) => {
        if (!selected) {
            console.error('processSelection called with null/undefined selected text');
            return;
        }

        const wordCount = selected.split(/\s+/).length;
        const isSingleWord = wordCount === 1;
        setTranslation(null);
        setDefinition(null);
        setImageUrl(null);
        setTranscription(null);
        setRecommendedSelections(null);
        setNote('');
        setIsLoading(true);
        setShowSubmitButton(false);
        setActiveSelection({ text: selected, range });
        setSelectedText(selected);
        showSelectionTooltip(range);
        const sentence = findSentenceForText(inputText, selected);
        if (sentence) {
            setSelectedSentence(sentence);
            const extendedCtx = getExtendedContext(inputText, selected);
            fetchTranslation(selected, sentence, isSingleWord, extendedCtx);
        }
    };

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
                setSelectionPosition({
                    x: position.x + window.pageXOffset,
                    y: position.y + window.pageYOffset,
                    showBelow: position.showBelow
                });
                setPopoverTransform(position.transform);
                setIsPopoverOpen(true);
            }
        } catch (err) {
            console.error('Error showing selection tooltip:', err);
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

    const resetPopoverState = () => {
        setSelectedText(null);
        setSelectedSentence(null);
        setTranslation(null);
        setDefinition(null);
        setImageUrl(null);
        setShowImage(true);
        setTranscription(null);
        
        setExamples(null);
        setSynonyms(null);
        setOtherMeanings(null);
        setCollocations(null);
        setNote('');
        setIsLoading(false);
        setShowSubmitButton(false);
        setSelectionPosition(null);
    };

    const fetchTranslation = async (text: string, sentence: string, isSingleWord: boolean, extended?: string) => {
        setIsLoading(true);
        setShowSubmitButton(false);

        if (!fluentLanguage) {
            setNotification(intl.formatMessage({ id: 'selectLanguageToTranslate', defaultMessage: 'Select a language in the header to translate' }));
            setShowLanguageOverlay(true);
            setIsLoading(false);
            return;
        }

        const originalPromise = SubtitleService.getTranslationProd({
            resourceName: 'Pasted text',
            highlightedText: text,
            context: sentence,
            extendedContext: extended,
            learningLanguage: learningLanguage,
            fluentLanguage: fluentLanguage,
        }).catch(error => {
            if (error?.message === 'GUEST_LIMIT_REACHED') {
                return null;
            }
            if (error?.response?.status === 404 || (error?.message && error.message.includes('No value present'))) {
                setTranslation('Try selecting a nearby phrase — we could not translate the selected word.');
            } else {
                setTranslation('Error fetching translation.');
            }
            return null;
        });
        try {
            const originalResult = await originalPromise;
            if (originalResult) {
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
            if (hasValidOriginal || hasValidDefinition || translation) {
                setShowSubmitButton(true);
            } else {
                setShowSubmitButton(false);
            }
        } catch {
            setShowSubmitButton(!!translation);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchHighlightedWords = async () => {
        if (!AuthService.getUserEmail()) {
            setDictionaryItems([]);
            setHighlightedWords([]);
            return;
        }
        try {
            const items = await DictionaryService.fetchDictionaryItemsByUser();
            const actualItems = Array.isArray(items) ? items : (items && (items as any).items ? (items as any).items : []);
            const normalizedItems = actualItems.map((item: any) => ({
                ...item,
                normalizedText: item.highlightedText?.toLowerCase().trim() || ''
            }));
            setDictionaryItems(normalizedItems);
            setHighlightedWords(normalizedItems.map((item: any) => item.normalizedText));
        } catch { }
    };

    const queryClient = useQueryClient();

    const saveWordMutation = useSaveWord({
        onMutate: async (newData: SaveWordData) => {
            await queryClient.cancelQueries({ queryKey: ['dictionaryItems', 'user'] });

            const previousItems = dictionaryItems;

            const optimisticItem: any = {
                id: Date.now(),
                resourceName: newData.resourceName,
                highlightedText: newData.highlightedText,
                translatedText: newData.translation || '',
                context: newData.context,
                definition: newData.definition || '',
                normalizedText: newData.highlightedText.toLowerCase().trim()
            };

            const updatedItems = [...previousItems, optimisticItem];

            setDictionaryItems(updatedItems);
            setHighlightedWords(updatedItems.map((item: any) => item.normalizedText));

            setShowSubmitButton(false);
            setIsPopoverOpen(false);
            resetPopoverState();

            // Immediately update the text highlighting
            if (inputText && textDisplayRef.current) {
                textDisplayRef.current.innerHTML = highlightText(inputText, updatedItems);
            }

            return { previousItems };
        },
        onError: (err: any, _variables: SaveWordData, context: SaveWordContext | undefined) => {
            if (context?.previousItems) {
                setDictionaryItems(context.previousItems);
                setHighlightedWords(context.previousItems.map((item: any) => item.normalizedText));
                // Revert highlighting
                if (inputText && textDisplayRef.current) {
                    textDisplayRef.current.innerHTML = highlightText(inputText, context.previousItems);
                }
            }
            const errorResponse = err as any;
            const status = err?.status || err?.response?.status;
            const message = (err?.message || err?.response?.data?.message || '').toLowerCase();

            if (status === 403 || message.includes('save limit') || message.includes('word save')) {
                window.dispatchEvent(new CustomEvent('substreamedu:premium_limit_reached', { detail: { type: 'save' } }));
            } else if (errorResponse?.status === 503 && errorResponse?.message) {
                setTranslation(errorResponse.message);
                setShowSubmitButton(false);
            } else {
                showNotification('Failed to save word. Please try again.');
            }
            console.error("Mutation failed", err);
        }
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
            resourceName: 'Pasted text',
            highlightedText: selectedText,
            context: selectedSentence,
            translation: translationData.translation || '',
            note: note,
            transcription: translationData.transcription || '',
            definition: translationData.definition || '',
            imageUrl: translationData.imageUrl || ''
        });
    };

    const highlightText = (text: string, items: any[] = dictionaryItems) => {
        if (!text) return text;

        const wordMap = new Map<string, { translations: string[], definitions: string[] }>();

        for (const item of items) {
            const searchTerm = item.normalizedText?.trim().toLowerCase() || item.highlightedText?.trim().toLowerCase();
            if (!searchTerm) continue;

            if (!wordMap.has(searchTerm)) {
                wordMap.set(searchTerm, { translations: [], definitions: [] });
            }

            const entry = wordMap.get(searchTerm)!;

            const translation = item.translatedText && item.translatedText.trim()
                ? item.translatedText.trim()
                : item.definition && item.definition.trim()
                    ? item.definition.trim()
                    : null;

            if (translation) {
                entry.translations.push(translation);
            }
        }

        const sortedSearchTerms = Array.from(wordMap.keys()).sort((a, b) => b.length - a.length);

        const allMatches: Array<{
            start: number;
            end: number;
            translation: string;
            definition: string;
            originalText: string;
        }> = [];

        for (const searchTerm of sortedSearchTerms) {
            const entry = wordMap.get(searchTerm)!;

            const filteredTranslations = entry.translations.filter(t => t && t.trim().length > 0);
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

            const spanHtml = `<span class="${styles.dictionaryWord}" data-translation="${escapedTranslation}" data-definition="">${escapedOriginalText}</span>`;
            result = result.slice(0, match.start) + spanHtml + result.slice(match.end);
        }

        return result;
    };

    const countFoundWords = (text: string) => {
        if (!text.trim()) {
            return 0;
        }

        const sortedWords = [...highlightedWords].sort((a, b) => b.length - a.length);
        const foundUniqueWords = new Set<string>();

        for (const word of sortedWords) {
            const searchTerm = word.trim();
            if (!searchTerm) continue;
            const isPhrase = searchTerm.includes(' ');
            let searchIndex = 0;
            let foundInText = false;

            while (searchIndex < text.length) {
                const matchResult = isPhrase
                    ? findPhraseMatch(text, searchTerm, searchIndex)
                    : findWordMatch(text, searchTerm, searchIndex);
                if (!matchResult.found) break;
                if (matchResult.isValid) {
                    foundInText = true;
                    break;
                }
                searchIndex = matchResult.nextSearchIndex;
            }

            if (foundInText) {
                foundUniqueWords.add(searchTerm.toLowerCase());
            }
        }

        return foundUniqueWords.size;
    };

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
        let endIndex = foundIndex + searchPhrase.length;
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
                } else if (/\\s/.test(char)) {
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

    function isRangeOverlapping(start: number, end: number, existingRanges: Array<{ start: number, end: number }>): boolean {
        return existingRanges.some(range => start < range.end && end > range.start);
    }

    const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
        const el = e.target as HTMLDivElement;
        const text = el.innerText;
        setInputText(text);
    };



    const getPlaceholderStart = () => {
        const placeholderText = intl.formatMessage({ id: 'textPasteHighlighter.placeholder' });
        return placeholderText || '';
    };

    const clearText = () => {
        setInputText('');
        setIsPopoverOpen(false);
        resetPopoverState();
        if (textDisplayRef.current) {
            textDisplayRef.current.innerHTML = '';
        }
        if (window.getSelection) {
            window.getSelection()?.removeAllRanges();
        }
    };

    const pasteFromClipboard = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text && text.trim()) {
                    const trimmedText = text.trim();

                    // If there's existing text, show custom modal
                    if (inputText.trim()) {
                        setPendingPasteText(trimmedText);
                        setShowConfirmModal(true);
                    } else {

                        applyPastedText(trimmedText);
                    }
                }
            } else {

                alert(intl.formatMessage({ id: 'textPasteHighlighter.clipboardNotSupported' }));
            }
        } catch (error) {
            console.warn('Failed to read from clipboard:', error);
            alert(intl.formatMessage({ id: 'textPasteHighlighter.clipboardError' }));

            if (textDisplayRef.current) {
                textDisplayRef.current.focus();
            }
        }
    };

    const applyPastedText = (newText: string, shouldReplace: boolean = true) => {
        const finalText = shouldReplace ? newText : inputText + '\n\n' + newText;
        setInputText(finalText);

        if (textDisplayRef.current) {
            textDisplayRef.current.innerHTML = '';

            setTimeout(() => {
                if (textDisplayRef.current) {
                    textDisplayRef.current.innerHTML = highlightText(finalText);
                }
            }, 0);
        }
    };

    const handleConfirmReplace = () => {
        applyPastedText(pendingPasteText, true);
        setShowConfirmModal(false);
        setPendingPasteText('');
    };

    const handleConfirmAppend = () => {
        applyPastedText(pendingPasteText, false);
        setShowConfirmModal(false);
        setPendingPasteText('');
    };

    const handleConfirmCancel = () => {
        setShowConfirmModal(false);
        setPendingPasteText('');
    };

    const handleLevelClick = (level: string) => {
        if (inputText.trim()) {
            setPendingLevel(level);
            setShowLevelConfirmModal(true);
        } else {
            generateTextByLevel(level);
        }
    };

    const generateTextByLevel = async (level: string) => {
        if (!learningLanguage) {
            setNotification(intl.formatMessage({ id: 'selectLanguageToTranslate', defaultMessage: 'Select a language in the header to translate' }));
            setShowLanguageOverlay(true);
            return;
        }

        setIsGenerating(true);
        setSelectedLevel(level);
        setIsPopoverOpen(false);
        resetPopoverState();

        try {
            const generatedText = await SubtitleService.generateTextByLevel(level, learningLanguage, topicInput || undefined);
            setInputText(generatedText);

            if (textDisplayRef.current) {
                textDisplayRef.current.innerHTML = highlightText(generatedText);
            }

            setNotification(intl.formatMessage({
                id: 'textPasteHighlighter.generationSuccess',
                defaultMessage: `Text generated successfully for level ${level}`
            }));
        } catch (error: any) {
            console.error('Error generating text:', error);
            setNotification(error.message || intl.formatMessage({
                id: 'textPasteHighlighter.generationFailed',
                defaultMessage: 'Failed to generate text'
            }));
        } finally {
            setIsGenerating(false);
            setSelectedLevel(null);
        }
    };

    const handleLevelConfirmGenerate = () => {
        if (pendingLevel) {
            setShowLevelConfirmModal(false);
            generateTextByLevel(pendingLevel);
            setPendingLevel(null);
        }
    };

    const handleLevelConfirmCancel = () => {
        setShowLevelConfirmModal(false);
        setPendingLevel(null);
    };

    useEffect(() => {
        if (textDisplayRef.current && !inputText) {
            textDisplayRef.current.innerHTML = '';
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const timeoutId = setTimeout(() => {
            fetchHighlightedWords();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [inputText]);

    
    
    
    function saveCursor(el: HTMLElement): number | null {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return null;
        const range = sel.getRangeAt(0);
        const pre = range.cloneRange();
        pre.selectNodeContents(el);
        pre.setEnd(range.startContainer, range.startOffset);
        return pre.toString().length;
    }

    function restoreCursor(el: HTMLElement, pos: number | null) {
        if (pos === null || !el) return;
        let charIndex = 0;
        const range = document.createRange();
        range.setStart(el, 0);
        range.collapse(true);
        const stack: Node[] = [el];
        let found = false;
        while (!found && stack.length > 0) {
            const node = stack.pop()!;
            if (node.nodeType === 3) {
                const next = charIndex + node.textContent!.length;
                if (pos >= charIndex && pos <= next) {
                    range.setStart(node, pos - charIndex);
                    range.collapse(true);
                    found = true;
                }
                charIndex = next;
            } else {
                for (let i = node.childNodes.length - 1; i >= 0; i--) {
                    stack.push(node.childNodes[i]);
                }
            }
        }
        const sel = window.getSelection();
        if (sel) {
            sel.removeAllRanges();
            sel.addRange(range);
        }
    }

    useEffect(() => {
        const el = textDisplayRef.current;
        if (inputText && el) {
            const pos = saveCursor(el);
            el.innerHTML = highlightText(inputText);
            restoreCursor(el, pos);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dictionaryItems]);

    useEffect(() => {
        const count = countFoundWords(inputText);
        setFoundWordsCount(count);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inputText, highlightedWords]);

    useEffect(() => {
        if (textDisplayRef.current && !isMobile) {
            textDisplayRef.current.focus();
        }
    }, [isMobile]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {

            if ((e.ctrlKey || e.metaKey) && e.key === 'a' && textDisplayRef.current) {
                e.preventDefault();
                const range = document.createRange();
                range.selectNodeContents(textDisplayRef.current);
                const selection = window.getSelection();
                if (selection) {
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            }

            if (e.key === 'Escape' && isPopoverOpen) {
                setIsPopoverOpen(false);
                resetPopoverState();
                if (window.getSelection) {
                    window.getSelection()?.removeAllRanges();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isPopoverOpen]);

    const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text/plain');
        if (text && text.trim()) {
            const el = e.target as HTMLDivElement;
            el.innerHTML = '';
            setInputText(text.trim());

            setTimeout(() => {
                if (textDisplayRef.current) {
                    textDisplayRef.current.innerHTML = highlightText(text.trim());
                }
            }, 0);
        }
    };

    const popover = selectionPosition && isPopoverOpen && (translation || isLoading || isMobile) && createPortal(
        <div
            id="popover-id"
            className={`${styles.popover} ${styles.glass3d} ${selectionPosition?.showBelow ? styles.popoverBelow : ''}`}
            style={{
                position: 'absolute',
                left: 0,
                top: 0,
                transform: `translate(${selectionPosition.x}px, ${selectionPosition.y}px) ${popoverTransform}`,
                zIndex: 1001
            }}
        >
            <div className={styles.popoverArrow}></div>
            <div className={styles.popoverContent}>
                <div className={styles.selectedTextRow}>
                    <h3 className={styles.selectedText}>{selectedText}</h3>
                    {(() => {
                        const currentTranscription = transcription;
                        if (currentTranscription) {
                            return <span className={styles.transcription}>[/{currentTranscription}/]</span>;
                        }
                        return null;
                    })()}
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
                                {definition ? (
                                    <div className={styles.definitionRow}>
                                        <span className={styles.translationText}>
                                            {definition}
                                            {translation?.trim() && (
                                                <span style={{ opacity: 0.6, fontSize: '0.9em' }}><br/>({translation})</span>
                                            )}
                                        </span>
                                    </div>
                                ) : (
                                    translation?.trim() && (
                                        <div className={styles.translationRow}>
                                            <span className={styles.translationText}>{translation}</span>
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

                        {}
                        {(() => {
                            const matchingSelections = (recommendedSelections || []).filter(
                                (rec: string) => selectedSentence?.toLowerCase().includes(rec.toLowerCase())
                            );
                            const bestMatch = matchingSelections.sort((a: string, b: string) => b.length - a.length)[0];

                            return (
                                <>
                                    {bestMatch && (
                                        <div className={styles.aiHintBox}>
                                            <span className={styles.aiHintIcon}><Lightbulb size={16} className="text-primary" /></span>
                                            <span className={styles.aiHintText}>{bestMatch}</span>
                                        </div>
                                    )}

                                    {examples && examples.length > 0 && (
                                        <div className={styles.exampleContainer}>
                                            <div className={styles.exampleLabel}>Examples</div>
                                            <div className={styles.exampleList}>
                                                {examples.slice(0, 2).map((example, idx) => (
                                                    <div key={idx} className={styles.exampleItem}>
                                                        {example}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className={styles.tagGroup}>
                                        {synonyms && synonyms.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                <span className={styles.tagLabel}>Syn:</span>
                                                {synonyms.slice(0, 3).map((syn, idx) => (
                                                    <span key={idx} className={styles.tagChip}>{syn}</span>
                                                ))}
                                            </div>
                                        )}

                                        {otherMeanings && otherMeanings.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                <span className={styles.tagLabel}>Also:</span>
                                                {otherMeanings.slice(0, 3).map((meaning, idx) => (
                                                    <span
                                                        key={idx}
                                                        className={`${styles.tagChip} ${styles.tagChipContrast} ${styles.tagChipInteractive}`}
                                                        onClick={() => setTranslation(meaning)}
                                                    >
                                                        {meaning}
                                                    </span>
                                                ))}
                                            </div>
                                        )}

                                        {collocations && collocations.length > 0 && (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                                                <span className={styles.tagLabel}>Use with:</span>
                                                {collocations.slice(0, 3).map((collocation, idx) => (
                                                    <span key={idx} className={`${styles.tagChip} ${styles.tagChipContrast}`}>{collocation}</span>
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
                            !(translation && translation.startsWith('You have reached')) && (
                                <button
                                    onClick={saveToDict}
                                    className={styles.saveButton}
                                    disabled={saveWordMutation.isPending}
                                    title={saveWordMutation.isPending ? "Saving..." : "Add to dictionary"}
                                >
                                    <span>{saveWordMutation.isPending ? "SAVING..." : "SAVE"}</span>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                        <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                        <polyline points="7 3 7 8 15 8"></polyline>
                                    </svg>
                                </button>
                            )}
                        {(translation && translation.startsWith('You have reached')) && (
                            <button
                                className={styles.iconButton}
                                style={{ color: '#D4AF37', background: 'rgba(255, 215, 0, 0.1)' }}
                                onClick={() => {
                                    window.location.href = "/subscribe";
                                }}
                                title="Subscribe"
                            >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                                </svg>
                            </button>
                        )}
                        <button
                            className={styles.closeButton}
                            onClick={() => {
                                setIsPopoverOpen(false);
                                resetPopoverState();
                            }}
                            aria-label="Close translation"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );

    const mobileHint = (
        <MobileHint
            isVisible={isMobile && showMobileHint}
            onClose={() => setShowMobileHint(false)}
            steps={MOBILE_HINT_STEPS.SONGS_AND_TEXT}
        />
    );

    useEffect(() => {
        const decodeHtmlEntities = (str: string): string => {
            if (!str) return '';
            const textarea = document.createElement('textarea');
            textarea.innerHTML = str;
            return textarea.value;
        };

        const handleShowTooltip = (e: MouseEvent | TouchEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains(styles.dictionaryWord)) {
                const translationRaw = target.getAttribute('data-translation');
                const translation = translationRaw ? decodeHtmlEntities(translationRaw).trim() : '';
                const word = target.textContent;

                if (word && translation) {
                    const rect = target.getBoundingClientRect();
                    const scrollTop = window.scrollY || document.documentElement.scrollTop;
                    const scrollLeft = window.scrollX || document.documentElement.scrollLeft;

                    let x = rect.left + scrollLeft + rect.width / 2;
                    let y = rect.top + scrollTop - 30;

                    // Use touch coordinates if available
                    if ('touches' in e && e.touches.length > 0) {
                        const touch = e.touches[0];
                        x = touch.pageX;
                        y = touch.pageY - 60;
                    }

                    setTooltipState({
                        text: translation,
                        x: x,
                        y: y
                    });
                }
            } else if (e.type === 'touchstart' || e.type === 'mousedown') {
                setTooltipState(null);
            }
        };

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains(styles.dictionaryWord)) {
                setTooltipState(null);
            }
        };
        const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (!target || !target.classList) return; 

            if (target.classList.contains(styles.dictionaryWord) && tooltipState) {
                const translationRaw = target.getAttribute('data-translation');
                const translation = translationRaw ? decodeHtmlEntities(translationRaw).trim() : '';
                const word = target.textContent;

                if (word && translation) {
                    const rect = target.getBoundingClientRect();
                    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;

                    setTooltipState({
                        text: translation,
                        x: rect.left + scrollLeft + rect.width / 2,
                        y: rect.top + scrollTop - 30
                    });
                }
            }
        };
        document.addEventListener('mouseover', handleShowTooltip);
        document.addEventListener('mouseout', handleMouseOut);
        document.addEventListener('touchstart', handleShowTooltip, { passive: true });
        document.addEventListener('mousedown', handleShowTooltip);
        document.addEventListener('mousemove', handleMouseMove);
        return () => {
            document.removeEventListener('mouseover', handleShowTooltip);
            document.removeEventListener('mouseout', handleMouseOut);
            document.removeEventListener('touchstart', handleShowTooltip);
            document.removeEventListener('mousedown', handleShowTooltip);
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [dictionaryItems, highlightedWords, tooltipState]);

    const parseDoTags = (message: string): (string | JSX.Element)[] => {
        const parts = message.split(/(<do>.*?<\/do>)/g);
        return parts.map((part: string, index: number) => {
            if (part.startsWith('<do>') && part.endsWith('</do>')) {
                const content = part.replace(/<\/?do>/g, '');
                return <span key={index} className={styles.accent}>{content}</span>;
            }
            return part;
        }).filter((part: string | JSX.Element) => part !== '');
    };

    return (
        <div className={styles.container}>
            <div className={styles.ambientGlow} />
            <div className={`${styles.ambientGlow} ${styles.ambientGlowSecond}`} />
            <div className={styles.content}>
            {notification && (
                <div className="mb-3">
                    <StatusNotification
                        type="info"
                        message={notification}
                        onClose={() => setNotification(null)}
                    />
                </div>
            )}
            <div className={styles.headerGroup}>
                <span className={styles.eyebrow}>05 // TEXT & AI</span>
                <h1 className={styles.pageTitle}>
                    {parseDoTags(intl.formatMessage({
                        id: 'videoPage.learnFromText',
                        defaultMessage: 'Learn from <do>text</do>'
                    }))}
                </h1>
            </div>

            { }
            <div className={styles.mainContent}>
                { }
                <div className={styles.header}>
                    <div className={styles.wordCounter}>
                        <div className={styles.counterDot}></div>
                        <span>{foundWordsCount} {intl.formatMessage({ id: 'textPasteHighlighter.knownWords' })}</span>
                    </div>
                    <input
                        type="text"
                        className={styles.topicInput}
                        placeholder={intl.formatMessage({ id: 'textPasteHighlighter.topicPlaceholder', defaultMessage: 'Topic (optional)' })}
                        value={topicInput}
                        onChange={(e) => setTopicInput(e.target.value)}
                        disabled={isGenerating}
                    />
                    <div className={styles.levelButtons}>
                        {['A1', 'A2', 'B1', 'B2', 'C1'].map(level => (
                            <button
                                key={level}
                                className={`${styles.levelButton} ${selectedLevel === level ? styles.levelButtonActive : ''}`}
                                onClick={() => handleLevelClick(level)}
                                disabled={isGenerating}
                                title={intl.formatMessage({ id: `textPasteHighlighter.level${level}`, defaultMessage: `Generate ${level} level text` })}
                            >
                                {level}
                            </button>
                        ))}
                    </div>
                    <div className={styles.headerControls}>
                        <button
                            className={styles.pasteButton}
                            onClick={pasteFromClipboard}
                            disabled={isGenerating}
                            title={intl.formatMessage({ id: 'textPasteHighlighter.pasteButton' })}
                        >
                            <Clipboard size={16} />
                        </button>
                        <button
                            className={styles.trashButton}
                            onClick={clearText}
                            disabled={isGenerating}
                            title={intl.formatMessage({ id: 'textPasteHighlighter.clearButton' })}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                </div>
                <div className={styles.textInputContainer}>
                    <div
                        className={styles.textInput}
                        contentEditable={true}
                        suppressContentEditableWarning={true}
                        ref={textDisplayRef}
                        onInput={handleInput}
                        onPaste={handlePaste}
                        onMouseUp={handleTextSelection}
                        onTouchEnd={handleTextSelection}
                        onContextMenu={e => e.preventDefault()}
                        spellCheck={true}
                        data-placeholder={getPlaceholderStart()}
                    />
                </div>
            </div>

            { }
            {tooltipState && createPortal(
                <div
                    className={styles.wordTooltip}
                    style={{
                        left: tooltipState.x,
                        top: tooltipState.y
                    }}
                >
                    {tooltipState.text}
                </div>,
                document.body
            )}

            { }
            {mobileHint}

            { }
            {popover}

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
                            border: '1px solid rgba(255,255,255,0.2)',
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
                                    background: '#ffffff',
                                    color: '#000000',
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

            { }
            {showConfirmModal && createPortal(
                <div className={styles.modalOverlay} onClick={handleConfirmCancel}>
                    <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalTitle}>
                            {intl.formatMessage({ id: 'textPasteHighlighter.modal.title' })}
                        </div>
                        <div className={styles.modalMessage}>
                            {intl.formatMessage({ id: 'textPasteHighlighter.modal.message' })}
                        </div>
                        <div className={styles.modalButtons}>
                            <button
                                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                                onClick={handleConfirmCancel}
                            >
                                {intl.formatMessage({ id: 'textPasteHighlighter.modal.cancel' })}
                            </button>
                            <button
                                className={`${styles.modalButton} ${styles.modalButtonSecondary}`}
                                onClick={handleConfirmAppend}
                            >
                                {intl.formatMessage({ id: 'textPasteHighlighter.modal.append' })}
                            </button>
                            <button
                                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
                                onClick={handleConfirmReplace}
                            >
                                {intl.formatMessage({ id: 'textPasteHighlighter.modal.replace' })}
                            </button>
                        </div>
                    </div>
                </div>, document.body)}

            { }
            {isGenerating && createPortal(
                <div className={styles.generatingOverlay}>
                    <div className={styles.generatingSpinner}>
                        <div className={styles.spinner}></div>
                        <p>{intl.formatMessage({ id: 'textPasteHighlighter.generating', defaultMessage: 'Generating text...' })}</p>
                    </div>
                </div>, document.body)}

            { }
            {showLevelConfirmModal && createPortal(
                <div className={styles.modalOverlay} onClick={handleLevelConfirmCancel}>
                    <div className={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalTitle}>
                            {intl.formatMessage({ id: 'textPasteHighlighter.levelModal.title', defaultMessage: 'Replace text?' })}
                        </div>
                        <div className={styles.modalMessage}>
                            {intl.formatMessage({ id: 'textPasteHighlighter.levelModal.message', defaultMessage: `Generating new text will replace your current text. Continue?` })}
                        </div>
                        <div className={styles.modalButtons}>
                            <button
                                className={`${styles.modalButton} ${styles.modalButtonCancel}`}
                                onClick={handleLevelConfirmCancel}
                            >
                                {intl.formatMessage({ id: 'textPasteHighlighter.modal.cancel' })}
                            </button>
                            <button
                                className={`${styles.modalButton} ${styles.modalButtonPrimary}`}
                                onClick={handleLevelConfirmGenerate}
                            >
                                {intl.formatMessage({ id: 'textPasteHighlighter.levelModal.generate', defaultMessage: 'Generate' })}
                            </button>
                        </div>
                    </div>
                </div>, document.body)}
            </div>
        </div>
    );
};

export default TextPasteHighlighter;