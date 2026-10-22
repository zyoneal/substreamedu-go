import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useIntl, FormattedMessage } from 'react-intl';
import { Book as BookIcon, Upload, Search, Clock, FileText, Trash2, BookOpen, Sparkles } from 'lucide-react';
import { usePixzenTheme } from '../HomePage/pixzen/usePixzenTheme';
import { Book, CEFRLevel, ReadingProgress } from './types/book.types';
import { CURATED_BOOKS } from './data/curatedBooks';
import { BookStorage } from './services/bookStorage';
import { parsePlainText } from './services/txtParser';
import { parseEpubFile } from './services/epubParser';
import styles from './css/BooksCatalog.module.css';

type FilterTab = 'ALL' | CEFRLevel | 'MY_BOOKS';

export const BooksCatalogPage: React.FC = () => {
    usePixzenTheme();
    const intl = useIntl();

    const [customBooks, setCustomBooks] = useState<Book[]>([]);
    const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});
    const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        loadBooksAndProgress();
    }, []);

    const loadBooksAndProgress = async () => {
        try {
            const [storedCustomBooks, storedProgress] = await Promise.all([
                BookStorage.getCustomBooks(),
                BookStorage.getAllProgress()
            ]);
            setCustomBooks(storedCustomBooks);
            setProgressMap(storedProgress);
        } catch {
            // Keep default empty states
        }
    };

    const allBooks = useMemo(() => {
        return [...CURATED_BOOKS, ...customBooks];
    }, [customBooks]);

    const filteredBooks = useMemo(() => {
        return allBooks.filter(book => {
            // Filter by Level or Custom
            if (activeFilter === 'MY_BOOKS') {
                if (!book.isCustom) return false;
            } else if (activeFilter !== 'ALL') {
                if (book.level !== activeFilter) return false;
            }

            // Search query filter
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = book.title.toLowerCase().includes(query);
                const matchesAuthor = book.author.toLowerCase().includes(query);
                return matchesTitle || matchesAuthor;
            }

            return true;
        });
    }, [allBooks, activeFilter, searchQuery]);

    const handleFileUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const file = files[0];
        const lowerName = file.name.toLowerCase();

        setIsUploading(true);
        setErrorMessage(null);

        try {
            let parsedBook: Book;
            if (lowerName.endsWith('.epub')) {
                parsedBook = await parseEpubFile(file, file.name);
            } else if (lowerName.endsWith('.txt')) {
                const textContent = await file.text();
                parsedBook = parsePlainText(textContent, file.name);
            } else {
                throw new Error(intl.formatMessage({
                    id: 'books.unsupportedFormat',
                    defaultMessage: 'Please upload an .epub or .txt file.'
                }));
            }

            await BookStorage.saveCustomBook(parsedBook);
            setCustomBooks(prev => [parsedBook, ...prev]);
            setActiveFilter('MY_BOOKS');
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to parse book file.';
            setErrorMessage(message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleDeleteCustomBook = async (e: React.MouseEvent, bookId: string) => {
        e.preventDefault();
        e.stopPropagation();

        if (window.confirm(intl.formatMessage({
            id: 'books.confirmDelete',
            defaultMessage: 'Are you sure you want to remove this book from your library?'
        }))) {
            await BookStorage.deleteCustomBook(bookId);
            setCustomBooks(prev => prev.filter(b => b.id !== bookId));
        }
    };

    const getLevelClass = (level: CEFRLevel) => {
        if (level === 'A1' || level === 'A2') return styles.levelA1;
        if (level === 'B1' || level === 'B2') return styles.levelB1;
        return styles.levelC1;
    };

    return (
        <div className={styles.catalogContainer}>
            <div className={styles.contentWrapper}>
                <header className={styles.headerSection}>
                    <div className={styles.badgeRow}>
                        <Sparkles size={13} strokeWidth={2.5} />
                        <span>GRADED EXTENSIVE READING</span>
                    </div>
                    <h1 className={styles.pageTitle}>
                        <FormattedMessage id="books.catalogTitle" defaultMessage="Learn with" />{' '}
                        <span className={styles.highlightText}>
                            <FormattedMessage id="books.catalogHighlight" defaultMessage="Books" />
                        </span>
                    </h1>
                    <p className={styles.subtitle}>
                        <FormattedMessage
                            id="books.catalogSubtitle"
                            defaultMessage="Read adapted classics and modern stories curated by language proficiency, or upload your own e-books to read and save vocabulary in-context."
                        />
                    </p>
                </header>

                {/* Drag & Drop Upload Zone */}
                <div
                    className={`${styles.dropzoneBanner} ${isDragging ? styles.dropzoneBannerActive : ''}`}
                    onDragOver={e => {
                        e.preventDefault();
                        setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => {
                        e.preventDefault();
                        setIsDragging(false);
                        handleFileUpload(e.dataTransfer.files);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click();
                    }}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".epub,.txt"
                        className={styles.uploadInputHidden}
                        onChange={e => handleFileUpload(e.target.files)}
                    />
                    <Upload size={22} className="mx-auto text-blue-500 mb-2" />
                    <h3 className={styles.dropzoneTitle}>
                        {isUploading ? (
                            <FormattedMessage id="books.uploading" defaultMessage="Parsing and importing book..." />
                        ) : (
                            <FormattedMessage id="books.dropzonePrompt" defaultMessage="Drop your EPUB or TXT file here, or click to browse" />
                        )}
                    </h3>
                    <p className={styles.dropzoneHint}>
                        <FormattedMessage id="books.dropzoneSupported" defaultMessage="Supports .epub and .txt with automatic chapter separation" />
                    </p>
                    {errorMessage && (
                        <p className="text-red-400 text-xs mt-2 font-mono">{errorMessage}</p>
                    )}
                </div>

                {/* Filter and Search Bar */}
                <div className={styles.controlBar}>
                    <div className={styles.levelFilters}>
                        {(['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'MY_BOOKS'] as FilterTab[]).map(tab => (
                            <button
                                key={tab}
                                className={`${styles.filterPill} ${activeFilter === tab ? styles.filterPillActive : ''}`}
                                onClick={() => setActiveFilter(tab)}
                            >
                                {tab === 'ALL' && <FormattedMessage id="books.filterAll" defaultMessage="All Books" />}
                                {tab === 'MY_BOOKS' && (
                                    <>
                                        <FormattedMessage id="books.filterMyBooks" defaultMessage="My Uploads" />
                                        {customBooks.length > 0 && ` (${customBooks.length})`}
                                    </>
                                )}
                                {tab !== 'ALL' && tab !== 'MY_BOOKS' && tab}
                            </button>
                        ))}
                    </div>

                    <div className={styles.actionRow}>
                        <div className={styles.searchBox}>
                            <Search size={15} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder={intl.formatMessage({ id: 'books.searchPlaceholder', defaultMessage: 'Search by title or author...' })}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>

                        <button
                            className={styles.uploadButton}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <Upload size={14} />
                            <FormattedMessage id="books.uploadBtn" defaultMessage="Upload Book" />
                        </button>
                    </div>
                </div>

                {/* Books Grid */}
                <div className={styles.bookGrid}>
                    {filteredBooks.length === 0 ? (
                        <div className={styles.emptyState}>
                            <BookIcon size={36} className="mx-auto text-stone-500 mb-3" />
                            <h3 className={styles.emptyStateTitle}>
                                <FormattedMessage id="books.emptyTitle" defaultMessage="No books found" />
                            </h3>
                            <p className={styles.emptyStateText}>
                                {searchQuery ? (
                                    <FormattedMessage id="books.emptySearch" defaultMessage="No titles or authors match your query." />
                                ) : activeFilter === 'MY_BOOKS' ? (
                                    <FormattedMessage id="books.emptyCustom" defaultMessage="You haven't uploaded any custom books yet. Drop an EPUB or TXT file above!" />
                                ) : (
                                    <FormattedMessage id="books.emptyFilter" defaultMessage="No books available in this level." />
                                )}
                            </p>
                        </div>
                    ) : (
                        filteredBooks.map(book => {
                            const progress = progressMap[book.id];
                            const percentage = progress ? Math.min(100, Math.round(progress.scrollPercentage)) : 0;

                            return (
                                <article key={book.id} className={styles.bookCard}>
                                    <div>
                                        <div className={styles.cardHeader}>
                                            <span className={`${styles.bookLevelPill} ${getLevelClass(book.level)}`}>
                                                {book.isCustom ? 'CUSTOM' : book.level}
                                            </span>
                                            <div className={styles.cardMeta}>
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} />
                                                    {book.estimatedMinutes}m
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <FileText size={12} />
                                                    {book.chapters.length} ch
                                                </span>
                                            </div>
                                        </div>

                                        <h2 className={styles.bookTitle}>{book.title}</h2>
                                        <p className={styles.bookAuthor}>{book.author}</p>
                                        <p className={styles.bookDescription}>{book.description}</p>
                                    </div>

                                    <div className={styles.cardFooter}>
                                        <div className={styles.progressContainer}>
                                            <div className={styles.progressBarBg}>
                                                <div
                                                    className={styles.progressBarFill}
                                                    style={{ width: `${percentage}%` }}
                                                />
                                            </div>
                                            <span className={styles.progressLabel}>
                                                {percentage > 0 ? `${percentage}% completed` : `${book.totalWords.toLocaleString()} words`}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {book.isCustom && (
                                                <button
                                                    className={styles.deleteButton}
                                                    onClick={e => handleDeleteCustomBook(e, book.id)}
                                                    title={intl.formatMessage({ id: 'books.deleteTitle', defaultMessage: 'Delete book' })}
                                                    aria-label="Delete book"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                            <Link
                                                to={`/books/${book.id}`}
                                                className={styles.readButton}
                                            >
                                                <BookOpen size={14} />
                                                <span>
                                                    {percentage > 0 ? (
                                                        <FormattedMessage id="books.continue" defaultMessage="Continue" />
                                                    ) : (
                                                        <FormattedMessage id="books.read" defaultMessage="Read" />
                                                    )}
                                                </span>
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default BooksCatalogPage;
