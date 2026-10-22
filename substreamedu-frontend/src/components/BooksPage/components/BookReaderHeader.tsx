import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, List, Minus, Plus } from 'lucide-react';
import styles from '../css/BookReader.module.css';

interface BookReaderHeaderProps {
    bookTitle: string;
    chapterTitle: string;
    fontSize: number;
    onChangeFontSize: (delta: number) => void;
    onToggleDrawer: () => void;
    progressPercentage: number;
}

export const BookReaderHeader: React.FC<BookReaderHeaderProps> = ({
    bookTitle,
    chapterTitle,
    fontSize,
    onChangeFontSize,
    onToggleDrawer,
    progressPercentage
}) => {
    return (
        <header className={styles.readerHeader}>
            <div className={styles.headerLeft}>
                <Link to="/books" className={styles.backLink} aria-label="Back to catalog">
                    <ArrowLeft size={18} />
                </Link>
                <div className={styles.headerTitleGroup}>
                    <h1 className={styles.bookHeaderTitle}>{bookTitle}</h1>
                    <p className={styles.chapterHeaderSubtitle}>{chapterTitle}</p>
                </div>
            </div>

            <div className={styles.headerRight}>
                {/* Font Size Scaling Controls */}
                <button
                    className={styles.fontControlBtn}
                    onClick={() => onChangeFontSize(-2)}
                    disabled={fontSize <= 14}
                    title="Decrease font size"
                    aria-label="Decrease font size"
                >
                    <Minus size={13} />
                </button>
                <span className="font-mono text-xs text-stone-400 select-none px-1">
                    {fontSize}px
                </span>
                <button
                    className={styles.fontControlBtn}
                    onClick={() => onChangeFontSize(2)}
                    disabled={fontSize >= 26}
                    title="Increase font size"
                    aria-label="Increase font size"
                >
                    <Plus size={13} />
                </button>

                {/* Table of Contents Drawer Toggle */}
                <button
                    className={styles.headerPillBtn}
                    onClick={onToggleDrawer}
                    title="Table of Contents"
                    aria-label="Table of Contents"
                >
                    <List size={16} />
                    <span className="hidden sm:inline">Chapters</span>
                </button>
            </div>

            {/* Reading Progress Top Bar */}
            <div
                className={styles.progressBarTop}
                style={{ width: `${Math.min(100, Math.max(0, progressPercentage))}%` }}
            />
        </header>
    );
};

export default BookReaderHeader;
