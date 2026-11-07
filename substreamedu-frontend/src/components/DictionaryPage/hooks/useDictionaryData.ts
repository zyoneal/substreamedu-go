import { useState, useEffect, useCallback } from 'react';
import { DictionaryService } from '../../../services/DictionaryService';
import { AuthService } from '../../../services/AuthService';
import { debugError } from '../../../utils/debug';
import { DictionaryItem, DictionaryResource } from '../utils/dictionaryUtils';

export interface UseDictionaryDataOptions {
    viewMode: 'groups' | 'categories' | 'words';
}

export interface UseDictionaryDataReturn {
    resources: DictionaryResource[];
    allWords: DictionaryItem[];
    categories: { categoryName: string; numberOfWords: number }[];
    categoryWords: DictionaryItem[];
    selectedCategoryName: string | null;
    status: 'idle' | 'loading' | 'error' | 'success';
    isLoadingWords: boolean;
    isLoadingCategoryWords: boolean;
    isExporting: boolean;
    isCategorizing: boolean;
    categorizeProgress: { processed: number; total: number; remaining: number } | null;
    categorizeMessage: string | null;
    editingWord: DictionaryItem | null;
    handleDelete: (groupName: string) => Promise<void>;
    handleDeleteWord: (resourceName: string, itemId: number) => Promise<void>;
    handleSaveWord: (updatedWord: DictionaryItem) => Promise<void>;
    handleSelectCategory: (catName: string | null) => Promise<void>;
    handleRunCategorize: () => Promise<void>;
    handleQuickEdit: (word: DictionaryItem) => void;
    handleCancelEdit: () => void;
    handleExport: () => Promise<void>;
}

export const useDictionaryData = ({ viewMode }: UseDictionaryDataOptions): UseDictionaryDataReturn => {
    const [resources, setResources] = useState<DictionaryResource[]>([]);
    const [allWords, setAllWords] = useState<DictionaryItem[]>([]);
    const [categories, setCategories] = useState<{ categoryName: string; numberOfWords: number }[]>([]);
    const [selectedCategoryName, setSelectedCategoryName] = useState<string | null>(null);
    const [categoryWords, setCategoryWords] = useState<DictionaryItem[]>([]);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
    const [isLoadingWords, setIsLoadingWords] = useState(false);
    const [isLoadingCategoryWords, setIsLoadingCategoryWords] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [editingWord, setEditingWord] = useState<DictionaryItem | null>(null);

    const [isCategorizing, setIsCategorizing] = useState(false);
    const [categorizeProgress, setCategorizeProgress] = useState<{ processed: number; total: number; remaining: number } | null>(null);
    const [categorizeMessage, setCategorizeMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            if (!AuthService.getUserEmail()) {
                setResources([]);
                setCategories([]);
                setAllWords([]);
                setStatus('success');
                setIsLoadingWords(false);
                return;
            }
            setStatus('loading');
            try {
                if (viewMode === 'groups') {
                    const data = await DictionaryService.fetchDictionaryResources();
                    setResources(Array.isArray(data) ? data : []);
                } else if (viewMode === 'categories') {
                    const data = await DictionaryService.fetchDictionaryCategories();
                    setCategories(Array.isArray(data) ? data : []);
                } else if (viewMode === 'words') {
                    setIsLoadingWords(true);
                    const words = await DictionaryService.fetchDictionaryItemsByUser();
                    setAllWords(Array.isArray(words) ? words : []);
                }
                setStatus('success');
            } catch (error) {
                debugError('Failed to fetch data', error);
                setResources([]);
                setCategories([]);
                setAllWords([]);
                setStatus('error');
            } finally {
                setIsLoadingWords(false);
            }
        };
        fetchData();
    }, [viewMode]);

    const handleDelete = useCallback(async (groupName: string) => {
        try {
            await DictionaryService.deleteDictionaryResource(groupName);
            setResources(prev => prev.filter(r => (r.groupName || '') !== groupName));
        } catch (error) {
            debugError('Failed to delete resource', error);
        }
    }, []);

    const handleDeleteWord = useCallback(async (resourceName: string, itemId: number) => {
        try {
            await DictionaryService.deleteDictionaryItem(resourceName, itemId);
            setAllWords(prev => prev.filter(word => word.id !== itemId));
            setCategoryWords(prev => prev.filter(word => word.id !== itemId));
        } catch (error) {
            debugError('Failed to delete word', error);
        }
    }, []);

    const handleSaveWord = useCallback(async (updatedWord: DictionaryItem) => {
        try {
            setAllWords(prev => prev.map(word =>
                word.id === updatedWord.id ? updatedWord : word
            ));
            setCategoryWords(prev => prev.map(word =>
                word.id === updatedWord.id ? updatedWord : word
            ));
            setEditingWord(null);
        } catch (error) {
            debugError('Failed to update word', error);
        }
    }, []);

    const handleSelectCategory = useCallback(async (catName: string | null) => {
        setSelectedCategoryName(catName);
        if (!catName) {
            setCategoryWords([]);
            return;
        }
        setIsLoadingCategoryWords(true);
        try {
            const resp = await DictionaryService.fetchDictionaryItemsByCategory(catName, 0, 100);
            const rawItems = (resp.items || []) as Array<Partial<DictionaryItem> & { source?: string; word?: string; translation?: string; repetitionLevel?: number; nextRepetitionDate?: string; status?: string }>;
            const normalizedItems: DictionaryItem[] = rawItems.map((item) => ({
                id: item.id ?? 0,
                resourceName: item.resourceName || item.source || 'vault',
                highlightedText: item.highlightedText || item.word || 'Untitled Word',
                translatedText: item.translatedText || item.translation || null,
                context: item.context || null,
                note: item.note || null,
                definition: item.definition || null,
                imageUrl: item.imageUrl || null,
                transcription: item.transcription || null,
                tags: item.tags || [],
                difficulty: item.difficulty,
                lastReviewed: item.lastReviewed,
                reviewCount: item.reviewCount || item.repetitionLevel || 0,
                nextReview: item.nextReview || item.nextRepetitionDate,
                mastered: item.mastered || item.status === 'mastered',
            }));
            setCategoryWords(normalizedItems);
        } catch (err) {
            debugError('Failed to fetch category items', err);
            setCategoryWords([]);
        } finally {
            setIsLoadingCategoryWords(false);
        }
    }, []);

    const handleRunCategorize = useCallback(async () => {
        if (isCategorizing) return;
        setIsCategorizing(true);
        setCategorizeMessage('Categorizing vocabulary into semantic themes...');
        try {
            let remaining = 1;
            let totalProcessed = 0;
            while (remaining > 0) {
                const res = await DictionaryService.categorizeUserVocabulary(100);
                totalProcessed += res.categorized;
                remaining = res.remaining;
                setCategorizeProgress({
                    processed: totalProcessed,
                    total: res.total,
                    remaining: res.remaining,
                });
                if (res.categorized === 0 && res.remaining === 0) {
                    break;
                }
                if (res.remaining > 0) {
                    await new Promise(r => setTimeout(r, 200));
                }
            }
            setCategorizeMessage(`Successfully categorized ${totalProcessed} words!`);
            const updatedCats = await DictionaryService.fetchDictionaryCategories();
            setCategories(Array.isArray(updatedCats) ? updatedCats : []);
        } catch (err) {
            debugError('Failed to categorize dictionary', err);
            setCategorizeMessage('Categorization failed. Please try again.');
        } finally {
            setIsCategorizing(false);
        }
    }, [isCategorizing]);

    const handleQuickEdit = useCallback((word: DictionaryItem) => {
        setEditingWord(word);
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingWord(null);
    }, []);

    const handleExport = useCallback(async () => {
        let url: string | null = null;
        setIsExporting(true);
        try {
            const blob = await DictionaryService.exportAllDictionaryAsAnki();
            url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", "full_dictionary.apkg");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            debugError('Export failed', error);
        } finally {
            if (url) {
                setTimeout(() => URL.revokeObjectURL(url!), 100);
            }
            setIsExporting(false);
        }
    }, []);

    return {
        resources,
        allWords,
        categories,
        categoryWords,
        selectedCategoryName,
        status,
        isLoadingWords,
        isLoadingCategoryWords,
        isExporting,
        isCategorizing,
        categorizeProgress,
        categorizeMessage,
        editingWord,
        handleDelete,
        handleDeleteWord,
        handleSaveWord,
        handleSelectCategory,
        handleRunCategorize,
        handleQuickEdit,
        handleCancelEdit,
        handleExport,
    };
};
