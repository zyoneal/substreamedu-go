import React from 'react';
import { Link } from 'react-router-dom';
import { useIntl } from 'react-intl';
import { motion } from 'framer-motion';

import Download from 'lucide-react/dist/esm/icons/download';
import Search from 'lucide-react/dist/esm/icons/search';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Grid3X3 from 'lucide-react/dist/esm/icons/grid-3x3';
import List from 'lucide-react/dist/esm/icons/list';
import Play from 'lucide-react/dist/esm/icons/play';
import Film from 'lucide-react/dist/esm/icons/film';
import Music from 'lucide-react/dist/esm/icons/music';
import Folder from 'lucide-react/dist/esm/icons/folder';
import Type from 'lucide-react/dist/esm/icons/type';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Layers from 'lucide-react/dist/esm/icons/layers';
import X from 'lucide-react/dist/esm/icons/x';
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import RefreshCw from 'lucide-react/dist/esm/icons/refresh-cw';
import Tag from 'lucide-react/dist/esm/icons/tag';

import { Card, CardContent } from '../ui/card';
import { Input } from '../ui/input';
import { usePixzenTheme } from '../HomePage/pixzen/usePixzenTheme';
import { parseDoTags } from '../../utils/textUtils';
import { useDictionaryData } from './hooks/useDictionaryData';
import { useDictionarySearchPagination } from './hooks/useDictionarySearchPagination';
import { DictionaryResourceCard } from './components/DictionaryResourceCard';
import { DictionaryWordCard } from './components/DictionaryWordCard';
import { DictionaryPagination } from './components/DictionaryPagination';
import { DictionaryEditModal } from './components/DictionaryEditModal';
import styles from './DictionaryPage.module.css';

const DictionaryPage: React.FC = () => {
    usePixzenTheme();
    const intl = useIntl();

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

    // 1. Data & Server Mutations Hook
    const [viewModeState, setViewModeState] = React.useState<'groups' | 'categories' | 'words'>('groups');
    const {
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
    } = useDictionaryData({ viewMode: viewModeState });

    // 2. Search, Layout & Pagination Hook
    const {
        search,
        setSearchQuery,
        clearSearch,
        view,
        setViewMode,
        setLayout,
        handlePageChange,
        selectedCategory,
        setSelectedCategory,
        displayedResources,
        sortedFilteredWords,
        displayedWords,
        totalPages,
        filteredCategoryList,
        filteredCategoryWords,
        totalWordsCount,
        masteredCount,
        activeGroupsCount,
    } = useDictionarySearchPagination({
        resources,
        allWords,
        categories,
        categoryWords,
        intl,
    });

    const handleSwitchViewMode = (mode: 'groups' | 'categories' | 'words') => {
        setViewModeState(mode);
        setViewMode(mode);
        clearSearch();
        setSelectedCategory(null);
        handleSelectCategory(null);
    };

    const handleYouGlishClick = (text: string) => {
        const encodedText = encodeURIComponent(text);
        window.open(`https://youglish.com/pronounce/${encodedText}/english`, '_blank');
    };

    const filterCategories = [
        {
            key: null,
            label: intl.formatMessage({ id: 'dictionary.categories.all', defaultMessage: 'All' }),
            icon: Layers
        },
        {
            key: 'youtube',
            label: intl.formatMessage({ id: 'dictionary.categories.youtube', defaultMessage: 'YouTube' }),
            icon: Play
        },
        {
            key: 'movies',
            label: intl.formatMessage({ id: 'dictionary.categories.movies', defaultMessage: 'Movies' }),
            icon: Film
        },
        {
            key: 'text',
            label: intl.formatMessage({ id: 'dictionary.categories.text', defaultMessage: 'Texts' }),
            icon: Type
        },
        {
            key: 'songs',
            label: intl.formatMessage({ id: 'dictionary.categories.songs', defaultMessage: 'Lyrics' }),
            icon: Music
        }
    ];

    return (
        <motion.div
            className={styles.dictionaryContainer}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className="pixzenGrain" aria-hidden="true" />

            <div className={styles.contentWrapper}>
                {/* Apple-Minimalist Top Bar */}
                <motion.div className={styles.topBar} variants={itemVariants}>
                    <h1 className={styles.pageTitle}>
                        {parseDoTags(intl.formatMessage({
                            id: 'dictionaryTitle',
                            defaultMessage: 'My <do>dictionary</do>'
                        }), styles.accent)}
                    </h1>

                    <div className={styles.topBarActions}>
                        {/* Segmented View Mode Toggle */}
                        <div className={styles.segmentedControl} role="tablist" aria-label="View mode">
                            <button
                                onClick={() => handleSwitchViewMode('groups')}
                                className={`${styles.segmentedButton} ${view.mode === 'groups' ? styles.segmentedButtonActive : ''}`}
                                role="tab"
                                aria-selected={view.mode === 'groups'}
                            >
                                <Folder size={15} />
                                <span>{intl.formatMessage({ id: 'groups', defaultMessage: 'Collections' })}</span>
                            </button>
                            <button
                                onClick={() => handleSwitchViewMode('categories')}
                                className={`${styles.segmentedButton} ${view.mode === 'categories' ? styles.segmentedButtonActive : ''}`}
                                role="tab"
                                aria-selected={view.mode === 'categories'}
                            >
                                <Sparkles size={15} />
                                <span>{intl.formatMessage({ id: 'categories', defaultMessage: 'Themes' })}</span>
                            </button>
                            <button
                                onClick={() => handleSwitchViewMode('words')}
                                className={`${styles.segmentedButton} ${view.mode === 'words' ? styles.segmentedButtonActive : ''}`}
                                role="tab"
                                aria-selected={view.mode === 'words'}
                            >
                                <BookOpen size={15} />
                                <span>{intl.formatMessage({ id: 'allWords', defaultMessage: 'All Words' })}</span>
                            </button>
                        </div>

                        <button
                            onClick={handleExport}
                            className={styles.exportButton}
                            disabled={isExporting}
                            title="Export entire dictionary to Anki (.apkg)"
                            aria-label="Export entire dictionary to Anki (.apkg)"
                        >
                            <Download size={14} className={isExporting ? 'animate-spin' : ''} />
                            <span>{isExporting ? 'Exporting...' : 'Export Anki'}</span>
                        </button>
                    </div>
                </motion.div>

                {/* Hero Summary Metrics */}
                <motion.div className={styles.statsOverview} variants={itemVariants}>
                    <div className={styles.statMetric}>
                        <span className={styles.statNumber}>{totalWordsCount}</span>
                        <span className={styles.statLabel}>Total Vocabulary Words</span>
                    </div>
                    <div className={styles.statMetric}>
                        <span className={styles.statNumber}>{masteredCount}</span>
                        <span className={styles.statLabel}>Mastered Words</span>
                    </div>
                    <div className={styles.statMetric}>
                        <span className={styles.statNumber}>{activeGroupsCount}</span>
                        <span className={styles.statLabel}>Collections & Sources</span>
                    </div>
                </motion.div>

                {/* Controls Bar: Search & Layout Toggle */}
                <motion.div className={styles.controlsBar} variants={itemVariants}>
                    <div className={styles.searchWrapper} role="search">
                        <Search className={styles.searchIcon} />
                        <Input
                            type="text"
                            placeholder={
                                view.mode === 'groups'
                                    ? intl.formatMessage({ id: 'searchGroupsPlaceholder', defaultMessage: 'Search collections...' })
                                    : view.mode === 'categories'
                                    ? 'Search themes or words...'
                                    : intl.formatMessage({ id: 'searchWordsPlaceholder', defaultMessage: 'Search words or context...' })
                            }
                            value={search.query}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className={styles.dictionarySearch}
                            aria-label="Search dictionary"
                        />
                        {search.query && (
                            <button
                                type="button"
                                onClick={clearSearch}
                                className={styles.searchClearBtn}
                                aria-label="Clear search"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    <div className={styles.viewLayoutControls}>
                        {view.mode === 'groups' && (
                            <div className={styles.layoutToggle} role="radiogroup" aria-label="Layout mode">
                                <button
                                    onClick={() => setLayout('grid')}
                                    className={`${styles.layoutButton} ${view.layout === 'grid' ? styles.layoutButtonActive : ''}`}
                                    role="radio"
                                    aria-checked={view.layout === 'grid'}
                                    title="Grid layout"
                                    aria-label="Grid layout"
                                >
                                    <Grid3X3 size={15} />
                                </button>
                                <button
                                    onClick={() => setLayout('list')}
                                    className={`${styles.layoutButton} ${view.layout === 'list' ? styles.layoutButtonActive : ''}`}
                                    role="radio"
                                    aria-checked={view.layout === 'list'}
                                    title="List layout"
                                    aria-label="List layout"
                                >
                                    <List size={15} />
                                </button>
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Content Area */}
                <motion.div className={styles.viewContainer} variants={itemVariants}>
                    {status === 'loading' || (view.mode === 'words' && isLoadingWords) ? (
                        <div className={styles.groupsGrid}>
                            {[...Array(6)].map((_, i) => (
                                <Card key={i} className="bg-white/[0.02] border border-white/[0.07] h-36 animate-pulse rounded-2xl">
                                    <CardContent className="p-0" />
                                </Card>
                            ))}
                        </div>
                    ) : view.mode === 'groups' ? (
                        displayedResources.length > 0 ? (
                            view.layout === 'grid' ? (
                                <div className={styles.groupsGrid}>
                                    {displayedResources.map((res, i) => (
                                        <DictionaryResourceCard
                                            key={res.groupName || `res-${i}`}
                                            resource={res}
                                            index={i}
                                            layout="grid"
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            ) : (
                                <div className={styles.groupsList}>
                                    {displayedResources.map((res, i) => (
                                        <DictionaryResourceCard
                                            key={res.groupName || `res-${i}`}
                                            resource={res}
                                            index={i}
                                            layout="list"
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            )
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>
                                    <BookOpen size={26} />
                                </div>
                                <h3 className={styles.emptyStateTitle}>
                                    {search.debouncedQuery
                                        ? `No collections found for "${search.debouncedQuery}"`
                                        : intl.formatMessage({ id: 'noGroupsFound', defaultMessage: 'No collections yet' })}
                                </h3>
                                <p className={styles.emptyStateText}>
                                    {search.debouncedQuery
                                        ? 'Try searching with a different term.'
                                        : 'Save new words while watching videos, reading subtitles, or exploring songs.'}
                                </p>
                                <div className={styles.emptyStateActions}>
                                    {search.debouncedQuery ? (
                                        <button
                                            onClick={clearSearch}
                                            className={styles.emptyStateActionSecondary}
                                        >
                                            <Search size={14} />
                                            <span>Clear Search</span>
                                        </button>
                                    ) : (
                                        <Link to="/videos" className={styles.emptyStateAction}>
                                            <Play size={14} />
                                            <span>Explore Videos</span>
                                        </Link>
                                    )}
                                </div>
                            </div>
                        )
                    ) : view.mode === 'categories' ? (
                        selectedCategoryName !== null ? (
                            <div className={styles.wordsListContainer}>
                                <button
                                    onClick={() => {
                                        handleSelectCategory(null);
                                        clearSearch();
                                    }}
                                    className={styles.backToCategoriesBtn}
                                >
                                    <ArrowLeft size={14} />
                                    <span>Back to Themes</span>
                                </button>
                                <div className={styles.categoryHeading}>
                                    <span>{selectedCategoryName}</span>
                                    <span className={styles.categoryCountBadge}>
                                        {filteredCategoryWords.length} {filteredCategoryWords.length === 1 ? 'word' : 'words'}
                                    </span>
                                </div>
                                {isLoadingCategoryWords ? (
                                    <div className={styles.groupsGrid}>
                                        {[...Array(4)].map((_, i) => (
                                            <Card key={i} className="bg-white/[0.02] border border-white/[0.07] h-32 animate-pulse rounded-2xl">
                                                <CardContent className="p-0" />
                                            </Card>
                                        ))}
                                    </div>
                                ) : filteredCategoryWords.length > 0 ? (
                                    filteredCategoryWords.map((word, i) => (
                                        <DictionaryWordCard
                                            key={word.id || `cat-word-${i}`}
                                            word={word}
                                            index={i}
                                            onEdit={handleQuickEdit}
                                            onDelete={handleDeleteWord}
                                            onListen={handleYouGlishClick}
                                        />
                                    ))
                                ) : (
                                    <div className={styles.emptyState}>
                                        <div className={styles.emptyStateIcon}>
                                            <BookOpen size={26} />
                                        </div>
                                        <h3 className={styles.emptyStateTitle}>
                                            {search.debouncedQuery
                                                ? `No words found for "${search.debouncedQuery}" in ${selectedCategoryName}`
                                                : 'No words in this theme'}
                                        </h3>
                                        <p className={styles.emptyStateText}>
                                            Words categorized under this theme will appear here.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className={styles.themesContainer}>
                                <div className={styles.categorizeBanner}>
                                    <div className={styles.categorizeBannerText}>
                                        <h3 className={styles.categorizeBannerTitle}>AI Semantic Categorization</h3>
                                        <p className={styles.categorizeBannerSubtitle}>
                                            Automatically clusters your phrasal verbs, idioms, and vocabulary into 12 semantic themes.
                                        </p>
                                        {categorizeProgress && (
                                            <div>
                                                <div className={styles.categorizeProgressBar}>
                                                    <div
                                                        className={styles.categorizeProgressFill}
                                                        style={{
                                                            width: `${Math.min(100, Math.round((categorizeProgress.processed / Math.max(1, categorizeProgress.total)) * 100))}%`
                                                        }}
                                                    />
                                                </div>
                                                <span className={styles.categorizeStatusText}>
                                                    Processed {categorizeProgress.processed} / {categorizeProgress.total} words ({categorizeProgress.remaining} remaining)
                                                </span>
                                            </div>
                                        )}
                                        {categorizeMessage && !categorizeProgress && (
                                            <span className={styles.categorizeStatusText}>
                                                {categorizeMessage}
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleRunCategorize}
                                        disabled={isCategorizing}
                                        className={styles.categorizeBtn}
                                    >
                                        <RefreshCw size={14} className={isCategorizing ? 'animate-spin' : ''} />
                                        <span>{isCategorizing ? 'Categorizing…' : 'Categorize Vocabulary'}</span>
                                    </button>
                                </div>

                                {filteredCategoryList.length > 0 ? (
                                    <div className={styles.groupsGrid}>
                                        {filteredCategoryList.map((cat, i) => (
                                            <div
                                                key={cat.categoryName || `cat-${i}`}
                                                className={`${styles.groupCard} ${styles.themeGroupCard}`}
                                                onClick={() => handleSelectCategory(cat.categoryName)}
                                                role="button"
                                                tabIndex={0}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter' || e.key === ' ') {
                                                        e.preventDefault();
                                                        handleSelectCategory(cat.categoryName);
                                                    }
                                                }}
                                            >
                                                <div className={styles.groupCardHeader}>
                                                    <div className={styles.groupHeaderLeft}>
                                                        <div className={styles.sourceIconBox}>
                                                            <Tag size={18} />
                                                        </div>
                                                        <h3 className={styles.groupTitle}>
                                                            {cat.categoryName}
                                                        </h3>
                                                    </div>
                                                    <span className={styles.groupWordCountPill}>
                                                        {cat.numberOfWords} {cat.numberOfWords === 1 ? 'word' : 'words'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <div className={styles.emptyStateIcon}>
                                            <Sparkles size={26} />
                                        </div>
                                        <h3 className={styles.emptyStateTitle}>
                                            {search.debouncedQuery
                                                ? `No themes found for "${search.debouncedQuery}"`
                                                : 'No Themes Categorized Yet'}
                                        </h3>
                                        <p className={styles.emptyStateText}>
                                            {search.debouncedQuery
                                                ? 'Try adjusting your search terms.'
                                                : 'Run AI Semantic Categorization above to automatically cluster your words and phrases into 12 themes.'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )
                    ) : (
                        sortedFilteredWords.length > 0 ? (
                            <div className={styles.wordsListContainer}>
                                {displayedWords.map((word, i) => (
                                    <DictionaryWordCard
                                        key={word.id || `word-${i}`}
                                        word={word}
                                        index={i}
                                        onEdit={handleQuickEdit}
                                        onDelete={handleDeleteWord}
                                        onListen={handleYouGlishClick}
                                    />
                                ))}
                                <DictionaryPagination
                                    currentPage={view.currentPage}
                                    totalPages={totalPages}
                                    onPageChange={handlePageChange}
                                />
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>
                                    <BookOpen size={26} />
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
                                            onClick={clearSearch}
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
                <DictionaryEditModal
                    word={editingWord}
                    isOpen={Boolean(editingWord)}
                    onClose={handleCancelEdit}
                    onSave={handleSaveWord}
                />
            </div>
        </motion.div>
    );
};

export default DictionaryPage;