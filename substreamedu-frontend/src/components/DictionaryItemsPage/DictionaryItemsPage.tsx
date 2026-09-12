import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DictionaryService } from "../../services/DictionaryService";
import { motion } from "framer-motion";
import styles from "./css/DictionaryItemsPage.module.css";

import Download from 'lucide-react/dist/esm/icons/download';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Shuffle from 'lucide-react/dist/esm/icons/shuffle';
import Play from 'lucide-react/dist/esm/icons/play';
import BinButton from './BinButton';
import { useTTS } from '../../hooks/useTTS';

interface DictionaryItem {
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

const DictionaryItemsPage: React.FC = () => {
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
        hidden: { opacity: 0, y: 15 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] }
        }
    };

    const { resourceName } = useParams<{ resourceName: string }>();
    const navigate = useNavigate();
    const [dictionaryItems, setDictionaryItems] = useState<DictionaryItem[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [error, setError] = useState<string>("");
    const [flipped, setFlipped] = useState(false);
    const [animationState, setAnimationState] = useState<'idle' | 'exiting-left' | 'exiting-right' | 'entering-left' | 'entering-right'>('idle');
    const [isShuffle, setIsShuffle] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [cursor, setCursor] = useState<number | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isFetchingAll, setIsFetchingAll] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const loadMoreRef = useRef<HTMLDivElement>(null);
    const { play: playTTS, playingItemId } = useTTS();

    const fetchDictionaryItems = useCallback(async () => {
        setError("");
        if (!resourceName) {
            setError("Resource name is missing");
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
            console.error("Failed to load more items:", err);
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
            console.error("Failed to fetch all items:", err);
            setError("Failed to load all items for shuffle");
        } finally {
            setIsFetchingAll(false);
        }
    }, [resourceName, hasMore, isFetchingAll, cursor]);

    useEffect(() => {
        fetchDictionaryItems();
    }, [fetchDictionaryItems]);

    
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
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
                let nextIndex;
                if (dictionaryItems.length > 1) {
                    do {
                        nextIndex = Math.floor(Math.random() * dictionaryItems.length);
                    } while (nextIndex === currentIndex);
                } else {
                    nextIndex = 0;
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
                let prevIndex;
                if (dictionaryItems.length > 1) {
                    do {
                        prevIndex = Math.floor(Math.random() * dictionaryItems.length);
                    } while (prevIndex === currentIndex);
                } else {
                    prevIndex = 0;
                }
                setCurrentIndex(prevIndex);
            } else {
                setCurrentIndex((prevIndex) => (prevIndex - 1 + dictionaryItems.length) % dictionaryItems.length);
            }
            setAnimationState('entering-left');
            setTimeout(() => setAnimationState('idle'), 250);
        }, 250);
    }, [dictionaryItems.length, isShuffle, currentIndex]);

    const toggleCardFlip = useCallback(() => setFlipped(prev => !prev), []);

    const redirectToYouglish = (word: string) => {
        const youglishURL = `https://youglish.com/pronounce/${word}/english`;
        window.open(youglishURL, "_blank");
    };

    const exportAnki = async () => {
        setIsExporting(true);
        try {
            const blob = await DictionaryService.exportDictionaryByResourceAsAnki(resourceName!);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `${resourceName}_dictionary.apkg`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (err) {
            if (err instanceof Error) setError(err.message);
        } finally {
            setIsExporting(false);
        }
    };

    const deleteItem = async (resourceName: string, id: number) => {
        setError("");
        try {
            await DictionaryService.deleteDictionaryItem(resourceName, id);
            setDictionaryItems((prevItems) => {
                const updatedItems = prevItems.filter((item) => item.id !== id);
                if (currentIndex >= updatedItems.length) {
                    setCurrentIndex(Math.max(0, updatedItems.length - 1));
                }
                return updatedItems;
            });
        } catch (err) {
            if (err instanceof Error) setError(err.message);
        }
    };

    const highlightContext = (context: string, highlightedText: string) => {
        if (!context || !highlightedText) return "";
        const cleanContext = context
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();
        const escapedWord = highlightedText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedWord})`, "gi");
        return cleanContext.replace(regex, `<strong class="${styles.highlight}">$1</strong>`);
    };

    // Keyboard navigation
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

    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };
    const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);
    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        if (distance > 50) showNextCard();
        else if (distance < -50) showPreviousCard();
    };

    return (
        <motion.div className={styles.pageContainer} initial="hidden" animate="visible" variants={containerVariants}>
            <motion.div className={styles.header} variants={itemVariants}>
                <div className={styles.headerLeft}>
                    <button
                        onClick={() => navigate(-1)}
                        className={styles.backButton}
                        aria-label="Go back to previous page"
                        title="Go back"
                    >
                        <ArrowLeft size={20} aria-hidden="true" />
                    </button>
                    <div className={styles.titleSection}>
                        <h1 className={styles.pageTitle}>{resourceName?.replace(/_/g, ' ')}</h1>
                        <span className={styles.itemCount}>{totalCount > 0 ? `${dictionaryItems.length} / ${totalCount}` : `${dictionaryItems.length}`} terms</span>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button
                        onClick={exportAnki}
                        className={`${styles.actionButton} ${isExporting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        aria-label="Export dictionary to Anki (.apkg) file"
                        title="Download as Anki Deck"
                        disabled={isExporting}
                    >
                        {isExporting ? (
                             <div className="w-4 h-4 rounded-full border-2 border-[#000000]/20 border-t-[#000000] animate-spin mr-1"></div>
                        ) : (
                             <Download size={18} aria-hidden="true" />
                        )
                        }
                        <span>{isExporting ? 'Exporting...' : 'Anki Export'}</span>
                    </button>
                </div>
            </motion.div>

            {error && <div className={styles.errorMessage}>{error}</div>}

            {isLoading ? (
                <motion.div className={styles.loaderContainer} variants={itemVariants}>
                    <div className={styles.spinner}></div>
                    <p className={styles.loaderText}>Loading your dictionary...</p>
                </motion.div>
            ) : dictionaryItems.length > 0 ? (
                <motion.div className={styles.contentWrapper} variants={itemVariants}>
                    <div className={styles.flashcardSection}>
                        <div className={styles.cardWrapper}>
                            <div
                                className={`${styles.card} ${flipped ? styles.flipped : ""} ${styles[animationState] || ''}`}
                                onClick={toggleCardFlip}
                                onTouchStart={onTouchStart}
                                onTouchMove={onTouchMove}
                                onTouchEnd={onTouchEnd}
                                role="button"
                                tabIndex={0}
                                aria-label={`Flashcard for ${dictionaryItems[currentIndex].highlightedText}. Side: ${flipped ? 'Definition' : 'Term'}. Click or press space to flip.`}
                                onKeyDown={(e) => {
                                    if (e.key === ' ' || e.key === 'Enter') {
                                        e.preventDefault();
                                        toggleCardFlip();
                                    }
                                }}
                            >
                                <div className={styles.cardInner}>
                                    <div className={styles.cardFront}>
                                        <div className={styles.cardContent}>
                                            <h2
                                                className={styles.wordTitle}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    redirectToYouglish(dictionaryItems[currentIndex].highlightedText);
                                                }}
                                                style={{ cursor: 'pointer' }}
                                                title="Click to go to YouGlish"
                                            >
                                                {dictionaryItems[currentIndex].highlightedText}
                                            </h2>
                                            {dictionaryItems[currentIndex].transcription &&
                                                <span className={styles.transcription}>[{dictionaryItems[currentIndex].transcription}]</span>
                                            }
                                            {dictionaryItems[currentIndex].context && (
                                                <p
                                                    className={styles.contextFlashcard}
                                                    dangerouslySetInnerHTML={{
                                                        __html: highlightContext(dictionaryItems[currentIndex].context, dictionaryItems[currentIndex].highlightedText)
                                                    }}
                                                />
                                            )}
                                            <div className={`${styles.flipHint} ${styles.desktopHint} `}>Click to flip</div>
                                            <div className={`${styles.flipHint} ${styles.mobileHint} `}>Tap to flip • Swipe to change</div>
                                        </div>
                                    </div>

                                    <div className={styles.cardBack}>
                                        <div className={styles.cardContent}>
                                            {dictionaryItems[currentIndex].imageUrl && (
                                                <div className={styles.imageContainer}>
                                                    <img
                                                        src={dictionaryItems[currentIndex].imageUrl}
                                                        alt="Visual context"
                                                        className={styles.cardImage}
                                                    />
                                                </div>
                                            )}
                                            <div className={styles.definitionSection}>
                                                <h3 className={styles.definitionText}>
                                                    {dictionaryItems[currentIndex].definition || dictionaryItems[currentIndex].translatedText}
                                                </h3>
                                                {dictionaryItems[currentIndex].definition && dictionaryItems[currentIndex].translatedText && (
                                                    <p className={styles.translationText}>
                                                        {dictionaryItems[currentIndex].translatedText}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={styles.controlsBar}>
                            <div className={styles.controlsLeft}>
                                <button
                                    className={`${styles.iconButton} ${isShuffle ? styles.active : ''} ${isFetchingAll ? styles.loading : ''}`}
                                    onClick={async () => {
                                        if (!isShuffle && hasMore) {
                                            await fetchAllItems();
                                        }
                                        setIsShuffle(!isShuffle);
                                    }}
                                    title={isFetchingAll ? "Loading more items..." : "Shuffle mode"}
                                    aria-label={isShuffle ? "Shuffle mode active, click to disable" : "Enable shuffle mode"}
                                    aria-pressed={isShuffle}
                                    disabled={isFetchingAll}
                                >
                                    <Shuffle size={20} className={isFetchingAll ? styles.rotating : ''} aria-hidden="true" />
                                    <span className="sr-only">{isShuffle ? 'Shuffle active' : 'Shuffle inactive'}</span>
                                </button>
                                {isFetchingAll && <span className={styles.loadingInfo}>Preparing shuffle...</span>}
                            </div>

                            <div className={styles.controlsCenter}>
                                <button
                                    onClick={showPreviousCard}
                                    className={styles.navButton}
                                    title="Previous card (Left Arrow or swipe right)"
                                    aria-label={`Previous card, currently on ${currentIndex + 1} of ${totalCount > 0 ? totalCount : dictionaryItems.length}`}
                                >
                                    <ArrowLeft size={24} aria-hidden="true" />
                                </button>
                                <span
                                    className={styles.counter}
                                    role="status"
                                    aria-live="polite"
                                    aria-label={`Card ${currentIndex + 1} of ${totalCount > 0 ? totalCount : dictionaryItems.length}`}
                                >
                                    {currentIndex + 1} / {totalCount > 0 ? totalCount : dictionaryItems.length}
                                </span>
                                <button
                                    onClick={showNextCard}
                                    className={styles.navButton}
                                    title="Next card (Right Arrow or swipe left)"
                                    aria-label={`Next card, currently on ${currentIndex + 1} of ${totalCount > 0 ? totalCount : dictionaryItems.length}`}
                                >
                                    <ArrowLeft size={24} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
                                </button>
                            </div>

                            <div className={styles.controlsRight}>
                                <button
                                    className={`${styles.iconButton} ${playingItemId === dictionaryItems[currentIndex].id ? styles.active : ''} `}
                                    onClick={() => playTTS(dictionaryItems[currentIndex].highlightedText, dictionaryItems[currentIndex].id)}
                                    title="Play pronunciation"
                                    aria-label={`Play pronunciation of ${dictionaryItems[currentIndex].highlightedText}`}
                                    aria-pressed={playingItemId === dictionaryItems[currentIndex].id}
                                >
                                    <Play size={20} aria-hidden="true" />
                                    <span className="sr-only">{playingItemId === dictionaryItems[currentIndex].id ? 'Playing' : 'Play audio'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.listSection}>
                        <div className={styles.listHeader}>
                            <h3>Terms in this set ({totalCount > 0 ? totalCount : dictionaryItems.length})</h3>
                        </div>
                        <div className={styles.listGrid}>
                            {dictionaryItems.map((item, index) => (
                                <div
                                    key={item.id}
                                    className={`${styles.listItem} ${currentIndex === index ? styles.activeItem : ''} `}
                                    onClick={() => setCurrentIndex(index)}
                                >
                                    <div className={styles.termColumn}>
                                        <div>
                                            <span
                                                className={styles.termText}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    redirectToYouglish(item.highlightedText);
                                                }}
                                                style={{ cursor: 'pointer' }}
                                                title="Click to go to YouGlish"
                                            >
                                                {item.highlightedText}
                                            </span>
                                            {item.transcription && (
                                                <div className={styles.transcriptionList}>[{item.transcription}]</div>
                                            )}
                                        </div>
                                        <div className={styles.termActions}>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    playTTS(item.highlightedText, item.id);
                                                }}
                                                className={styles.listPlayButton}
                                            >
                                                <Play size={16} />
                                            </button>
                                            <BinButton
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteItem(item.resourceName, item.id);
                                                }}
                                                ariaLabel="Delete term"
                                            />
                                        </div>
                                    </div>

                                    <div className={styles.definitionColumn}>
                                        <span className={styles.definitionTextList}>
                                            {item.definition && item.translatedText ? `${item.definition} (${item.translatedText})` : (item.definition || item.translatedText || '')}
                                        </span>
                                        {item.context && (
                                            <p
                                                className={styles.contextTextList}
                                                dangerouslySetInnerHTML={{
                                                    __html: highlightContext(item.context, item.highlightedText)
                                                }}
                                            />
                                        )}
                                    </div>
                                </div>
                            ))}
                            {/* Infinite Scroll Sentinel */}
                            <div ref={loadMoreRef} style={{ height: '20px', margin: '32px 0' }}>
                                {isLoadingMore && (
                                    <div style={{ textAlign: 'center', padding: '16px', color: '#000000', fontWeight: 700 }}>
                                        Loading more...
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>
            ) : (
                <div className={styles.emptyState}>
                    <p>No items found in this dictionary.</p>
                </div>
            )}
        </motion.div>
    );
};

export default DictionaryItemsPage;