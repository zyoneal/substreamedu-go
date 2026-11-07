import React, { useState, useEffect } from 'react';
import { SubDLSearchResult } from '../../../services/SubtitleService';

import X from 'lucide-react/dist/esm/icons/x';
import Film from 'lucide-react/dist/esm/icons/film';
import Tv from 'lucide-react/dist/esm/icons/tv';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import Search from 'lucide-react/dist/esm/icons/search';
import styles from './FilmSelectionModal.module.css';

interface FilmSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    films: SubDLSearchResult[];
    onSelectFilm: (film: SubDLSearchResult) => void;
    isLoading?: boolean;
    searchQuery?: string;
    onSearchAgain?: (query: string) => void;
}

export const FilmSelectionModal: React.FC<FilmSelectionModalProps> = ({
    isOpen,
    onClose,
    films,
    onSelectFilm,
    isLoading = false,
    searchQuery,
    onSearchAgain,
}) => {
    const [inputQuery, setInputQuery] = useState(searchQuery || '');

    useEffect(() => {
        setInputQuery(searchQuery || '');
    }, [searchQuery]);

    if (!isOpen) return null;

    const getTypeIcon = (type: string) => {
        return type === 'tv' ? <Tv className={styles.typeIcon} /> : <Film className={styles.typeIcon} />;
    };

    const getTypeLabel = (type: string) => {
        return type === 'tv' ? 'TV Series' : 'Movie';
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = inputQuery.trim();
        if (trimmed && onSearchAgain) {
            onSearchAgain(trimmed);
        }
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2 className={styles.modalTitle}>
                            {films.length > 0 ? 'Select Correct Title' : 'Search Subtitles'}
                        </h2>
                        <p className={styles.searchInfo}>
                            {films.length > 0
                                ? `Found ${films.length} matching titles for "${searchQuery || 'your search'}"`
                                : searchQuery
                                    ? `No titles found for "${searchQuery}"`
                                    : 'Search SubDL database by movie or series title'}
                        </p>
                    </div>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X className={styles.closeIcon} />
                    </button>
                </div>

                <div className={styles.searchBarWrapper}>
                    <form className={styles.searchForm} onSubmit={handleSearchSubmit}>
                        <div className={styles.searchInputContainer}>
                            <Search className={styles.searchIcon} />
                            <input
                                type="text"
                                value={inputQuery}
                                onChange={(e) => setInputQuery(e.target.value)}
                                placeholder="Search film or series title (e.g. Inception, Friends S01E01)..."
                                className={styles.searchInput}
                                autoFocus={films.length === 0}
                            />
                            {inputQuery && (
                                <button
                                    type="button"
                                    onClick={() => setInputQuery('')}
                                    className={styles.clearSearchButton}
                                    title="Clear search"
                                    aria-label="Clear search input"
                                >
                                    <X size={14} />
                                </button>
                            )}
                        </div>
                        <button
                            type="submit"
                            className={styles.searchSubmitButton}
                            disabled={!inputQuery.trim() || isLoading}
                        >
                            <Search size={14} />
                            <span>Search</span>
                        </button>
                    </form>
                </div>

                <div className={styles.modalContent}>
                    {isLoading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner}></div>
                        </div>
                    ) : films.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p className={styles.emptyTitle}>
                                {searchQuery ? `No results found for "${searchQuery}"` : 'Enter a title to search for subtitles'}
                            </p>
                            <p className={styles.emptyDescription}>
                                Type the movie or series title in the search bar above and click Search.
                            </p>
                        </div>
                    ) : (
                        <div className={styles.filmsList}>
                            {films.map((film) => (
                                <div
                                    key={film.sdId || `${film.imdbId}-${film.name}`}
                                    className={styles.filmCard}
                                    onClick={() => onSelectFilm(film)}
                                >
                                    <div className={styles.filmCardContent}>
                                        <div className={styles.filmInfo}>
                                            <div className={styles.filmHeader}>
                                                <h3 className={styles.filmName}>{film.name}</h3>
                                            </div>

                                            <div className={styles.filmBadges}>
                                                <span className={`${styles.badge} ${styles.typeBadge}`}>
                                                    {getTypeIcon(film.type)}
                                                    {getTypeLabel(film.type)}
                                                </span>

                                                {film.year > 0 && (
                                                    <span className={`${styles.badge} ${styles.yearBadge}`}>
                                                        <Calendar className={styles.badgeIcon} />
                                                        {film.year}
                                                    </span>
                                                )}

                                                {film.imdbId && (
                                                    <span className={`${styles.badge} ${styles.imdbBadge}`}>
                                                        {film.imdbId}
                                                    </span>
                                                )}
                                            </div>

                                            <div className={styles.filmMeta}>
                                                {film.tmdbId && (
                                                    <span className={styles.metaItem}>TMDB: {film.tmdbId}</span>
                                                )}
                                                {film.sdId > 0 && (
                                                    <span className={styles.metaItem}>SD ID: {film.sdId}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className={styles.filmActions}>
                                            <button
                                                className={styles.selectButton}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectFilm(film);
                                                }}
                                            >
                                                <CheckCircle className={styles.selectIcon} />
                                                <span className={styles.tooltip}>Select Title</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
