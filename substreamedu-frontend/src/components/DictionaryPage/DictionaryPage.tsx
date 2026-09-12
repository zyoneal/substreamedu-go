import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';

import Download from 'lucide-react/dist/esm/icons/download';
import Search from 'lucide-react/dist/esm/icons/search';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Grid3X3 from 'lucide-react/dist/esm/icons/grid-3x3';
import List from 'lucide-react/dist/esm/icons/list';
import ChevronLeft from 'lucide-react/dist/esm/icons/chevron-left';
import ChevronRight from 'lucide-react/dist/esm/icons/chevron-right';
import Play from 'lucide-react/dist/esm/icons/play';
import Film from 'lucide-react/dist/esm/icons/film';
import Music from 'lucide-react/dist/esm/icons/music';
import Folder from 'lucide-react/dist/esm/icons/folder';
import Type from 'lucide-react/dist/esm/icons/type';
import Edit from 'lucide-react/dist/esm/icons/edit';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Volume2 from 'lucide-react/dist/esm/icons/volume-2';
import Layers from 'lucide-react/dist/esm/icons/layers';
import X from 'lucide-react/dist/esm/icons/x';

import { DictionaryService } from '../../services/DictionaryService';
import { debugError } from '../../utils/debug';
import { Card, CardContent } from "../ui/card";
import { Input } from "../ui/input";
import styles from './DictionaryPage.module.css';

interface DictionaryResource {
    groupName: string;
    numberOfWords: number;
    createdAt?: string;
    lastModified?: string;
    sampleWords?: string[];
}

interface DictionaryItem {
    id: number;
    resourceName: string;
    highlightedText: string | null;
    translatedText: string | null;
    context: string | null;
    note: string | null;
    definition: string | null;
    imageUrl: string | null;
    transcription: string | null;
    tags?: string[];
    difficulty?: 'easy' | 'medium' | 'hard';
    lastReviewed?: string;
    reviewCount?: number;
    nextReview?: string;
    mastered?: boolean;
}

const escapeRegExp = (value: string): string => {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const getHighlightedParts = (text: string, term: string): (string | JSX.Element)[] => {
    const normalizedTerm = term.trim();
    if (!text || !normalizedTerm) return [text];
    try {
        const pattern = new RegExp(`(${escapeRegExp(normalizedTerm)})`, 'gi');
        const segments = text.split(pattern);
        return segments.map((segment, index) => {
            if (segment.toLowerCase() === normalizedTerm.toLowerCase()) {
                return (
                    <span key={index} className={styles.contextHighlight}>
                        {segment}
                    </span>
                );
            }
            return segment;
        });
    } catch {
        return [text];
    }
};

interface SourceCategory {
    type: 'youtube' | 'movies' | 'songs' | 'text' | 'other';
    name: string;
    icon: React.ComponentType<any>;
    tag: string;
    color: string;
    resources: DictionaryResource[];
}

const ITEMS_PER_PAGE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const getSourceType = (resourceName: string): 'youtube' | 'movies' | 'songs' | 'text' | 'other' => {
    const name = resourceName.trim().toLowerCase();

    if (name === 'youtube' || name === 'video subtitle' || name.startsWith('yt:')) {
        return 'youtube';
    }
    if (name.endsWith('.srt')) {
        return 'movies';
    }
    if (name === 'pasted text') {
        return 'text';
    }

    return 'songs';
};

const getSourceTag = (sourceType: string): string => {
    switch (sourceType) {
        case 'youtube': return '[YOUTUBE]';
        case 'movies': return '[MOVIES]';
        case 'text': return '[TEXTS]';
        case 'songs': return '[LYRICS]';
        default: return '[MEDIA]';
    }
};

const DictionaryPage: React.FC = () => {
    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.05,
                delayChildren: 0.05
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 12 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] }
        }
    };

    const [resources, setResources] = useState<DictionaryResource[]>([]);
    const [allWords, setAllWords] = useState<DictionaryItem[]>([]);
    const [search, setSearch] = useState<{ query: string; debouncedQuery: string }>({
        query: '',
        debouncedQuery: ''
    });
    const [view, setView] = useState<{
        mode: 'groups' | 'words';
        layout: 'grid' | 'list';
        currentPage: number;
    }>({
        mode: 'groups',
        layout: 'grid',
        currentPage: 1
    });
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
    const [isLoadingWords, setIsLoadingWords] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [editingWord, setEditingWord] = useState<DictionaryItem | null>(null);

    const searchTimeoutRef = useRef<NodeJS.Timeout>();
    const intl = useIntl();

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

    useEffect(() => {
        const fetchData = async () => {
            setStatus('loading');
            try {
                if (view.mode === 'groups') {
                    const data = await DictionaryService.fetchDictionaryResources();
                    setResources(Array.isArray(data) ? data : []);
                } else if (view.mode === 'words') {
                    setIsLoadingWords(true);
                    const words = await DictionaryService.fetchDictionaryItemsByUser();
                    setAllWords(Array.isArray(words) ? words : []);
                }
                setStatus('success');
            } catch (error) {
                debugError('Failed to fetch data', error);
                setResources([]);
                setAllWords([]);
                setStatus('error');
            } finally {
                setIsLoadingWords(false);
            }
        };
        fetchData();
    }, [view.mode]);

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
        } catch (error) {
            debugError('Failed to delete word', error);
        }
    }, []);

    const handleSaveWord = useCallback(async (updatedWord: DictionaryItem) => {
        try {
            setAllWords(prev => prev.map(word =>
                word.id === updatedWord.id ? updatedWord : word
            ));
            setEditingWord(null);
        } catch (error) {
            debugError('Failed to update word', error);
        }
    }, []);

    const handleCancelEdit = useCallback(() => {
        setEditingWord(null);
    }, []);

    const handleQuickEdit = useCallback((word: DictionaryItem) => {
        setEditingWord(word);
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

    const filteredResources = useMemo(() => {
        if (!Array.isArray(resources)) return [];
        return resources.filter(r =>
            (r.groupName || '').toLowerCase().includes(search.debouncedQuery.toLowerCase())
        );
    }, [resources, search.debouncedQuery]);

    const categorizedResources = useMemo(() => {
        const categories: SourceCategory[] = [
            {
                type: 'youtube',
                name: intl.formatMessage({ id: 'dictionary.categories.youtube', defaultMessage: 'YouTube' }),
                icon: Play,
                tag: '[YOUTUBE]',
                color: '#ef4444',
                resources: []
            },
            {
                type: 'movies',
                name: intl.formatMessage({ id: 'dictionary.categories.movies', defaultMessage: 'Movies & Series' }),
                icon: Film,
                tag: '[MOVIES]',
                color: '#a855f7',
                resources: []
            },
            {
                type: 'text',
                name: intl.formatMessage({ id: 'dictionary.categories.text', defaultMessage: 'Texts & Articles' }),
                icon: Type,
                tag: '[TEXTS]',
                color: '#38bdf8',
                resources: []
            },
            {
                type: 'songs',
                name: intl.formatMessage({ id: 'dictionary.categories.songs', defaultMessage: 'Songs & Lyrics' }),
                icon: Music,
                tag: '[LYRICS]',
                color: '#10b981',
                resources: []
            }
        ];

        filteredResources.forEach(resource => {
            const sourceType = getSourceType(resource.groupName || '');
            const category = categories.find(cat => cat.type === sourceType);
            if (category) {
                category.resources.push(resource);
            }
        });

        return categories;
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

    const handlePageChange = useCallback((newPage: number) => {
        setView(prev => ({ ...prev, currentPage: newPage }));
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, []);

    // Summary Statistics for Hero Bar
    const totalWordsCount = useMemo(() => {
        if (Array.isArray(allWords) && allWords.length > 0) return allWords.length;
        if (Array.isArray(resources) && resources.length > 0) {
            return resources.reduce((acc, r) => acc + (r?.numberOfWords || 0), 0);
        }
        return 0;
    }, [allWords, resources]);

    const masteredCount = useMemo(() => {
        if (!Array.isArray(allWords)) return 0;
        return allWords.filter(w => w && (w.mastered || (w.reviewCount && w.reviewCount >= 5))).length;
    }, [allWords]);

    const activeGroupsCount = useMemo(() => {
        return Array.isArray(resources) ? resources.length : 0;
    }, [resources]);

    const handleYouGlishClick = (text: string) => {
        const encodedText = encodeURIComponent(text);
        window.open(`https://youglish.com/pronounce/${encodedText}/english`, '_blank');
    };

    const parseDoTags = (message: string): (string | JSX.Element)[] => {
        const parts = message.split(/(<do>.*?<\/do>)/g);
        return parts.map((part: string, index: number) => {
            if (part.startsWith('<do>') && part.endsWith('</do>')) {
                const content = part.replace(/<\/?do>/g, '');
                return <span key={index} className={styles.accent}>{content}</span>;
            }
            return part;
        }).filter((part: string | JSX.Element) => part !== '');
    };

    const renderSearchBar = () => (
        <div className={styles.searchWrapper} role="search">
            <Search className={styles.searchIcon} />
            <Input
                type="text"
                placeholder={view.mode === 'groups'
                    ? intl.formatMessage({ id: 'searchGroupsPlaceholder', defaultMessage: 'Search collections...' })
                    : intl.formatMessage({ id: 'searchWordsPlaceholder', defaultMessage: 'Search words or context...' })
                }
                value={search.query}
                onChange={(e) => setSearch(prev => ({ ...prev, query: e.target.value }))}
                className={styles.dictionarySearch}
                aria-label="Search dictionary"
            />
            {search.query && (
                <button
                    type="button"
                    onClick={() => setSearch(prev => ({ ...prev, query: '' }))}
                    className={styles.searchClearBtn}
                    aria-label="Clear search"
                >
                    <X size={14} />
                </button>
            )}
        </div>
    );

    const renderViewModeToggle = () => (
        <div className={styles.segmentedControl} role="tablist" aria-label="View mode">
            <button
                onClick={() => {
                    setView(prev => ({ ...prev, mode: 'groups', currentPage: 1 }));
                    setSearch(prev => ({ ...prev, query: '' }));
                    setSelectedCategory(null);
                }}
                className={`${styles.segmentedButton} ${view.mode === 'groups' ? styles.segmentedButtonActive : ''}`}
                role="tab"
                aria-selected={view.mode === 'groups'}
            >
                <Folder size={15} />
                <span>{intl.formatMessage({ id: 'groups', defaultMessage: 'Collections' })}</span>
            </button>
            <button
                onClick={() => {
                    setView(prev => ({ ...prev, mode: 'words', currentPage: 1 }));
                    setSearch(prev => ({ ...prev, query: '' }));
                    setSelectedCategory(null);
                }}
                className={`${styles.segmentedButton} ${view.mode === 'words' ? styles.segmentedButtonActive : ''}`}
                role="tab"
                aria-selected={view.mode === 'words'}
            >
                <BookOpen size={15} />
                <span>{intl.formatMessage({ id: 'allWords', defaultMessage: 'All Words' })}</span>
            </button>
        </div>
    );

    const renderCategoryFilters = () => {
        const filterCategories = [
            {
                key: null,
                name: intl.formatMessage({ id: 'dictionary.categories.all', defaultMessage: 'ALL' }),
                tag: '[ALL]',
                icon: Layers
            },
            {
                key: 'youtube',
                name: intl.formatMessage({ id: 'dictionary.categories.youtube', defaultMessage: 'YOUTUBE' }),
                tag: '[YOUTUBE]',
                icon: Play
            },
            {
                key: 'movies',
                name: intl.formatMessage({ id: 'dictionary.categories.movies', defaultMessage: 'MOVIES' }),
                tag: '[MOVIES]',
                icon: Film
            },
            {
                key: 'text',
                name: intl.formatMessage({ id: 'dictionary.categories.text', defaultMessage: 'TEXTS' }),
                tag: '[TEXTS]',
                icon: Type
            },
            {
                key: 'songs',
                name: intl.formatMessage({ id: 'dictionary.categories.songs', defaultMessage: 'LYRICS' }),
                tag: '[LYRICS]',
                icon: Music
            }
        ];

        return (
            <div className={styles.categoryFilterList} role="tablist" aria-label="Content filters">
                {filterCategories.map((cat) => {
                    const isActive = selectedCategory === cat.key;
                    const Icon = cat.icon;
                    return (
                        <button
                            key={cat.key || 'all'}
                            onClick={() => setSelectedCategory(cat.key)}
                            className={`${styles.categoryFilterBtn} ${isActive ? styles.categoryFilterBtnActive : ''}`}
                            role="tab"
                            aria-selected={isActive}
                        >
                            <Icon size={13} />
                            <span>{cat.tag}</span>
                        </button>
                    );
                })}
            </div>
        );
    };

    const renderResourceCard = (res: DictionaryResource, index: number) => {
        const sourceType = getSourceType(res.groupName || '');
        const tag = getSourceTag(sourceType);

        return (
            <div
                key={res.groupName || `resource-${index}`}
                className={styles.groupCard}
            >
                <button
                    className={styles.deleteGroupBtn}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleDelete(res.groupName || '');
                    }}
                    title="Delete collection"
                    aria-label="Delete collection"
                >
                    <Trash2 size={14} />
                </button>

                <Link
                    to={`/dictionary/resources/${res.groupName || 'unknown'}`}
                    className={styles.groupCardLink}
                >
                    <div className={styles.groupCardHeader}>
                        <div className={styles.groupTagRow}>
                            <span className={styles.monoTag}>{tag}</span>
                        </div>
                        <span className={styles.groupWordCountPill}>
                            {res.numberOfWords} {res.numberOfWords === 1 ? 'word' : 'words'}
                        </span>
                    </div>

                    <h3 className={styles.groupTitle}>
                        {res.groupName || 'Untitled Group'}
                    </h3>

                    {res.sampleWords && res.sampleWords.length > 0 && (
                        <div className={styles.sampleWordsBox}>
                            <span className={styles.sampleWordsLabel}>Vocabulary Preview</span>
                            <div className={styles.sampleWordsChips}>
                                {res.sampleWords.slice(0, 4).map((word, idx) => (
                                    <span key={idx} className={styles.wordChip}>
                                        {word}
                                    </span>
                                ))}
                                {res.sampleWords.length > 4 && (
                                    <span className={styles.moreWordsChip}>
                                        +{res.sampleWords.length - 4}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </Link>
            </div>
        );
    };

    const renderResourceListItem = (res: DictionaryResource, index: number) => {
        const sourceType = getSourceType(res.groupName || '');
        const tag = getSourceTag(sourceType);

        return (
            <div
                key={res.groupName || `list-item-${index}`}
                className={styles.groupListItem}
            >
                <Link
                    to={`/dictionary/resources/${res.groupName || 'unknown'}`}
                    className={styles.groupListItemLink}
                >
                    <div className={styles.listItemLeft}>
                        <span className={styles.monoTag}>{tag}</span>
                        <h3 className={styles.listItemTitle}>
                            {res.groupName || 'Untitled Group'}
                        </h3>
                    </div>

                    <div className={styles.listItemRight}>
                        <span className={styles.groupWordCountPill}>
                            {res.numberOfWords} {res.numberOfWords === 1 ? 'word' : 'words'}
                        </span>
                        <button
                            className={styles.actionIconBtn}
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleDelete(res.groupName || '');
                            }}
                            title="Delete collection"
                            aria-label="Delete collection"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </Link>
            </div>
        );
    };

    const renderWordCard = (word: DictionaryItem, index: number) => {
        const getMasteryBadge = () => {
            if (word.mastered) {
                return <span className={`${styles.masteryBadge} ${styles.masteredBadge}`}>Mastered</span>;
            }
            if (word.reviewCount && word.reviewCount > 5) {
                return <span className={`${styles.masteryBadge} ${styles.advancedBadge}`}>Advanced</span>;
            }
            if (word.reviewCount && word.reviewCount > 2) {
                return <span className={`${styles.masteryBadge} ${styles.intermediateBadge}`}>Reviewing</span>;
            }
            return <span className={`${styles.masteryBadge} ${styles.beginnerBadge}`}>New</span>;
        };

        const definition = word.definition?.trim();
        const translation = word.translatedText?.trim();

        return (
            <div
                key={word.id || `word-${index}`}
                className={styles.wordCard}
            >
                {/* Column 1: Word, Audio, Meaning */}
                <div className={styles.wordPrimaryCol}>
                    <div className={styles.wordTitleRow}>
                        <button
                            onClick={() => handleYouGlishClick(word.highlightedText || '')}
                            className={styles.wordClickableTitle}
                            title="Listen pronunciation on YouGlish"
                        >
                            <span>{word.highlightedText || 'Untitled Word'}</span>
                            <Volume2 className={styles.soundWaveIcon} />
                        </button>
                        {word.transcription && (
                            <span className={styles.wordTranscription}>
                                [{word.transcription}]
                            </span>
                        )}
                    </div>

                    <div className={styles.wordDefinitionBox}>
                        <div className="flex flex-col gap-1 min-w-0">
                            {definition && (
                                <p className={styles.wordDefinitionText}>
                                    {definition}
                                </p>
                            )}
                            {translation && translation !== definition && (
                                <p className={styles.wordTranslationText}>
                                    {translation}
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Column 2: Context Quote & Tags */}
                <div className={styles.wordContextCol}>
                    {word.context && word.context.trim().toLowerCase() !== (word.highlightedText || '').trim().toLowerCase() && (
                        <div className={styles.contextQuoteBox}>
                            {getHighlightedParts(word.context, word.highlightedText || '')}
                        </div>
                    )}

                    {word.tags && word.tags.length > 0 && (
                        <div className={styles.wordTagsRow}>
                            {word.tags.slice(0, 4).map((tag, tagIdx) => (
                                <span key={tagIdx} className={styles.tagPill}>
                                    #{tag}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Column 3: Mastery & Actions */}
                <div className={styles.wordActionsCol}>
                    <div className="flex items-center gap-2">
                        {getMasteryBadge()}
                    </div>

                    <span className={styles.sourcePill}>
                        <Folder size={11} />
                        <span>{word.resourceName || 'vault'}</span>
                    </span>

                    <div className={styles.actionButtonsGroup}>
                        <button
                            className={styles.actionIconBtn}
                            onClick={() => handleQuickEdit(word)}
                            title="Edit word"
                            aria-label="Edit word"
                        >
                            <Edit size={13} />
                        </button>
                        <button
                            className={`${styles.actionIconBtn} ${styles.actionIconBtnDelete}`}
                            onClick={() => handleDeleteWord(word.resourceName, word.id)}
                            title="Delete word"
                            aria-label="Delete word"
                        >
                            <Trash2 size={13} />
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderEditWordModal = () => {
        if (!editingWord) return null;

        return createPortal(
            <div className={styles.modalOverlay}>
                <div className={styles.modalContent}>
                    <div className={styles.modalHeader}>
                        <h3 className={styles.modalTitle}>
                            Edit: {editingWord.highlightedText}
                        </h3>
                        <button
                            onClick={handleCancelEdit}
                            className={styles.modalCloseBtn}
                            aria-label="Close modal"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <div className={styles.modalBody}>
                        <div className={styles.modalFieldGroup}>
                            <label className={styles.modalLabel}>Translation</label>
                            <Input
                                value={editingWord.translatedText || ''}
                                onChange={(e) => setEditingWord({ ...editingWord, translatedText: e.target.value })}
                                className={styles.modalInput}
                                placeholder="Enter translation..."
                            />
                        </div>

                        <div className={styles.modalFieldGroup}>
                            <label className={styles.modalLabel}>Definition</label>
                            <Input
                                value={editingWord.definition || ''}
                                onChange={(e) => setEditingWord({ ...editingWord, definition: e.target.value })}
                                className={styles.modalInput}
                                placeholder="Enter English definition..."
                            />
                        </div>

                        <div className={styles.modalFieldGroup}>
                            <label className={styles.modalLabel}>Context Sentence</label>
                            <Input
                                value={editingWord.context || ''}
                                onChange={(e) => setEditingWord({ ...editingWord, context: e.target.value })}
                                className={styles.modalInput}
                                placeholder="Enter context sentence..."
                            />
                        </div>
                    </div>

                    <div className={styles.modalFooter}>
                        <button
                            onClick={handleCancelEdit}
                            className={styles.modalCancelBtn}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => handleSaveWord(editingWord)}
                            className={styles.modalSaveBtn}
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    };

    const renderPagination = () => {
        if (totalPages <= 1) return null;

        const getPageNumbers = () => {
            const pages: (number | string)[] = [];
            const maxVisiblePages = 5;

            if (totalPages <= maxVisiblePages) {
                for (let i = 1; i <= totalPages; i++) pages.push(i);
            } else {
                if (view.currentPage <= 3) {
                    for (let i = 1; i <= 3; i++) pages.push(i);
                    pages.push('...');
                    pages.push(totalPages);
                } else if (view.currentPage >= totalPages - 2) {
                    pages.push(1);
                    pages.push('...');
                    for (let i = totalPages - 2; i <= totalPages; i++) pages.push(i);
                } else {
                    pages.push(1);
                    pages.push('...');
                    pages.push(view.currentPage);
                    pages.push('...');
                    pages.push(totalPages);
                }
            }
            return pages;
        };

        return (
            <nav className={styles.paginationNav} aria-label="Pagination">
                <button
                    onClick={() => handlePageChange(view.currentPage - 1)}
                    disabled={view.currentPage === 1}
                    className={styles.paginationBtn}
                    aria-label="Previous page"
                >
                    <ChevronLeft size={16} />
                </button>

                {getPageNumbers().map((page, index) => (
                    <React.Fragment key={index}>
                        {page === '...' ? (
                            <span className={styles.paginationEllipsis}>⋯</span>
                        ) : (
                            <button
                                onClick={() => handlePageChange(page as number)}
                                className={`${styles.paginationBtn} ${view.currentPage === page ? styles.paginationBtnActive : ''}`}
                                aria-current={view.currentPage === page ? 'page' : undefined}
                            >
                                {page}
                            </button>
                        )}
                    </React.Fragment>
                ))}

                <button
                    onClick={() => handlePageChange(view.currentPage + 1)}
                    disabled={view.currentPage === totalPages}
                    className={styles.paginationBtn}
                    aria-label="Next page"
                >
                    <ChevronRight size={16} />
                </button>
            </nav>
        );
    };

    return (
        <motion.div
            className={styles.dictionaryContainer}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className={styles.ambientGlow} />
            <div className={`${styles.ambientGlow} ${styles.ambientGlowSecond}`} />

            <div className={styles.contentWrapper}>
                {/* Header Section */}
                <motion.div className={styles.headerSection} variants={itemVariants}>
                    <h1 className={styles.pageTitle}>
                        {parseDoTags(intl.formatMessage({
                            id: 'dictionaryTitle',
                            defaultMessage: 'My <do>dictionary</do>'
                        }))}
                    </h1>
                </motion.div>

                {/* Top Stats Hero Bar (3 Bento Cards) */}
                <motion.div className={styles.statsGrid} variants={itemVariants}>
                    <div className={styles.statCard}>
                        <div className={styles.statIconWrapper}>
                            <BookOpen size={22} />
                        </div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValueRow}>
                                <span className={styles.statValue}>{totalWordsCount}</span>
                                <span className={`${styles.statBadge} bg-indigo-500/10 text-indigo-400 border border-indigo-500/20`}>
                                    SAVED
                                </span>
                            </div>
                            <span className={styles.statLabel}>Total Vocabulary Words</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIconWrapper}>
                            <Sparkles size={22} />
                        </div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValueRow}>
                                <span className={styles.statValue}>{masteredCount}</span>
                                <span className={`${styles.statBadge} bg-emerald-500/10 text-emerald-400 border border-emerald-500/20`}>
                                    {totalWordsCount > 0 ? `${Math.round((masteredCount / totalWordsCount) * 100)}%` : '0%'}
                                </span>
                            </div>
                            <span className={styles.statLabel}>Mastered in Memory</span>
                        </div>
                    </div>

                    <div className={styles.statCard}>
                        <div className={styles.statIconWrapper}>
                            <Layers size={22} />
                        </div>
                        <div className={styles.statInfo}>
                            <div className={styles.statValueRow}>
                                <span className={styles.statValue}>{activeGroupsCount}</span>
                                <span className={`${styles.statBadge} bg-amber-500/10 text-amber-400 border border-amber-500/20`}>
                                    SOURCES
                                </span>
                            </div>
                            <span className={styles.statLabel}>Active Collections</span>
                        </div>
                    </div>
                </motion.div>

                {/* Controls & Filters Bar */}
                <motion.div className={styles.controlsContainer} variants={itemVariants}>
                    <div className={styles.topControlsRow}>
                        {renderViewModeToggle()}
                        {renderSearchBar()}
                    </div>

                    <div className={styles.bottomControlsRow}>
                        {renderCategoryFilters()}

                        <div className={styles.rightActionsGroup}>
                            {view.mode === 'groups' && (
                                <div className={styles.layoutToggle} role="tablist" aria-label="Layout mode">
                                    <button
                                        onClick={() => setView(prev => ({ ...prev, layout: 'grid' }))}
                                        className={`${styles.layoutButton} ${view.layout === 'grid' ? styles.layoutButtonActive : ''}`}
                                        title="Grid view"
                                        aria-label="Grid view"
                                    >
                                        <Grid3X3 size={15} />
                                    </button>
                                    <button
                                        onClick={() => setView(prev => ({ ...prev, layout: 'list' }))}
                                        className={`${styles.layoutButton} ${view.layout === 'list' ? styles.layoutButtonActive : ''}`}
                                        title="List view"
                                        aria-label="List view"
                                    >
                                        <List size={15} />
                                    </button>
                                </div>
                            )}

                            <button
                                onClick={handleExport}
                                className={styles.exportButton}
                                aria-label="Export dictionary to Anki (.apkg)"
                                disabled={isExporting || totalWordsCount === 0}
                            >
                                {isExporting ? (
                                    <div className={styles.spinner} />
                                ) : (
                                    <Download size={13} />
                                )}
                                <span>{isExporting ? 'EXPORTING...' : 'EXPORT ANKI'}</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Main Content Area */}
                <motion.div className="w-full" variants={itemVariants}>
                    {status === 'loading' || (view.mode === 'words' && isLoadingWords) ? (
                        <div className={styles.groupsGrid}>
                            {[...Array(6)].map((_, i) => (
                                <Card key={i} className="bg-white/[0.02] border border-white/[0.07] h-40 animate-pulse rounded-2xl">
                                    <CardContent className="p-0" />
                                </Card>
                            ))}
                        </div>
                    ) : view.mode === 'groups' ? (
                        displayedResources.length > 0 ? (
                            view.layout === 'grid' ? (
                                <div className={styles.groupsGrid}>
                                    {displayedResources.map((res, i) => renderResourceCard(res, i))}
                                </div>
                            ) : (
                                <div className={styles.groupsListWrapper}>
                                    {displayedResources.map((res, i) => renderResourceListItem(res, i))}
                                </div>
                            )
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>
                                    <Folder size={28} />
                                </div>
                                <h3 className={styles.emptyStateTitle}>
                                    {search.debouncedQuery
                                        ? `No collections found for "${search.debouncedQuery}"`
                                        : intl.formatMessage({ id: 'noResourcesFound', defaultMessage: 'No collections yet' })}
                                </h3>
                                <p className={styles.emptyStateText}>
                                    {search.debouncedQuery
                                        ? 'Try clearing your search query or switching categories.'
                                        : 'Save new words while watching videos, reading texts, or exploring lyrics to build your collections.'}
                                </p>
                                <div className={styles.emptyStateActions}>
                                    {search.debouncedQuery ? (
                                        <button
                                            onClick={() => setSearch(prev => ({ ...prev, query: '' }))}
                                            className={styles.emptyStateActionSecondary}
                                        >
                                            <Search size={14} />
                                            <span>Clear Search</span>
                                        </button>
                                    ) : (
                                        <Link to="/videos" className={styles.emptyStateActionPrimary}>
                                            <Play size={14} />
                                            <span>Explore Videos</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )
                    ) : (
                        sortedFilteredWords.length > 0 ? (
                            <div className={styles.wordsListContainer}>
                                {displayedWords.map((word, i) => renderWordCard(word, i))}
                                {renderPagination()}
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>
                                    <BookOpen size={28} />
                                </div>
                                <h3 className={styles.emptyStateTitle}>
                                    {search.debouncedQuery
                                        ? `No words found for "${search.debouncedQuery}"`
                                        : intl.formatMessage({ id: 'noWordsFound', defaultMessage: 'No words saved yet' })}
                                </h3>
                                <p className={styles.emptyStateText}>
                                    {search.debouncedQuery
                                        ? 'Try adjusting your search terms or category filters.'
                                        : 'Start adding words to your vocabulary vault during your review sessions.'}
                                </p>
                                <div className={styles.emptyStateActions}>
                                    {search.debouncedQuery && (
                                        <button
                                            onClick={() => setSearch(prev => ({ ...prev, query: '' }))}
                                            className={styles.emptyStateActionSecondary}
                                        >
                                            <Search size={14} />
                                            <span>Clear Search</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    )}
                </motion.div>

                {/* Edit Word Modal */}
                {renderEditWordModal()}
            </div>
        </motion.div>
    );
};

export default DictionaryPage;