import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, BookOpen } from 'lucide-react';
import { LanguageContext } from '../LanguageContext';
import { usePixzenTheme } from '../HomePage/pixzen/usePixzenTheme';
import { Book, ReadingProgress } from './types/book.types';
import { CURATED_BOOKS } from './data/curatedBooks';
import { BookStorage } from './services/bookStorage';
import { BookReaderHeader } from './components/BookReaderHeader';
import { BookContent } from './components/BookContent';
import { ChapterDrawer } from './components/ChapterDrawer';
import styles from './css/BookReader.module.css';

export const BookReaderPage: React.FC = () => {
    usePixzenTheme();
    const { bookId } = useParams<{ bookId: string }>();
    const { learningLanguage, fluentLanguage } = useContext(LanguageContext);

    const [book, setBook] = useState<Book | null>(null);
    const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
    const [fontSize, setFontSize] = useState<number>(18);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const loadBook = useCallback(async () => {
        if (!bookId) return;
        setIsLoading(true);

        try {
            // Check curated books first
            const curated = CURATED_BOOKS.find(b => b.id === bookId);
            let activeBook: Book | null = curated || null;

            if (!activeBook) {
                // Check custom books in storage
                activeBook = await BookStorage.getCustomBook(bookId);
            }

            if (activeBook) {
                setBook(activeBook);

                // Restore previous reading progress
                const savedProgress = await BookStorage.getProgress(bookId);
                if (savedProgress && savedProgress.currentChapterId) {
                    const chIndex = activeBook.chapters.findIndex(c => c.id === savedProgress.currentChapterId);
                    if (chIndex >= 0) {
                        setCurrentChapterIndex(chIndex);
                    }
                }
            }
        } catch {
            // Keep default state
        } finally {
            setIsLoading(false);
        }
    }, [bookId]);

    useEffect(() => {
        loadBook();
    }, [loadBook]);

    const saveCurrentProgress = useCallback(async (chapterIdx: number) => {
        if (!book || !book.chapters[chapterIdx]) return;
        const chapter = book.chapters[chapterIdx];
        const progressPercentage = Math.round(((chapterIdx + 1) / book.chapters.length) * 100);

        const progress: ReadingProgress = {
            bookId: book.id,
            currentChapterId: chapter.id,
            scrollPercentage: progressPercentage,
            lastReadAt: Date.now(),
            isCompleted: chapterIdx === book.chapters.length - 1
        };

        await BookStorage.saveProgress(progress);
    }, [book]);

    const handleSelectChapter = (index: number) => {
        if (!book || index < 0 || index >= book.chapters.length) return;
        setCurrentChapterIndex(index);
        saveCurrentProgress(index);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleChangeFontSize = (delta: number) => {
        setFontSize(prev => Math.min(26, Math.max(14, prev + delta)));
    };

    if (isLoading) {
        return (
            <div className={styles.readerContainer}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-stone-400 gap-3">
                    <BookOpen size={32} className="animate-pulse text-blue-500" />
                    <p className="font-mono text-sm">Opening book...</p>
                </div>
            </div>
        );
    }

    if (!book || book.chapters.length === 0) {
        return (
            <div className={styles.readerContainer}>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                    <h2 className="text-xl font-medium mb-2 text-stone-200">Book Not Found</h2>
                    <p className="text-stone-400 mb-4 text-sm">The requested book could not be loaded.</p>
                    <Link
                        to="/books"
                        className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                    >
                        Back to Library
                    </Link>
                </div>
            </div>
        );
    }

    const currentChapter = book.chapters[currentChapterIndex] || book.chapters[0];
    const totalChapters = book.chapters.length;
    const progressPercentage = Math.round(((currentChapterIndex + 1) / totalChapters) * 100);

    return (
        <div className={styles.readerContainer}>
            <BookReaderHeader
                bookTitle={book.title}
                chapterTitle={currentChapter.title}
                fontSize={fontSize}
                onChangeFontSize={handleChangeFontSize}
                onToggleDrawer={() => setIsDrawerOpen(true)}
                progressPercentage={progressPercentage}
            />

            <BookContent
                bookTitle={book.title}
                chapterTitle={currentChapter.title}
                content={currentChapter.content}
                fontSize={fontSize}
                learningLanguage={learningLanguage || 'en'}
                fluentLanguage={fluentLanguage || 'en'}
            />

            {/* Navigation Footer */}
            <div className="max-w-[760px] w-full mx-auto px-6 pb-16">
                <footer className={styles.readerFooter}>
                    <button
                        className={styles.navChapterBtn}
                        onClick={() => handleSelectChapter(currentChapterIndex - 1)}
                        disabled={currentChapterIndex <= 0}
                    >
                        <ChevronLeft size={16} />
                        <span>Previous Chapter</span>
                    </button>

                    <span className={styles.progressLabelCenter}>
                        Chapter {currentChapterIndex + 1} of {totalChapters} ({progressPercentage}%)
                    </span>

                    <button
                        className={styles.navChapterBtn}
                        onClick={() => handleSelectChapter(currentChapterIndex + 1)}
                        disabled={currentChapterIndex >= totalChapters - 1}
                    >
                        <span>Next Chapter</span>
                        <ChevronRight size={16} />
                    </button>
                </footer>
            </div>

            {/* Table of Contents Drawer */}
            <ChapterDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                chapters={book.chapters}
                currentChapterIndex={currentChapterIndex}
                onSelectChapter={handleSelectChapter}
            />
        </div>
    );
};

export default BookReaderPage;
