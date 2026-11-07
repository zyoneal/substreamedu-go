import React from 'react';
import { X, Check } from 'lucide-react';
import { Chapter } from '../types/book.types';
import styles from '../css/BookReader.module.css';

interface ChapterDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    chapters: Chapter[];
    currentChapterIndex: number;
    onSelectChapter: (index: number) => void;
}

export const ChapterDrawer: React.FC<ChapterDrawerProps> = ({
    isOpen,
    onClose,
    chapters,
    currentChapterIndex,
    onSelectChapter
}) => {
    if (!isOpen) return null;

    return (
        <div className={styles.drawerOverlay} onClick={onClose}>
            <aside className={styles.drawerContent} onClick={e => e.stopPropagation()}>
                <div className={styles.drawerHeader}>
                    <h2 className={styles.drawerTitle}>Table of Contents</h2>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Close chapter list">
                        <X size={18} />
                    </button>
                </div>

                <ul className={styles.chapterList}>
                    {chapters.map((ch, idx) => {
                        const isActive = idx === currentChapterIndex;
                        const isPast = idx < currentChapterIndex;

                        return (
                            <li key={ch.id}>
                                <button
                                    className={`${styles.chapterItem} ${isActive ? styles.chapterItemActive : ''}`}
                                    onClick={() => {
                                        onSelectChapter(idx);
                                        onClose();
                                    }}
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className={styles.chapterItemTitle}>{ch.title}</h3>
                                        {isPast && <Check size={14} className="text-emerald-500 flex-shrink-0" />}
                                    </div>
                                    <p className={styles.chapterItemWords}>{ch.wordCount.toLocaleString()} words</p>
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </aside>
        </div>
    );
};

export default ChapterDrawer;
