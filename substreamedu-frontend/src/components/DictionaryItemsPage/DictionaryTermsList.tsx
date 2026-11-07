import React from 'react';
import Play from 'lucide-react/dist/esm/icons/play';
import BinButton from './BinButton';
import {
    DictionaryItem,
    cleanTranscription,
    highlightContext,
} from './useDictionaryItemsSession';
import styles from './css/DictionaryItemsPage.module.css';

interface DictionaryTermsListProps {
    dictionaryItems: DictionaryItem[];
    currentIndex: number;
    displayTotal: number;
    isLoadingMore: boolean;
    loadMoreRef: React.RefObject<HTMLDivElement>;
    onSelectIndex: (index: number) => void;
    onPlayTTS: (word: string, id: number) => void;
    onDeleteItem: (resourceName: string, id: number) => void;
    onYouGlishClick: (word: string) => void;
}

export const DictionaryTermsList: React.FC<DictionaryTermsListProps> = React.memo(({
    dictionaryItems,
    currentIndex,
    displayTotal,
    isLoadingMore,
    loadMoreRef,
    onSelectIndex,
    onPlayTTS,
    onDeleteItem,
    onYouGlishClick,
}) => (
    <div className={styles.listSection}>
        <div className={styles.listHeader}>
            <h3>Terms in this set ({displayTotal})</h3>
        </div>
        <div className={styles.listGrid}>
            {dictionaryItems.map((item, index) => (
                <div
                    key={item.id}
                    className={`${styles.listItem} ${currentIndex === index ? styles.activeItem : ''}`}
                    onClick={() => onSelectIndex(index)}
                >
                    <div className={styles.termColumn}>
                        <div>
                            <span
                                className={styles.termText}
                                onClick={e => {
                                    e.stopPropagation();
                                    onYouGlishClick(item.highlightedText);
                                }}
                                title="Click to go to YouGlish"
                            >
                                {item.highlightedText}
                            </span>
                            {cleanTranscription(item.transcription) && (
                                <div className={styles.transcriptionList}>[{cleanTranscription(item.transcription)}]</div>
                            )}
                        </div>
                        <div className={styles.termActions}>
                            <button
                                onClick={e => {
                                    e.stopPropagation();
                                    onPlayTTS(item.highlightedText, item.id);
                                }}
                                className={styles.listPlayButton}
                                aria-label={`Play pronunciation of ${item.highlightedText}`}
                            >
                                <Play size={14} />
                            </button>
                            <BinButton
                                onClick={e => {
                                    e.stopPropagation();
                                    onDeleteItem(item.resourceName, item.id);
                                }}
                                ariaLabel="Delete term"
                            />
                        </div>
                    </div>

                    <div className={styles.definitionColumn}>
                        <span className={styles.definitionTextList}>
                            {item.definition && item.translatedText
                                ? `${item.definition} (${item.translatedText})`
                                : item.definition || item.translatedText || ''}
                        </span>
                        {item.context && (
                            <p
                                className={styles.contextTextList}
                                dangerouslySetInnerHTML={{
                                    __html: highlightContext(item.context, item.highlightedText, styles.highlight),
                                }}
                            />
                        )}
                    </div>
                </div>
            ))}
            <div ref={loadMoreRef} className={styles.sentinel}>
                {isLoadingMore && <div className={styles.loadingMoreText}>Loading more...</div>}
            </div>
        </div>
    </div>
));

