import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useIntl, FormattedMessage } from 'react-intl';
import { Book as BookIcon, Upload, Search, Sparkles } from 'lucide-react';
import { usePixzenTheme } from '../HomePage/pixzen/usePixzenTheme';
import { Book, CEFRLevel, ReadingProgress } from './types/book.types';
import { CURATED_BOOKS } from './data/curatedBooks';
import { BookStorage } from './services/bookStorage';
import { parsePlainText } from './services/txtParser';
import { parseEpubFile } from './services/epubParser';
import { BookContinueDesk } from './components/BookContinueDesk';
import { BookFolioCard } from './components/BookFolioCard';
import styles from './css/BooksCatalog.module.css';

type FilterTab = 'ALL' | CEFRLevel | 'MY_BOOKS';

const FILTER_TABS: readonly FilterTab[] = ['ALL', 'A1', 'A2', 'B1', 'B2', 'C1', 'MY_BOOKS'];

const LEVEL_SUBTITLES: Record<CEFRLevel, string> = {
    A1: 'Elementary',
    A2: 'Pre-Int',
    B1: 'Intermediate',
    B2: 'Upper-Int',
    C1: 'Advanced',
};

const getLevelSubtitle = (level: CEFRLevel): string => LEVEL_SUBTITLES[level] || '';

export const BooksCatalogPage: React.FC = () => {
    usePixzenTheme();
    const intl = useIntl();

    const [customBooks, setCustomBooks] = useState<Book[]>([]);
    const [progressMap, setProgressMap] = useState<Record<string, ReadingProgress>>({});
    const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [isDragging, setIsDragging] = useState(false);
    const [isUploadExpanded, setIsUploadExpanded] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        let isMounted = true;
        Promise.all([BookStorage.getCustomBooks(), BookStorage.getAllProgress()])
            .then(([storedCustomBooks, storedProgress]) => {
                if (isMounted) {
                    if (storedCustomBooks.length > 0) setCustomBooks(storedCustomBooks);
                    if (Object.keys(storedProgress).length > 0) setProgressMap(storedProgress);
                }
            })
            .catch(() => {});
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        const handleDragEnter = (e: DragEvent) => {
            if (e.dataTransfer?.types.includes('Files')) setIsDragging(true);
        };
        window.addEventListener('dragenter', handleDragEnter);
        return () => window.removeEventListener('dragenter', handleDragEnter);
    }, []);

    const allBooks = useMemo(() => [...CURATED_BOOKS, ...customBooks], [customBooks]);

    const featuredDeskBook = useMemo(() => {
        const inProgressBooks = allBooks
            .filter((b) => (progressMap[b.id]?.scrollPercentage ?? 0) > 0)
            .sort((a, b) => (progressMap[b.id]?.lastReadAt ?? 0) - (progressMap[a.id]?.lastReadAt ?? 0));
        return inProgressBooks[0] || CURATED_BOOKS[0];
    }, [allBooks, progressMap]);

    const filteredBooks = useMemo(() => {
        return allBooks.filter((book) => {
            if (activeFilter === 'MY_BOOKS' && !book.isCustom) return false;
            if (activeFilter !== 'ALL' && activeFilter !== 'MY_BOOKS' && book.level !== activeFilter) return false;
            if (searchQuery.trim()) {
                const query = searchQuery.toLowerCase();
                return book.title.toLowerCase().includes(query) || book.author.toLowerCase().includes(query);
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
                parsedBook = parsePlainText(await file.text(), file.name);
            } else {
                throw new Error(intl.formatMessage({ id: 'books.unsupportedFormat', defaultMessage: 'Please upload an .epub or .txt file.' }));
            }
            await BookStorage.saveCustomBook(parsedBook);
            setCustomBooks((prev) => [parsedBook, ...prev]);
            setActiveFilter('MY_BOOKS');
            setIsUploadExpanded(false);
        } catch (err: unknown) {
            setErrorMessage(err instanceof Error ? err.message : 'Failed to parse book file.');
        } finally {
            setIsUploading(false);
            setIsDragging(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteCustomBook = useCallback(
        async (e: React.MouseEvent, bookId: string) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.confirm(intl.formatMessage({ id: 'books.confirmDelete', defaultMessage: 'Are you sure you want to remove this book from your library?' }))) {
                await BookStorage.deleteCustomBook(bookId);
                setCustomBooks((prev) => prev.filter((b) => b.id !== bookId));
            }
        },
        [intl]
    );

    return (
        <div className={styles.catalogContainer}>
            <div className="pixzenGrain" aria-hidden="true" />
            <div className={styles.contentWrapper}>
                <header className={styles.headerSection}>
                    <div className={styles.headerTopRow}>
                        <div>
                            <div className={styles.badgeRow}>
                                <Sparkles size={12} strokeWidth={2.5} />
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
                        </div>
                        <div className={styles.headerStatsGroup}>
                            <div className={styles.statChip}>
                                <span className={styles.statChipValue}>{allBooks.length}</span>
                                <span className={styles.statChipLabel}>Editions</span>
                            </div>
                            <div className={styles.statChip}>
                                <span className={styles.statChipValue}>A1–C1</span>
                                <span className={styles.statChipLabel}>CEFR Graded</span>
                            </div>
                        </div>
                    </div>
                </header>

                {activeFilter === 'ALL' && !searchQuery.trim() && featuredDeskBook && (
                    <BookContinueDesk
                        book={featuredDeskBook}
                        progress={progressMap[featuredDeskBook.id]}
                        levelSubtitle={getLevelSubtitle}
                        onOpenUpload={() => setIsUploadExpanded((prev) => !prev)}
                    />
                )}

                {(isDragging || isUploadExpanded) && (
                    <div
                        className={`${styles.dropzoneBanner} ${isDragging ? styles.dropzoneBannerActive : ''}`}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); }}
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e.dataTransfer.files); }}
                        onClick={() => fileInputRef.current?.click()}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click(); }}
                    >
                        <div className={styles.dropzoneIconSquircle}>
                            <Upload size={20} strokeWidth={2} />
                        </div>
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
                        {errorMessage && <p className={styles.uploadErrorText}>{errorMessage}</p>}
                    </div>
                )}

                <input ref={fileInputRef} type="file" accept=".epub,.txt" className={styles.uploadInputHidden} onChange={(e) => handleFileUpload(e.target.files)} />

                <div className={styles.controlBar}>
                    <div className={styles.levelFilters}>
                        {FILTER_TABS.map((tab) => (
                            <button
                                key={tab}
                                type="button"
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
                            <Search size={14} className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder={intl.formatMessage({ id: 'books.searchPlaceholder', defaultMessage: 'Search by title or author...' })}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className={styles.searchInput}
                            />
                        </div>
                        <button type="button" className={styles.uploadButton} onClick={() => setIsUploadExpanded((prev) => !prev)}>
                            <Upload size={14} strokeWidth={2.2} />
                            <FormattedMessage id="books.uploadBtn" defaultMessage="Upload Book" />
                        </button>
                    </div>
                </div>

                <div className={styles.bookGrid}>
                    {filteredBooks.length === 0 ? (
                        <div className={styles.emptyState}>
                            <BookIcon size={36} className={styles.emptyStateIcon} />
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
                        filteredBooks.map((book) => (
                            <BookFolioCard
                                key={book.id}
                                book={book}
                                progress={progressMap[book.id]}
                                levelSubtitle={getLevelSubtitle}
                                onDeleteCustomBook={handleDeleteCustomBook}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default BooksCatalogPage;
