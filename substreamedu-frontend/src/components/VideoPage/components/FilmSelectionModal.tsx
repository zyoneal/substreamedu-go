import React from 'react';
import { SubDLSearchResult } from '../../../services/SubtitleService';

import X from 'lucide-react/dist/esm/icons/x';
import Film from 'lucide-react/dist/esm/icons/film';
import Tv from 'lucide-react/dist/esm/icons/tv';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import CheckCircle from 'lucide-react/dist/esm/icons/check-circle';
import styles from './FilmSelectionModal.module.css';

interface FilmSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    films: SubDLSearchResult[];
    onSelectFilm: (film: SubDLSearchResult) => void;
    isLoading?: boolean;
    searchQuery?: string;
}

export const FilmSelectionModal: React.FC<FilmSelectionModalProps> = ({
    isOpen,
    onClose,
    films,
    onSelectFilm,
    isLoading = false,
    searchQuery
}) => {
    if (!isOpen) return null;

    const getTypeIcon = (type: string) => {
        return type === 'tv' ? <Tv className={styles.typeIcon} /> : <Film className={styles.typeIcon} />;
    };

    const getTypeLabel = (type: string) => {
        return type === 'tv' ? 'TV Series' : 'Movie';
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2 className={styles.modalTitle}>Select Correct Title</h2>
                        <p className={styles.searchInfo}>
                            Multiple results found for "{searchQuery || 'your search'}"
                        </p>
                    </div>
                    <button onClick={onClose} className={styles.closeButton}>
                        <X className={styles.closeIcon} />
                    </button>
                </div>

                <div className={styles.modalContent}>
                    {isLoading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner}></div>
                        </div>
                    ) : films.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p className={styles.emptyTitle}>No results found</p>
                            <p className={styles.emptyDescription}>Try a different search term</p>
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
