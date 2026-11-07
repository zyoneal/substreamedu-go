import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { IntlShape } from 'react-intl';
import { Play, Film, Music, Type } from 'lucide-react';
import {
    DictionaryItem,
    DictionaryResource,
    SourceCategory,
    getSourceType,
    ITEMS_PER_PAGE,
    SEARCH_DEBOUNCE_MS,
} from '../utils/dictionaryUtils';

export interface UseDictionarySearchPaginationOptions {
    resources: DictionaryResource[];
    allWords: DictionaryItem[];
    categories: { categoryName: string; numberOfWords: number }[];
    categoryWords: DictionaryItem[];
    intl: IntlShape;
}

export interface UseDictionarySearchPaginationReturn {
    search: { query: string; debouncedQuery: string };
    setSearchQuery: (query: string) => void;
    clearSearch: () => void;
    view: {
        mode: 'groups' | 'categories' | 'words';
        layout: 'grid' | 'list';
        currentPage: number;
    };
    setViewMode: (mode: 'groups' | 'categories' | 'words') => void;
    setLayout: (layout: 'grid' | 'list') => void;
    handlePageChange: (newPage: number) => void;
    selectedCategory: string | null;
    setSelectedCategory: (cat: string | null) => void;
    categorizedResources: SourceCategory[];
    displayedResources: DictionaryResource[];
    sortedFilteredWords: DictionaryItem[];
    displayedWords: DictionaryItem[];
    totalPages: number;
    filteredCategoryList: { categoryName: string; numberOfWords: number }[];
    filteredCategoryWords: DictionaryItem[];
    totalWordsCount: number;
    masteredCount: number;
    activeGroupsCount: number;
}

export const useDictionarySearchPagination = ({
    resources,
    allWords,
    categories,
    categoryWords,
    intl,
}: UseDictionarySearchPaginationOptions): UseDictionarySearchPaginationReturn => {
    const [search, setSearch] = useState<{ query: string; debouncedQuery: string }>({
        query: '',
        debouncedQuery: '',
    });

    const [view, setView] = useState<{
        mode: 'groups' | 'categories' | 'words';
        layout: 'grid' | 'list';
        currentPage: number;
    }>({
        mode: 'groups',
        layout: 'grid',
        currentPage: 1,
    });

    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const searchTimeoutRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            setSearch(prev => ({ ...prev, debouncedQuery: search.query }));
            setView(prev => ({ ...prev, currentPage: 1 }));
        }, SEARCH_DEBOUNCE_MS);

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [search.query]);

    const setSearchQuery = useCallback((query: string) => {
        setSearch(prev => ({ ...prev, query }));
    }, []);

    const clearSearch = useCallback(() => {
        setSearch({ query: '', debouncedQuery: '' });
    }, []);

    const setViewMode = useCallback((mode: 'groups' | 'categories' | 'words') => {
        setView(prev => ({ ...prev, mode, currentPage: 1 }));
    }, []);

    const setLayout = useCallback((layout: 'grid' | 'list') => {
        setView(prev => ({ ...prev, layout }));
    }, []);

    const handlePageChange = useCallback((newPage: number) => {
        setView(prev => ({ ...prev, currentPage: newPage }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    const filteredResources = useMemo(() => {
        if (!Array.isArray(resources)) return [];
        return resources.filter(r =>
            (r.groupName || '').toLowerCase().includes(search.debouncedQuery.toLowerCase())
        );
    }, [resources, search.debouncedQuery]);

    const categorizedResources = useMemo(() => {
        const cats: SourceCategory[] = [
            {
                type: 'youtube',
                name: intl.formatMessage({ id: 'dictionary.categories.youtube', defaultMessage: 'YouTube' }),
                icon: Play,
                tag: '[YOUTUBE]',
                color: '#ef4444',
                resources: [],
            },
            {
                type: 'movies',
                name: intl.formatMessage({ id: 'dictionary.categories.movies', defaultMessage: 'Movies & Series' }),
                icon: Film,
                tag: '[MOVIES]',
                color: '#a855f7',
                resources: [],
            },
            {
                type: 'text',
                name: intl.formatMessage({ id: 'dictionary.categories.text', defaultMessage: 'Texts & Articles' }),
                icon: Type,
                tag: '[TEXTS]',
                color: '#38bdf8',
                resources: [],
            },
            {
                type: 'songs',
                name: intl.formatMessage({ id: 'dictionary.categories.songs', defaultMessage: 'Songs & Lyrics' }),
                icon: Music,
                tag: '[LYRICS]',
                color: '#10b981',
                resources: [],
            },
        ];

        filteredResources.forEach(resource => {
            const sourceType = getSourceType(resource.groupName || '');
            const category = cats.find(c => c.type === sourceType);
            if (category) {
                category.resources.push(resource);
            }
        });

        return cats;
    }, [filteredResources, intl]);

    const displayedResources = useMemo(() => {
        if (selectedCategory === null) {
            return filteredResources;
        }

        const category = categorizedResources.find(cat => cat.type === selectedCategory);
        return category ? category.resources : [];
    }, [selectedCategory, categorizedResources, filteredResources]);

    const filteredWords = useMemo(() => {
        if (!Array.isArray(allWords)) return [];
        let filtered = allWords;

        if (search.debouncedQuery.trim()) {
            const query = search.debouncedQuery.toLowerCase();
            filtered = filtered.filter(word =>
                (word.highlightedText?.toLowerCase() || '').includes(query) ||
                (word.translatedText?.toLowerCase() || '').includes(query) ||
                (word.definition?.toLowerCase() || '').includes(query)
            );
        }

        return filtered;
    }, [allWords, search.debouncedQuery]);

    const filteredWordsByCategory = useMemo(() => {
        if (selectedCategory === null) {
            return filteredWords;
        }

        return filteredWords.filter(word => {
            if (!word.resourceName) return false;
            const sourceType = getSourceType(word.resourceName);
            return sourceType === selectedCategory;
        });
    }, [filteredWords, selectedCategory]);

    const sortedFilteredWords = useMemo(() => {
        const groups = new Map<string, DictionaryItem[]>();
        for (const item of filteredWordsByCategory) {
            const key = (item.highlightedText || '').trim().toLowerCase();
            const list = groups.get(key) || [];
            list.push(item);
            groups.set(key, list);
        }

        const groupEntries = Array.from(groups.entries());
        groupEntries.sort((a, b) => {
            const countDiff = b[1].length - a[1].length;
            if (countDiff !== 0) return countDiff;
            return a[0].localeCompare(b[0]);
        });

        const result: DictionaryItem[] = [];
        for (const [, items] of groupEntries) {
            items.sort((a, b) => a.id - b.id);
            result.push(...items);
        }
        return result;
    }, [filteredWordsByCategory]);

    const displayedWords = useMemo(() => {
        const startIndex = (view.currentPage - 1) * ITEMS_PER_PAGE;
        const endIndex = startIndex + ITEMS_PER_PAGE;
        return sortedFilteredWords.slice(startIndex, endIndex);
    }, [sortedFilteredWords, view.currentPage]);

    const totalPages = Math.ceil(sortedFilteredWords.length / ITEMS_PER_PAGE);

    const filteredCategoryList = useMemo(() => {
        if (!Array.isArray(categories)) return [];
        if (!search.debouncedQuery.trim()) return categories;
        const q = search.debouncedQuery.toLowerCase();
        return categories.filter(c => c.categoryName.toLowerCase().includes(q));
    }, [categories, search.debouncedQuery]);

    const filteredCategoryWords = useMemo(() => {
        if (!Array.isArray(categoryWords)) return [];
        if (!search.debouncedQuery.trim()) return categoryWords;
        const q = search.debouncedQuery.toLowerCase();
        return categoryWords.filter(word =>
            (word.highlightedText?.toLowerCase() || '').includes(q) ||
            (word.translatedText?.toLowerCase() || '').includes(q) ||
            (word.definition?.toLowerCase() || '').includes(q)
        );
    }, [categoryWords, search.debouncedQuery]);

    const totalWordsCount = useMemo(() => {
        if (Array.isArray(allWords) && allWords.length > 0) return allWords.length;
        if (Array.isArray(resources) && resources.length > 0) {
            return resources.reduce((acc, r) => acc + (r?.numberOfWords || 0), 0);
        }
        if (Array.isArray(categories) && categories.length > 0) {
            return categories.reduce((acc, c) => acc + (c?.numberOfWords || 0), 0);
        }
        return 0;
    }, [allWords, resources, categories]);

    const masteredCount = useMemo(() => {
        if (!Array.isArray(allWords)) return 0;
        return allWords.filter(w => w && (w.mastered || (w.reviewCount && w.reviewCount >= 5))).length;
    }, [allWords]);

    const activeGroupsCount = useMemo(() => {
        return Array.isArray(resources) ? resources.length : 0;
    }, [resources]);

    return {
        search,
        setSearchQuery,
        clearSearch,
        view,
        setViewMode,
        setLayout,
        handlePageChange,
        selectedCategory,
        setSelectedCategory,
        categorizedResources,
        displayedResources,
        sortedFilteredWords,
        displayedWords,
        totalPages,
        filteredCategoryList,
        filteredCategoryWords,
        totalWordsCount,
        masteredCount,
        activeGroupsCount,
    };
};
