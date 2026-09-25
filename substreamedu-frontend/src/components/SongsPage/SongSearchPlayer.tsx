import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { StatusNotification } from '../VideoPage/components/StatusNotification';
import axios, { AxiosError } from 'axios';
import { SpotifyService } from '../../services/SpotifyService';
import { SubtitleService } from '../../services/SubtitleService';
import { LanguageContext } from "../LanguageContext";
import { useIntl } from 'react-intl';
import { debugLog, debugError } from '../../utils/debug';
// PERF: Direct imports from lucide-react (bundle-barrel-imports rule)
import X from 'lucide-react/dist/esm/icons/x';
import Lightbulb from 'lucide-react/dist/esm/icons/lightbulb';
import styles from "./SongSearchPlayer.module.css";
import { createPortal } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import MobileHint from '../shared/MobileHint';
import { MOBILE_HINT_STEPS } from '../shared/MobileHint.types';
import { useSaveWord, SaveWordData, SaveWordContext, useUserDictionaryItems } from '../../hooks/useDictionary';
import { useQueryClient } from '@tanstack/react-query';
import { SongSearchBar } from './SongSearchBar';
import { SongSearchResults } from './SongSearchResults';
import { EnhancedSongSearchService } from '../../services/EnhancedSongSearchService';
import { EnhancedSong } from '../../types/song.types';
import recommendedSongsData from '../../data/recommendedSongs.json';

type Track = {
    id: string;
    name: string;
    artist: string;
    spotifyUrl: string;
    embedUrl: string;
};



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

interface ErrorResponse {
    status: number;
    message: string;
    localDateTime: string;
}

export default function SongSearchPlayer() {
    const intl = useIntl();
    const { learningLanguage: contextLearningLanguage, fluentLanguage } = useContext(LanguageContext);

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.08,
                delayChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 16 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
        }
    };

    const learningLanguage = contextLearningLanguage || 'en';

    const { data: userDictionaryItems } = useUserDictionaryItems();

    const [notification, setNotification] = useState<string | null>(null);

    const showNotification = (message: string) => {
        setNotification(message);
        setTimeout(() => setNotification(null), 3000);
    };

    useEffect(() => {
        debugLog('Language context values:', { learningLanguage, fluentLanguage });
    }, [learningLanguage, fluentLanguage]);

    const [query, setQuery] = useState('');
    const [track, setTrack] = useState<Track | null>(null);
    const [lyrics, setLyrics] = useState('');

    const [loading, setLoading] = useState(false);
    const [selectedLevel, setSelectedLevel] = useState<'A1' | 'A2' | 'B1' | 'B2' | 'C1'>('A1');
    const [selectedRecommendedSong, setSelectedRecommendedSong] = useState<{ title: string, artist: string } | null>(null);

    // Enhanced search states
    const [enhancedSearchResults, setEnhancedSearchResults] = useState<EnhancedSong[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [selectedEnhancedSong, setSelectedEnhancedSong] = useState<EnhancedSong | null>(null);

    const [translation, setTranslation] = useState<string | null>(null);
    const [definition, setDefinition] = useState<string | null>(null);
    const [imageUrl, setImageUrl] = useState<string | null>(null);
    const [showImage, setShowImage] = useState<boolean>(true);
    const [transcription, setTranscription] = useState<string | null>(null);
    // Enhanced translation fields
    const [examples, setExamples] = useState<string[] | null>(null);
    const [synonyms, setSynonyms] = useState<string[] | null>(null);
    const [recommendedSelections, setRecommendedSelections] = useState<string[] | null>(null);
    const [otherMeanings, setOtherMeanings] = useState<string[] | null>(null);
    const [collocations, setCollocations] = useState<string[] | null>(null);
    const [note, setNote] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [highlightedWords, setHighlightedWords] = useState<string[]>([]);


    const [selectedText, setSelectedText] = useState<string | null>(null);
    const [selectedSentence, setSelectedSentence] = useState<string | null>(null);
    const [showSubmitButton, setShowSubmitButton] = useState(false);
    const [selectionPosition, setSelectionPosition] = useState<SelectionPosition | null>(null);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const [dictionaryItems, setDictionaryItems] = useState<DictionaryItem[]>([]);

    const lyricsContainerRef = useRef<HTMLDivElement>(null);
    const playerContainerRef = useRef<HTMLDivElement>(null);
    const searchAreaRef = useRef<HTMLDivElement>(null);

    const [activeSelection, setActiveSelection] = useState<{ text: string; range: Range } | null>(null);

    const [isMobile, setIsMobile] = useState(false);
    const [showMobileHint, setShowMobileHint] = useState(true);

    const [tooltipState, setTooltipState] = useState<{
        text: string;
        x: number;
        y: number;
    } | null>(null);

    const popoverRef = useRef<HTMLDivElement | null>(null);
    const [measuredPopoverHeight, setMeasuredPopoverHeight] = useState<number>(200);

    const [popoverTransform, setPopoverTransform] = useState<string>('translateX(-50%)');
    const [showLanguageOverlay, setShowLanguageOverlay] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    }, []);

    useEffect(() => {
        if (!track?.name) return;

        if (userDictionaryItems) {
            const items = userDictionaryItems;
            const actualItems = Array.isArray(items) ? items : (items && (items as any).items ? (items as any).items : []);
            const normalizedItems = actualItems.map((item: any) => ({
                ...item,
                normalizedText: item.highlightedText?.toLowerCase().trim() || ''
            }));
            setDictionaryItems(normalizedItems);
            setHighlightedWords(normalizedItems.map((item: any) => item.normalizedText));
        }
    }, [userDictionaryItems, track?.name]);

    const highlightText = useCallback((text: string) => {
        if (!text) return text;

        const wordMap = new Map<string, { translations: string[], definitions: string[] }>();

        for (const item of dictionaryItems) {
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

            const spanHtml = `<span class="${styles.highlightedText}" data-translation="${escapedTranslation}" data-definition="">${escapedOriginalText}</span>`;
            result = result.slice(0, match.start) + spanHtml + result.slice(match.end);
        }

        return result;
    }, [dictionaryItems]);

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
                } else if (/\s/.test(char)) {
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

    const handleSearch = async (searchQuery?: string) => {
        const queryToUse = searchQuery || query;
        if (!queryToUse.trim()) return;
        setLoading(true);
        setLyrics('');
        setTrack(null);

        try {
            debugLog('Searching track via SpotifyService...');
            const item = await SpotifyService.searchTrack(queryToUse);

            if (!item) {
                debugLog('Track not found');
                setLoading(false);
                setLyrics('Song not found');
                return;
            }

            debugLog('Track found:', item.name, 'artist:', item.artists[0]?.name);

            const selectedTrack: Track = {
                id: item.id,
                name: item.name,
                artist: item.artists[0]?.name || 'Unknown Artist',
                spotifyUrl: item.external_urls?.spotify || '',
                embedUrl: `https://open.spotify.com/embed/track/${item.id}`,
            };

            setTrack(selectedTrack);
            if (!searchQuery) {
                setQuery(queryToUse);
            }

            // Fetch lyrics from backend API
            debugLog('Fetching lyrics from backend...');
            const lyricsResult = await EnhancedSongSearchService.getLyrics(selectedTrack.artist, selectedTrack.name);
            if (lyricsResult?.text) {
                setLyrics(lyricsResult.text);
                debugLog(`Found lyrics from ${lyricsResult.source}`);
            } else {
                setLyrics('Song lyrics not found');
            }

            setTimeout(() => {
                playerContainerRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }, 100);

        } catch (error) {
            debugError('Error during search:', error);
            if (axios.isAxiosError(error)) {
                debugError('Error status:', error.response?.status);
                debugError('Error data:', error.response?.data);
            }
            setLyrics('An error occurred while searching for the song');
            setTrack(null);
        } finally {
            setLoading(false);
        }
    };

    const handleEnhancedSearch = async (searchQuery: string) => {
        debugLog('handleEnhancedSearch called with:', searchQuery);
        setSearchLoading(true);
        setEnhancedSearchResults([]);

        try {
            const results = await EnhancedSongSearchService.searchSongs({
                query: searchQuery,
                limit: 6
            });

            debugLog('Search completed, results:', results.length, results);
            setEnhancedSearchResults(results);
        } catch (error) {
            debugError('Enhanced search error:', error);
            setNotification('Error searching for songs. Please try again.');
        } finally {
            setSearchLoading(false);
        }
    };

    const handleRecommendedSongClick = async (title: string, artist: string) => {
        const searchQuery = `${artist} ${title}`;
        debugLog('Loading recommended song:', searchQuery);

        // Mark this song as selected
        setSelectedRecommendedSong({ title, artist });

        // Clear current song and results to reset UI
        setTrack(null);
        setLyrics('');
        setSelectedEnhancedSong(null);
        setEnhancedSearchResults([]);

        // Scroll to search area to show results
        setTimeout(() => {
            searchAreaRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);

        await handleEnhancedSearch(searchQuery);
    };

    const handleEnhancedSongSelect = async (song: EnhancedSong) => {
        debugLog('Selected song:', song);
        setSelectedEnhancedSong(song);
        setLoading(true);
        setLyrics('');
        setTrack(null);

        // Scroll to player immediately when song is selected
        setTimeout(() => {
            playerContainerRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }, 100);

        try {
            // Set track info first for faster UI update
            // Priority: YouTube > Spotify
            if (song.audio?.youtubeUrl) {
                // Extract video ID and create YouTube embed
                const videoId = song.audio.youtubeUrl.split('v=')[1]?.split('&')[0] ||
                    song.audio.youtubeUrl.split('youtu.be/')[1]?.split('?')[0];

                if (videoId) {
                    setTrack({
                        id: videoId,
                        name: song.title,
                        artist: song.artist,
                        spotifyUrl: '',
                        embedUrl: `https://www.youtube.com/embed/${videoId}`
                    });
                }
            } else if (song.audio?.spotifyEmbedUrl) {
                const trackId = song.audio.spotifyEmbedUrl.split('/').pop() || song.id;
                setTrack({
                    id: trackId,
                    name: song.title,
                    artist: song.artist,
                    spotifyUrl: song.audio.spotifyUrl || '',
                    embedUrl: song.audio.spotifyEmbedUrl
                });
            } else {
                // Try searching Spotify for this song
                await handleSearch(`${song.title} ${song.artist}`);
            }

            // Then fetch lyrics
            if (song.lyrics?.text) {
                debugLog('Using existing lyrics from song object');
                setLyrics(song.lyrics.text);
            } else {
                debugLog('Fetching lyrics...');

                const lyricsResult = await EnhancedSongSearchService.getLyrics(song.artist, song.title);
                if (lyricsResult) {
                    debugLog(`Lyrics loaded from ${lyricsResult.source}`);
                    setLyrics(lyricsResult.text);
                } else {
                    debugLog('No lyrics found');
                    setLyrics(
                        `🎵 Lyrics not available right now\n\n` +
                        `We couldn't find lyrics for "${song.title}" by ${song.artist}\n\n` +
                        `This happens because:\n` +
                        `• Free lyrics APIs have rate limits and CORS restrictions\n` +
                        `• Some songs aren't in public databases\n` +
                        `• APIs may be temporarily unavailable\n\n` +
                        `💡 What you can do:\n` +
                        `• Try searching from the local song library (below the search bar)\n` +
                        `• Wait a few minutes and try again\n` +
                        `• Search for a different song\n` +
                        `• The lyrics APIs work intermittently - refresh and try again!`
                    );
                }
            }

            // Clear loading state as soon as data is ready
            setLoading(false);
        } catch (error) {
            debugError('Error loading enhanced song:', error);
            setLyrics('Error loading song. Please try again.');
            setLoading(false);
        }
    };

    const findSentenceForText = (text: string, selected: string) => {
        if (!selected || !text) return null;

        const lines = text.split('\n');

        for (const line of lines) {
            if (line.includes(selected)) {
                return line.trim();
            }
        }

        const cleanedText = text.replace(/\s+/g, ' ').trim();
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

    // Get extended context (previous + current + next line) for better translation quality
    const getExtendedContext = (text: string, selected: string): string => {
        if (!text || !selected) return '';

        const lines = text.split('\n').filter(line => line.trim());
        const currentLineIndex = lines.findIndex(line => line.includes(selected));

        if (currentLineIndex === -1) return selected;

        const contextParts: string[] = [];

        // Add previous line
        if (currentLineIndex > 0) {
            contextParts.push(lines[currentLineIndex - 1].trim());
        }

        // Add current line
        contextParts.push(lines[currentLineIndex].trim());

        // Add next line
        if (currentLineIndex < lines.length - 1) {
            contextParts.push(lines[currentLineIndex + 1].trim());
        }

        return contextParts.join(' ');
    };

    const handleTextSelection = () => {
        const selection = window.getSelection();
        if (!selection || selection.toString().trim().length < 2) {
            if (!isMobile) {
                setActiveSelection(null);
                setIsPopoverOpen(false);
            }
            return;
        }

        const selectedText = selection.toString().trim();
        debugLog('Selected text:', selectedText);
        const range = selection.getRangeAt(0);

        if (isMobile) {
            setTimeout(() => {
                processSelection(selectedText, range);
            }, 300);
        } else {
            processSelection(selectedText, range);
        }
    };

    const processSelection = (selectedText: string, range: Range) => {
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
        setNote('');
        setIsLoading(true);

        setActiveSelection({ text: selectedText, range });

        setSelectedText(selectedText);

        showSelectionTooltip(range);
        const sentence = findSentenceForText(lyrics, selectedText);
        debugLog('Found sentence:', sentence);
        if (sentence) {
            setSelectedSentence(sentence);
            const extendedCtx = getExtendedContext(lyrics, selectedText);
            fetchTranslation(selectedText, sentence, isSingleWord, extendedCtx);
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

    const resetPopoverState = () => {
        setSelectedText(null);
        setSelectedSentence(null);
        setTranslation(null);
        setDefinition(null);
        setImageUrl(null);
        setShowImage(true);
        setTranscription(null);
        // Reset enhanced fields
        setExamples(null);
        setSynonyms(null);
        setRecommendedSelections(null);
        setOtherMeanings(null);
        setCollocations(null);
        setNote('');
        setIsLoading(false);
        setShowSubmitButton(false);
        setSelectionPosition(null);
        setActiveSelection(null);
    };

    useEffect(() => {
        setIsPopoverOpen(false);
        resetPopoverState();
    }, [track?.name]);

    const fetchTranslation = async (text: string, sentence: string, isSingleWord: boolean, extended?: string) => {
        debugLog('Starting fetchTranslation for:', { text, sentence, isSingleWord });
        setIsLoading(true);
        setShowSubmitButton(false);

        if (isMobile) {
            setActiveSelection(null);
        }

        if (!fluentLanguage) {
            setNotification('Select a language in the header to translate');
            setIsLoading(false);
            return;
        }

        const originalPromise = SubtitleService.getTranslationProd({
            resourceName: track?.name || 'Unknown Song',
            highlightedText: text,
            context: sentence,
            extendedContext: extended,
            learningLanguage: learningLanguage,
            fluentLanguage: fluentLanguage,
        }).catch(error => {
            if (error?.message === 'GUEST_LIMIT_REACHED') {
                setIsLoading(false);
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
                // Set enhanced fields
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
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isPopoverOpen) {
            setShowSubmitButton(false);
        }
    }, [isPopoverOpen]);

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

            setDictionaryItems((prevItems) => [...prevItems, optimisticItem]);
            setHighlightedWords((prev) => [...prev, newData.highlightedText]);

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
            const errorResponse = err as ErrorResponse;
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
            debugError("Mutation failed", err);
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
            resourceName: track?.name || 'Unknown Song',
            highlightedText: selectedText,
            context: selectedSentence,
            translation: translationData.translation || '',
            note: note,
            transcription: translationData.transcription || '',
            definition: translationData.definition || '',
            imageUrl: translationData.imageUrl || ''
        });
    };

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

    // Re-apply highlighting when dictionaryItems or lyrics change.
    // React skips re-rendering dangerouslySetInnerHTML inside contentEditable containers,
    // so we must manually update innerHTML when the dictionary data arrives.
    useEffect(() => {
        if (lyrics && lyricsContainerRef.current) {
            const lyricsDiv = lyricsContainerRef.current.querySelector(`.${styles.lyrics}`);
            if (lyricsDiv) {
                lyricsDiv.innerHTML = highlightText(lyrics);
            }
        }
    }, [dictionaryItems, lyrics, highlightText]);

    useEffect(() => {
        if (popoverRef.current) {
            setMeasuredPopoverHeight(popoverRef.current.offsetHeight);
        }
    }, [translation, definition, imageUrl, isLoading]);

    useEffect(() => {
        if ((translation || definition) && activeSelection) {
            showSelectionTooltip(activeSelection.range);
        }
    }, [translation, definition, imageUrl, measuredPopoverHeight, activeSelection, showSelectionTooltip]);

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
        <motion.div className={styles.container} initial="hidden" animate="visible" variants={containerVariants}>
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

            <motion.div className={styles.headerGroup} variants={itemVariants} ref={searchAreaRef}>
                <span className={styles.eyebrow}>04 // SONGS & LYRICS</span>
                <h1 className={styles.pageTitle}>
                    {parseDoTags(intl.formatMessage({
                        id: 'songs.learnFromSongs',
                        defaultMessage: 'Learn from <do>songs</do>'
                    }))}
                </h1>
            </motion.div>

            {/* Enhanced Search Bar */}
            <motion.div className="mb-8" variants={itemVariants}>
                <SongSearchBar
                    onSearch={handleEnhancedSearch}
                    loading={searchLoading}
                />
            </motion.div>

            {/* Enhanced Search Results */}
            {(searchLoading || enhancedSearchResults.length > 0) && (
                <motion.div variants={itemVariants}>
                    <SongSearchResults
                        songs={enhancedSearchResults}
                        onSongSelect={handleEnhancedSongSelect}
                        selectedSongId={selectedEnhancedSong?.id}
                        loading={searchLoading}
                    />
                    <Separator className={styles.sectionSeparator} />
                </motion.div>
            )}

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
            <MobileHint
                isVisible={isMobile && showMobileHint}
                onClose={() => setShowMobileHint(false)}
                steps={MOBILE_HINT_STEPS.SONGS_AND_TEXT}
            />

            {/* Level Selector and Recommended Songs */}
            <motion.div variants={itemVariants} style={{ width: '100%' }}>
                <Card className={styles.searchCard}>
                <CardHeader>
                    <CardTitle className="text-xl md:text-2xl">
                        {intl.formatMessage({
                            id: 'songs.recommendedByLevel',
                            defaultMessage: 'Recommended Songs by Level'
                        })}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className={styles.levelSelectorRow}>
                        {(['A1', 'A2', 'B1', 'B2', 'C1'] as const).map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setSelectedLevel(lvl)}
                                className={`${styles.levelSelectorButton} ${selectedLevel === lvl ? styles.levelSelectorButtonActive : ''}`}
                                aria-label={`Select recommended songs for level ${lvl}`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>

                    <div className={styles.songList}>
                        {(recommendedSongsData[selectedLevel] as Array<{ title: string, artist: string, reason: string }>).map((song, idx) => {
                            const isSelected = selectedRecommendedSong?.title === song.title && selectedRecommendedSong?.artist === song.artist;
                            return (
                                <Card
                                    key={`${song.title}-${song.artist}-${idx}`}
                                    className={styles.songItemCard}
                                    onClick={() => handleRecommendedSongClick(song.title, song.artist)}
                                    role="button"
                                    aria-label={`Select recommended song: ${song.title} by ${song.artist}`}
                                    tabIndex={0}
                                    onKeyDown={(e: React.KeyboardEvent) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            handleRecommendedSongClick(song.title, song.artist);
                                        }
                                    }}
                                    style={{
                                        borderColor: isSelected ? '#faf92f' : undefined,
                                        backgroundColor: isSelected ? '#141412' : undefined
                                    }}
                                >
                                    <CardContent className="p-5">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                                <h3 className={styles.recommendedSongTitle}>
                                                    {song.title}
                                                </h3>
                                                <p className={styles.recommendedSongArtist}>{song.artist}</p>
                                            </div>
                                            <span className={styles.recommendedLevelBadge}>
                                                {selectedLevel}
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>
            </motion.div>
            <Separator className={styles.sectionSeparator} />
            {track && (
                <motion.div variants={itemVariants} style={{ width: '100%' }}>
                    <Card className={styles.trackInfoCard} ref={playerContainerRef}>
                    <CardHeader>
                        <CardTitle className={styles.trackTitle}>{track.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={styles.trackArtist}>{track.artist}</div>
                        {/* Render YouTube or Spotify embed based on availability */}
                        {track.embedUrl?.includes('youtube.com') ? (
                            <>
                                <iframe
                                    src={track.embedUrl}
                                    width="100%"
                                    height="315"
                                    frameBorder="0"
                                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                    allowFullScreen
                                    className={styles.spotifyPlayer}
                                    title={`YouTube player for ${track.name}`}
                                />
                                <div className={styles.playerNotice}>
                                    <p className={`${styles.playerNoticeText} flex items-center gap-1.5`}>
                                        <Lightbulb size={14} className="text-primary shrink-0" /> <span className={styles.playerNoticeStrong}>YouTube Player:</span> Full songs available for free!
                                    </p>
                                </div>
                            </>
                        ) : (
                            <>
                                <iframe
                                    src={track.embedUrl}
                                    width="100%"
                                    height="80"
                                    frameBorder="0"
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    className={styles.spotifyPlayer}
                                    title={`Spotify player for ${track.name}`}
                                />
                                <div className={styles.playerNotice}>
                                    <p className={`${styles.playerNoticeText} flex items-center gap-1.5`}>
                                        <Lightbulb size={14} className="text-primary shrink-0" /> <span className={styles.playerNoticeStrong}>Tip:</span> Log in to your Spotify account in your browser to listen to full songs
                                    </p>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
                </motion.div>
            )}

            {loading && <div className={styles.loading}>Loading...</div>}
            {lyrics && (
                <motion.div variants={itemVariants} style={{ width: '100%' }}>
                    <Card className={styles.lyricsCard}>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg">Lyrics</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div
                            ref={lyricsContainerRef}
                            className={styles.lyricsContainer}
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            onMouseUp={handleTextSelection}
                            onTouchEnd={handleTextSelection}
                            onContextMenu={(e) => e.preventDefault()}
                            onBeforeInput={(e) => e.preventDefault()}
                            onKeyDown={(e) => e.preventDefault()}
                            onPaste={(e) => e.preventDefault()}
                            onCut={(e) => e.preventDefault()}
                            onDrop={(e) => e.preventDefault()}
                            style={{ outline: 'none', cursor: 'text', userSelect: 'text', WebkitUserSelect: 'text' }}
                        >
                            <div
                                className={styles.lyrics}
                                dangerouslySetInnerHTML={{ __html: highlightText(lyrics) }}
                            />
                        </div>
                    </CardContent>
                </Card>
                </motion.div>
            )}
            {selectionPosition && isPopoverOpen && (translation || isLoading) && createPortal(
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
                                        <span className={styles.translationText}>{definition}{translation?.trim() && <span style={{ opacity: 0.5, fontSize: '0.9em' }}><br/>({translation})</span>}</span>
                                    </div>
                                ) : (
                                    translation?.trim() && (
                                        <div className={styles.translationRow}>
                                            <span
                                                className={`${styles.translationText} ${((translation?.includes('could not translate') || translation?.includes('Error fetching translation')) ? styles.errorText : '')}`}>{translation}</span>
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

                        {/* AI metadata fields matching VideoPlayer */}
                        {(() => {
                            const matchingSelections = (recommendedSelections || []).filter(
                                (rec: string) => selectedSentence?.toLowerCase().includes(rec.toLowerCase())
                            );
                            const bestMatch = matchingSelections.sort((a: string, b: string) => b.length - a.length)[0];

                            return (
                                <>
                                    {bestMatch && (
                                        <div style={{
                                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '8px',
                                            padding: '8px 12px',
                                            margin: '4px 0 8px 0',
                                            fontSize: '12px',
                                            color: '#e8e8e8',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                            lineHeight: '1.4'
                                        }}>
                                            <Lightbulb size={14} className="text-primary shrink-0" />
                                            <span style={{ fontWeight: '600' }}>{bestMatch}</span>
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
                                    title="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.fullscreenElement || document.body
            )}

            {
                showLanguageOverlay && createPortal(
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
                        role="presentation"
                    >
                        <div
                            style={{
                                background: 'rgba(20,20,20,0.85)',
                                border: '1px solid rgba(0,51,255,0.4)',
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
                                Select a language in the header to translate
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
                                aria-label="Dismiss language overlay"
                            >
                                OK
                            </button>
                        </div>
                    </div>,
                    document.fullscreenElement || document.body
                )
            }
            </div>

        </motion.div >
    );
}