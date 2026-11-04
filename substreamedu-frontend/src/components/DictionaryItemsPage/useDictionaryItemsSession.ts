import React, { useEffect, useState, useCallback, useRef } from 'react';
import { DictionaryService } from '../../services/DictionaryService';

export interface DictionaryItem {
    id: number;
    resourceName: string;
    highlightedText: string;
    translatedText: string;
    context: string;
    note: string;
    definition: string;
    imageUrl: string;
    transcription: string;
}

export type CardAnimationState =
    | 'idle'
    | 'exiting-left'
    | 'exiting-right'
    | 'entering-left'
    | 'entering-right';

export const cleanTranscription = (t: string | null | undefined): string =>
    t ? t.replace(/^[/\[\s]+|[/\]\s]+$/g, '').trim() : '';

export const highlightContext = (
    context: string,
    highlightedText: string,
    highlightClass: string
): string => {
    if (!context || !highlightedText) return '';
    const cleanContext = context
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .trim();
    const escapedWord = highlightedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedWord})`, 'gi');
    return cleanContext.replace(regex, `<strong class="${highlightClass}">$1</strong>`);
};

export const useDictionaryItemsSession = (resourceName: string | undefined) => {
    const [dictionaryItems, setDictionaryItems] = useState<DictionaryItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [error, setError] = useState<string>('');
    const [flipped, setFlipped] = useState(false);
    const [animationState, setAnimationState] = useState<CardAnimationState>('idle');
    const [isShuffle, setIsShuffle] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingAll, setIsFetchingAll] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [failedImageKeys, setFailedImageKeys] = useState<Record<string, boolean>>({});
    const loadMoreRef = useRef<HTMLDivElement>(null);

    const activeCard = dictionaryItems[currentIndex];
    const activeImageKey = activeCard?.imageUrl ? `${activeCard.id}:${activeCard.imageUrl}` : null;
    const imageFailed = Boolean(activeImageKey && failedImageKeys[activeImageKey]);

    const handleImageError = useCallback(() => {
        if (activeImageKey) {
            setFailedImageKeys(prev => ({ ...prev, [activeImageKey]: true }));
        }
    }, [activeImageKey]);

    const fetchDictionaryItems = useCallback(async () => {
        setError('');
        if (!resourceName) {
            setError('Resource name is missing');
            return;
        }
        try {
            setIsLoading(true);
            const result = await DictionaryService.fetchDictionaryItemsPaginated(resourceName, 0, 50);
            setDictionaryItems(result.items);
            setCursor(result.nextCursor);
            setHasMore(result.hasMore);
            setTotalCount(result.totalCount);
            setCurrentIndex(0);
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            }
        } finally {
            setIsLoading(false);
        }
    }, [resourceName]);

    const loadMoreItems = useCallback(async () => {
        if (!resourceName || !hasMore || isLoadingMore || cursor === null) return;
        setIsLoadingMore(true);
        try {
            const result = await DictionaryService.fetchDictionaryItemsPaginated(resourceName, cursor, 50);
            setDictionaryItems(prev => [...prev, ...result.items]);
            setCursor(result.nextCursor);
            setHasMore(result.hasMore);
            return result;
        } catch (err) {
            console.error('Failed to load more items:', err);
        } finally {
            setIsLoadingMore(false);
        }
    }, [resourceName, cursor, hasMore, isLoadingMore]);

    const fetchAllItems = useCallback(async () => {
        if (!resourceName || !hasMore || isFetchingAll) return;
        setIsFetchingAll(true);
        try {
            let currentCursor = cursor;
            let currentHasMore: boolean = hasMore;
            const allNewItems: DictionaryItem[] = [];

            while (currentHasMore && currentCursor !== null) {
                const result = await DictionaryService.fetchDictionaryItemsPaginated(resourceName, currentCursor, 100);
                allNewItems.push(...result.items);
                currentCursor = result.nextCursor;
                currentHasMore = result.hasMore;
            }

            setDictionaryItems(prev => [...prev, ...allNewItems]);
            setCursor(currentCursor);
            setHasMore(currentHasMore);
        } catch (err) {
            console.error('Failed to fetch all items:', err);
            setError('Failed to load all items for shuffle');
        } finally {
            setIsFetchingAll(false);
        }
    }, [resourceName, hasMore, isFetchingAll, cursor]);

    useEffect(() => {
        fetchDictionaryItems();
    }, [fetchDictionaryItems]);

    useEffect(() => {
        if (typeof IntersectionObserver === 'undefined') return;
        const observer = new IntersectionObserver(
            entries => {
                if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
                    loadMoreItems();
                }
            },
            { threshold: 0.1 }
        );

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current);
        }

        return () => observer.disconnect();
    }, [hasMore, isLoadingMore, loadMoreItems]);

    const showNextCard = useCallback(() => {
        if (dictionaryItems.length === 0) return;

        if (hasMore && !isLoadingMore && currentIndex >= dictionaryItems.length - 10) {
            loadMoreItems();
        }

        setFlipped(false);
        setAnimationState('exiting-left');
        setTimeout(() => {
            if (isShuffle) {
                let nextIndex = 0;
                if (dictionaryItems.length > 1) {
                    do {
                        nextIndex = Math.floor(Math.random() * dictionaryItems.length);
                    } while (nextIndex === currentIndex);
                }
                setCurrentIndex(nextIndex);
            } else {
                if (!hasMore && currentIndex === dictionaryItems.length - 1) {
                    setCurrentIndex(0);
                } else if (currentIndex < dictionaryItems.length - 1) {
                    setCurrentIndex(prev => prev + 1);
                }
            }
            setAnimationState('entering-right');
            setTimeout(() => setAnimationState('idle'), 250);
        }, 250);
    }, [dictionaryItems.length, isShuffle, currentIndex, hasMore, isLoadingMore, loadMoreItems]);

    const showPreviousCard = useCallback(() => {
        if (dictionaryItems.length === 0) return;
        setFlipped(false);
        setAnimationState('exiting-right');
        setTimeout(() => {
            if (isShuffle) {
                let prevIndex = 0;
                if (dictionaryItems.length > 1) {
                    do {
                        prevIndex = Math.floor(Math.random() * dictionaryItems.length);
                    } while (prevIndex === currentIndex);
                }
                setCurrentIndex(prevIndex);
            } else {
                setCurrentIndex(prevIndex => (prevIndex - 1 + dictionaryItems.length) % dictionaryItems.length);
            }
            setAnimationState('entering-left');
            setTimeout(() => setAnimationState('idle'), 250);
        }, 250);
    }, [dictionaryItems.length, isShuffle, currentIndex]);

    const toggleCardFlip = useCallback(() => setFlipped(prev => !prev), []);

    const handleToggleShuffle = useCallback(async () => {
        if (!isShuffle && hasMore) {
            await fetchAllItems();
        }
        setIsShuffle(prev => !prev);
    }, [isShuffle, hasMore, fetchAllItems]);

    const exportAnki = useCallback(async () => {
        if (!resourceName) return;
        setIsExporting(true);
        try {
            const blob = await DictionaryService.exportDictionaryByResourceAsAnki(resourceName);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${resourceName}_dictionary.apkg`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            if (err instanceof Error) setError(err.message);
        } finally {
            setIsExporting(false);
        }
    }, [resourceName]);

    const deleteItem = useCallback(async (resName: string, id: number) => {
        setError('');
        try {
            await DictionaryService.deleteDictionaryItem(resName, id);
            setDictionaryItems(prevItems => {
                const updatedItems = prevItems.filter(item => item.id !== id);
                if (currentIndex >= updatedItems.length) {
                    setCurrentIndex(Math.max(0, updatedItems.length - 1));
                }
                return updatedItems;
            });
        } catch (err) {
            if (err instanceof Error) setError(err.message);
        }
    }, [currentIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') showNextCard();
            if (e.key === 'ArrowLeft') showPreviousCard();
            if (e.key === ' ') {
                e.preventDefault();
                toggleCardFlip();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showNextCard, showPreviousCard, toggleCardFlip]);

    const touchStartXRef = useRef<number | null>(null);
    const touchEndXRef = useRef<number | null>(null);
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchEndXRef.current = null;
        touchStartXRef.current = e.targetTouches[0].clientX;
    }, []);
    const onTouchMove = useCallback((e: React.TouchEvent) => {
        touchEndXRef.current = e.targetTouches[0].clientX;
    }, []);
    const onTouchEnd = useCallback(() => {
        if (touchStartXRef.current === null || touchEndXRef.current === null) return;
        const distance = touchStartXRef.current - touchEndXRef.current;
        if (distance > 50) showNextCard();
        else if (distance < -50) showPreviousCard();
    }, [showNextCard, showPreviousCard]);

    return {
        dictionaryItems,
        currentIndex,
        setCurrentIndex,
        error,
        flipped,
        animationState,
        isShuffle,
        isLoadingMore,
        totalCount,
        isLoading,
        isFetchingAll,
        isExporting,
        loadMoreRef,
        showNextCard,
        showPreviousCard,
        toggleCardFlip,
        handleToggleShuffle,
        exportAnki,
        deleteItem,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        imageFailed,
        handleImageError,
    };
};

