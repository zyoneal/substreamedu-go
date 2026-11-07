import React from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { Clock, FileText, Trash2, BookOpen, ArrowUpRight } from 'lucide-react';
import { Book, CEFRLevel, ReadingProgress } from '../types/book.types';
import styles from '../css/BooksCatalog.module.css';

interface BookFolioCardProps {
    book: Book;
    progress?: ReadingProgress;
    levelSubtitle: (level: CEFRLevel) => string;
    onDeleteCustomBook: (e: React.MouseEvent, bookId: string) => void;
}

export const BookFolioCard: React.FC<BookFolioCardProps> = ({
    book,
    progress,
    levelSubtitle,
    onDeleteCustomBook,
}) => {
    const intl = useIntl();
    const percentage = progress ? Math.min(100, Math.round(progress.scrollPercentage)) : 0;
    const isStarted = percentage > 0;
    const firstChapterTitle = book.chapters[0]?.title || 'Chapter 1';

    const coverStyle: React.CSSProperties = {
        background: book.coverGradient || 'linear-gradient(135deg, #1c1917 0%, #292524 100%)',
    };

    return (
        <article className={styles.bookCard}>
            <div className={styles.cardTopFolio}>
                {/* Tactile 3D Hardcover Book Cover Miniature */}
                <Link
                    to={`/books/${book.id}`}
                    className={styles.bookCoverMini}
                    style={coverStyle}
                    tabIndex={-1}
                    aria-hidden="true"
                >
                    <div className={styles.bookSpineCrease} />
                    <span className={styles.coverEditionStamp}>
                        {book.isCustom ? 'EPUB' : book.level}
                    </span>
                    <div className={styles.coverTypography}>
                        <span className={styles.coverMiniTitle}>
                            VOL. 0{book.chapters.length}
                        </span>
                        <span className={styles.coverMiniAuthor}>{book.author}</span>
                    </div>
                </Link>

                {/* Editorial Book Dossier */}
                <div className={styles.bookDossier}>
                    <div className={styles.dossierMetaTop}>
                        <span className={styles.bookLevelPill}>
                            {book.isCustom
                                ? 'CUSTOM'
                                : `${book.level} · ${levelSubtitle(book.level)}`}
                        </span>
                        <div className={styles.cardMeta}>
                            <span>
                                <Clock size={11} />
                                {book.estimatedMinutes}m
                            </span>
                            <span>
                                <FileText size={11} />
                                {book.chapters.length} ch
                            </span>
                        </div>
                    </div>

                    <h2 className={styles.bookTitle}>
                        <Link to={`/books/${book.id}`} className={styles.bookTitleLink}>
                            {book.title}
                        </Link>
                    </h2>
                    <p className={styles.bookAuthor}>{book.author}</p>
                    <p className={styles.bookDescription}>{book.description}</p>
                </div>
            </div>

            {/* Smart Editorial Footer: Progress bar ONLY when reading has started */}
            <div className={styles.cardFooter}>
                {isStarted ? (
                    <div className={styles.progressContainer}>
                        <div className={styles.progressHeaderRow}>
                            <span className={styles.progressLabel}>
                                {percentage}% completed
                            </span>
                        </div>
                        <div className={styles.progressBarBg}>
                            <div
                                className={styles.progressBarFill}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </div>
                ) : (
                    <div className={styles.unreadSpecGroup}>
                        <span className={styles.progressLabel}>
                            {book.totalWords.toLocaleString()} words
                        </span>
                        <span className={styles.specDivider} aria-hidden="true">
                            ·
                        </span>
                        <span className={styles.firstChapterHint}>{firstChapterTitle}</span>
                    </div>
                )}

                <div className={styles.footerActions}>
                    {book.isCustom && (
                        <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={(e) => onDeleteCustomBook(e, book.id)}
                            title={intl.formatMessage({
                                id: 'books.deleteTitle',
                                defaultMessage: 'Delete book',
                            })}
                            aria-label="Delete book"
                        >
                            <Trash2 size={14} />
                        </button>
                    )}
                    <Link to={`/books/${book.id}`} className={styles.readButton}>
                        <BookOpen size={13} />
                        <span>
                            {isStarted ? (
                                <FormattedMessage id="books.continue" defaultMessage="Continue" />
                            ) : (
                                <FormattedMessage id="books.read" defaultMessage="Read" />
                            )}
                        </span>
                        <ArrowUpRight size={13} className={styles.readBtnArrow} />
                    </Link>
                </div>
            </div>
        </article>
    );
};
