import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Download from 'lucide-react/dist/esm/icons/download';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Shuffle from 'lucide-react/dist/esm/icons/shuffle';
import Play from 'lucide-react/dist/esm/icons/play';

import { useTTS } from '../../hooks/useTTS';
import { usePixzenTheme } from '../HomePage/pixzen/usePixzenTheme';
import { DictionaryTermsList } from './DictionaryTermsList';
import { ParallaxFlashcardTicket } from './ParallaxFlashcardTicket';
import { useDictionaryItemsSession } from './useDictionaryItemsSession';
import styles from './css/DictionaryItemsPage.module.css';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
};

const redirectToYouglish = (word: string) => {
    window.open(`https://youglish.com/pronounce/${word}/english`, '_blank');
};

const DictionaryItemsPage: React.FC = () => {
    usePixzenTheme();
    const { resourceName } = useParams<{ resourceName: string }>();
    const navigate = useNavigate();
    const { play: playTTS, playingItemId } = useTTS();

    const {
        dictionaryItems, currentIndex, setCurrentIndex, error, flipped,
        animationState, isShuffle, isLoadingMore, totalCount, isLoading,
        isFetchingAll, isExporting, loadMoreRef, showNextCard, showPreviousCard,
        toggleCardFlip, handleToggleShuffle, exportAnki, deleteItem,
        onTouchStart, onTouchMove, onTouchEnd, imageFailed, handleImageError,
    } = useDictionaryItemsSession(resourceName);

    const activeCard = dictionaryItems[currentIndex];
    const displayTotal = totalCount > 0 ? totalCount : dictionaryItems.length;

    return (
        <motion.div className={styles.pageContainer} initial="hidden" animate="visible" variants={containerVariants}>
            <div className="pixzenGrain" aria-hidden="true" />

            <motion.div className={styles.header} variants={itemVariants}>
                <div className={styles.headerLeft}>
                    <button
                        onClick={() => navigate(-1)}
                        className={styles.backButton}
                        aria-label="Go back to previous page"
                        title="Go back"
                    >
                        <ArrowLeft size={18} aria-hidden="true" />
                    </button>
                    <div className={styles.titleSection}>
                        <h1 className={styles.pageTitle}>{resourceName?.replace(/_/g, ' ')}</h1>
                        <span className={styles.itemCount}>
                            {totalCount > 0 ? `${dictionaryItems.length} / ${totalCount}` : `${dictionaryItems.length}`} terms
                        </span>
                    </div>
                </div>
                <div className={styles.headerActions}>
                    <button
                        onClick={exportAnki}
                        className={styles.actionButton}
                        aria-label="Export dictionary to Anki (.apkg) file"
                        title="Download as Anki Deck"
                        disabled={isExporting}
                    >
                        {isExporting ? <div className={styles.buttonSpinner} /> : <Download size={15} aria-hidden="true" />}
                        <span>{isExporting ? 'Exporting...' : 'Anki Export'}</span>
                    </button>
                </div>
            </motion.div>

            {error && <div className={styles.errorMessage}>{error}</div>}

            {isLoading ? (
                <motion.div className={styles.loaderContainer} variants={itemVariants}>
                    <div className={styles.spinner} />
                    <p className={styles.loaderText}>Loading your dictionary...</p>
                </motion.div>
            ) : dictionaryItems.length > 0 && activeCard ? (
                <motion.div className={styles.contentWrapper} variants={itemVariants}>
                    <div className={styles.flashcardSection}>
                        <ParallaxFlashcardTicket
                            card={activeCard}
                            resourceName={resourceName}
                            currentIndex={currentIndex}
                            totalCount={displayTotal}
                            flipped={flipped}
                            animationState={animationState}
                            imageFailed={imageFailed}
                            onFlip={toggleCardFlip}
                            onYouGlishClick={redirectToYouglish}
                            onImageError={handleImageError}
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        />

                        <div className={styles.controlsBar}>
                            <div className={styles.controlsLeft}>
                                <button
                                    className={`${styles.iconButton} ${isShuffle ? styles.active : ''} ${isFetchingAll ? styles.loading : ''}`}
                                    onClick={handleToggleShuffle}
                                    title={isFetchingAll ? 'Loading more items...' : 'Shuffle mode'}
                                    aria-label={isShuffle ? 'Shuffle mode active, click to disable' : 'Enable shuffle mode'}
                                    aria-pressed={isShuffle}
                                    disabled={isFetchingAll}
                                >
                                    <Shuffle size={18} className={isFetchingAll ? styles.rotating : ''} aria-hidden="true" />
                                    <span className="sr-only">{isShuffle ? 'Shuffle active' : 'Shuffle inactive'}</span>
                                </button>
                                {isFetchingAll && <span className={styles.loadingInfo}>Preparing shuffle...</span>}
                            </div>

                            <div className={styles.controlsCenter}>
                                <button
                                    onClick={showPreviousCard}
                                    className={styles.navButton}
                                    title="Previous card (Left Arrow or swipe right)"
                                    aria-label={`Previous card, currently on ${currentIndex + 1} of ${displayTotal}`}
                                >
                                    <ArrowLeft size={20} aria-hidden="true" />
                                </button>
                                <span
                                    className={styles.counter}
                                    role="status"
                                    aria-live="polite"
                                    aria-label={`Card ${currentIndex + 1} of ${displayTotal}`}
                                >
                                    {currentIndex + 1} / {displayTotal}
                                </span>
                                <button
                                    onClick={showNextCard}
                                    className={styles.navButton}
                                    title="Next card (Right Arrow or swipe left)"
                                    aria-label={`Next card, currently on ${currentIndex + 1} of ${displayTotal}`}
                                >
                                    <ArrowLeft size={20} style={{ transform: 'rotate(180deg)' }} aria-hidden="true" />
                                </button>
                            </div>

                            <div className={styles.controlsRight}>
                                <button
                                    className={`${styles.iconButton} ${playingItemId === activeCard.id ? styles.active : ''}`}
                                    onClick={() => playTTS(activeCard.highlightedText, activeCard.id)}
                                    title="Play pronunciation"
                                    aria-label={`Play pronunciation of ${activeCard.highlightedText}`}
                                    aria-pressed={playingItemId === activeCard.id}
                                >
                                    <Play size={18} aria-hidden="true" />
                                    <span className="sr-only">{playingItemId === activeCard.id ? 'Playing' : 'Play audio'}</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <DictionaryTermsList
                        dictionaryItems={dictionaryItems}
                        currentIndex={currentIndex}
                        displayTotal={displayTotal}
                        isLoadingMore={isLoadingMore}
                        loadMoreRef={loadMoreRef}
                        onSelectIndex={setCurrentIndex}
                        onPlayTTS={playTTS}
                        onDeleteItem={deleteItem}
                        onYouGlishClick={redirectToYouglish}
                    />
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
