import React from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { BookOpen, Clock, FileText, ArrowRight, Sparkles, Upload } from 'lucide-react';
import { Book, CEFRLevel, ReadingProgress } from '../types/book.types';
import styles from '../css/BooksCatalog.module.css';

interface BookContinueDeskProps {
    book: Book;
    progress?: ReadingProgress;
    levelSubtitle: (level: CEFRLevel) => string;
    onOpenUpload: () => void;
}

export const BookContinueDesk: React.FC<BookContinueDeskProps> = ({
    book,
    progress,
    levelSubtitle,
    onOpenUpload,
}) => {
    const percentage = progress ? Math.min(100, Math.round(progress.scrollPercentage)) : 0;
    const isStarted = percentage > 0;

    const currentChapter =
        (progress?.currentChapterId &&
            book.chapters.find((ch) => ch.id === progress.currentChapterId)) ||
        book.chapters[0];

    const rawExcerpt = currentChapter?.content
        ? currentChapter.content
              .split('\n')
              .map((line) => line.trim())
              .filter(Boolean)
              .slice(0, 2)
              .join(' ')
        : book.description;

    const coverStyle: React.CSSProperties = {
        background: book.coverGradient || 'linear-gradient(135deg, #134e4a 0%, #064e3b 100%)',
    };

    return (
        <section
            className={styles.readingDesk}
            aria-label={isStarted ? 'Continue Reading' : 'Featured Reading'}
            data-testid="book-continue-desk"
        >
            <div className={styles.deskLeft}>
                <div className={styles.deskBookCover} style={coverStyle} aria-hidden="true">
                    <div className={styles.bookSpineCrease} />
                    <span className={styles.coverEditionStamp}>{book.level}</span>
                    <div className={styles.coverTypography}>
                        <span className={styles.coverMiniAuthor}>{book.author}</span>
                    </div>
                </div>

                <div className={styles.deskInfo}>
                    <div className={styles.deskMetaRow}>
                        <span className={styles.deskStatusBadge}>
                            <Sparkles size={11} />
                            {isStarted ? (
                                <FormattedMessage
                                    id="books.deskContinueBadge"
                                    defaultMessage="Continue Reading"
                                />
                            ) : (
                                <FormattedMessage
                                    id="books.deskFeaturedBadge"
                                    defaultMessage="Recommended Start"
                                />
                            )}
                        </span>
                        <span className={styles.deskLevelBadge}>
                            {book.isCustom
                                ? 'CUSTOM'
                                : `${book.level} · ${levelSubtitle(book.level)}`}
                        </span>
                        <span className={styles.deskTelemetry}>
                            <Clock size={12} />
                            {book.estimatedMinutes}m
                        </span>
                        <span className={styles.deskTelemetry}>
                            <FileText size={12} />
                            {book.chapters.length} ch
                        </span>
                    </div>

                    <h2 className={styles.deskBookTitle}>
                        {isStarted
                            ? `Resume: ${book.title}`
                            : `${book.title} — ${currentChapter?.title || 'Chapter 1'}`}
                    </h2>
                    <p className={styles.deskBookAuthor}>{book.author}</p>

                    <div className={styles.deskActionRow}>
                        <Link to={`/books/${book.id}`} className={styles.deskPrimaryBtn}>
                            <BookOpen size={14} />
                            <span>
                                {isStarted ? (
                                    <FormattedMessage
                                        id="books.continueReadingBtn"
                                    defaultMessage="Continue Chapter"
                                />
                                ) : (
                                    <FormattedMessage
                                        id="books.startReadingBtn"
                                        defaultMessage="Open Chapter 1"
                                    />
                                )}
                            </span>
                            <ArrowRight size={14} />
                        </Link>

                        {isStarted ? (
                            <div className={styles.deskProgressInline}>
                                <div className={styles.deskProgressTrack}>
                                    <div
                                        className={styles.deskProgressFill}
                                        style={{ width: `${percentage}%` }}
                                    />
                                </div>
                                <span className={styles.deskProgressText}>
                                    {percentage}% completed
                                </span>
                            </div>
                        ) : (
                            <button
                                type="button"
                                onClick={onOpenUpload}
                                className={styles.deskSecondaryBtn}
                            >
                                <Upload size={13} />
                                <span>
                                    <FormattedMessage
                                        id="books.uploadOwnEpub"
                                        defaultMessage="Or upload EPUB / TXT"
                                    />
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {currentChapter && (
                <Link
                    to={`/books/${book.id}`}
                    className={styles.deskExcerptPage}
                    aria-label={`Preview ${currentChapter.title}`}
                >
                    <div className={styles.excerptHeader}>
                        <span className={styles.excerptChapterTag}>{currentChapter.title}</span>
                        <span className={styles.excerptHint}>Click any word to translate</span>
                    </div>
                    <p className={styles.excerptBody}>“{rawExcerpt}”</p>
                </Link>
            )}
        </section>
    );
};
