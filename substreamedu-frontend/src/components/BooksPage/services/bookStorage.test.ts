import { BookStorage } from './bookStorage';
import { Book, ReadingProgress } from '../types/book.types';

describe('BookStorage', () => {
    const mockBook: Book = {
        id: 'test-book-1',
        title: 'Mock Storage Book',
        author: 'Tester',
        level: 'B1',
        description: 'Testing book storage',
        coverGradient: 'linear-gradient(135deg, #111, #222)',
        accentColor: '#3b82f6',
        totalWords: 500,
        estimatedMinutes: 3,
        isCustom: true,
        chapters: [
            { id: 'ch-1', title: 'Chapter 1', content: 'Testing content', wordCount: 500 }
        ]
    };

    it('should save and retrieve custom book', async () => {
        await BookStorage.saveCustomBook(mockBook);

        const retrieved = await BookStorage.getCustomBook('test-book-1');
        expect(retrieved).not.toBeNull();
        expect(retrieved?.title).toBe('Mock Storage Book');

        const allCustom = await BookStorage.getCustomBooks();
        expect(allCustom.some(b => b.id === 'test-book-1')).toBe(true);
    });

    it('should save, retrieve and delete reading progress', async () => {
        const mockProgress: ReadingProgress = {
            bookId: 'test-book-1',
            currentChapterId: 'ch-1',
            scrollPercentage: 50,
            lastReadAt: Date.now(),
            isCompleted: false
        };

        await BookStorage.saveProgress(mockProgress);
        const progress = await BookStorage.getProgress('test-book-1');
        expect(progress?.scrollPercentage).toBe(50);

        const allProgress = await BookStorage.getAllProgress();
        expect(allProgress['test-book-1']).toBeDefined();

        await BookStorage.deleteCustomBook('test-book-1');
        const afterDelete = await BookStorage.getCustomBook('test-book-1');
        expect(afterDelete).toBeNull();
    });
});
