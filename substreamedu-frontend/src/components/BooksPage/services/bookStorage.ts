import { Book, ReadingProgress } from '../types/book.types';

const DB_NAME = 'substreamedu_books_db';
const DB_VERSION = 1;
const STORE_CUSTOM_BOOKS = 'custom_books';
const STORE_PROGRESS = 'reading_progress';

// In-memory fallback for environments without IndexedDB (e.g. test runners)
const memoryBooks: Map<string, Book> = new Map();
const memoryProgress: Map<string, ReadingProgress> = new Map();

function isIndexedDBAvailable(): boolean {
    return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

function openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!isIndexedDBAvailable()) {
            reject(new Error('IndexedDB not supported'));
            return;
        }

        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_CUSTOM_BOOKS)) {
                db.createObjectStore(STORE_CUSTOM_BOOKS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
                db.createObjectStore(STORE_PROGRESS, { keyPath: 'bookId' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export const BookStorage = {
    async getCustomBooks(): Promise<Book[]> {
        if (!isIndexedDBAvailable()) {
            return Array.from(memoryBooks.values());
        }

        try {
            const db = await openDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_CUSTOM_BOOKS, 'readonly');
                const store = tx.objectStore(STORE_CUSTOM_BOOKS);
                const request = store.getAll();

                request.onsuccess = () => resolve(request.result || []);
                request.onerror = () => reject(request.error);
            });
        } catch {
            return Array.from(memoryBooks.values());
        }
    },

    async getCustomBook(id: string): Promise<Book | null> {
        if (!isIndexedDBAvailable()) {
            return memoryBooks.get(id) || null;
        }

        try {
            const db = await openDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_CUSTOM_BOOKS, 'readonly');
                const store = tx.objectStore(STORE_CUSTOM_BOOKS);
                const request = store.get(id);

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch {
            return memoryBooks.get(id) || null;
        }
    },

    async saveCustomBook(book: Book): Promise<void> {
        memoryBooks.set(book.id, book);

        if (!isIndexedDBAvailable()) {
            return;
        }

        try {
            const db = await openDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_CUSTOM_BOOKS, 'readwrite');
                const store = tx.objectStore(STORE_CUSTOM_BOOKS);
                const request = store.put(book);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch {
            // Fallback succeeded via memory
        }
    },

    async deleteCustomBook(id: string): Promise<void> {
        memoryBooks.delete(id);
        memoryProgress.delete(id);

        if (!isIndexedDBAvailable()) {
            return;
        }

        try {
            const db = await openDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction([STORE_CUSTOM_BOOKS, STORE_PROGRESS], 'readwrite');
                tx.objectStore(STORE_CUSTOM_BOOKS).delete(id);
                tx.objectStore(STORE_PROGRESS).delete(id);

                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });
        } catch {
            // Memory delete succeeded
        }
    },

    async getProgress(bookId: string): Promise<ReadingProgress | null> {
        if (!isIndexedDBAvailable()) {
            return memoryProgress.get(bookId) || null;
        }

        try {
            const db = await openDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_PROGRESS, 'readonly');
                const store = tx.objectStore(STORE_PROGRESS);
                const request = store.get(bookId);

                request.onsuccess = () => resolve(request.result || null);
                request.onerror = () => reject(request.error);
            });
        } catch {
            return memoryProgress.get(bookId) || null;
        }
    },

    async saveProgress(progress: ReadingProgress): Promise<void> {
        memoryProgress.set(progress.bookId, progress);

        if (!isIndexedDBAvailable()) {
            return;
        }

        try {
            const db = await openDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_PROGRESS, 'readwrite');
                const store = tx.objectStore(STORE_PROGRESS);
                const request = store.put(progress);

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch {
            // Fallback succeeded via memory
        }
    },

    async getAllProgress(): Promise<Record<string, ReadingProgress>> {
        if (!isIndexedDBAvailable()) {
            const result: Record<string, ReadingProgress> = {};
            memoryProgress.forEach((val, key) => {
                result[key] = val;
            });
            return result;
        }

        try {
            const db = await openDatabase();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_PROGRESS, 'readonly');
                const store = tx.objectStore(STORE_PROGRESS);
                const request = store.getAll();

                request.onsuccess = () => {
                    const list: ReadingProgress[] = request.result || [];
                    const map: Record<string, ReadingProgress> = {};
                    list.forEach(p => {
                        map[p.bookId] = p;
                    });
                    resolve(map);
                };
                request.onerror = () => reject(request.error);
            });
        } catch {
            const result: Record<string, ReadingProgress> = {};
            memoryProgress.forEach((val, key) => {
                result[key] = val;
            });
            return result;
        }
    }
};
