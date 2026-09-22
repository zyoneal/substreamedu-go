import React from 'react';
import { SubtitleWithScore } from '../../../services/SubtitleService';

import X from 'lucide-react/dist/esm/icons/x';
import Download from 'lucide-react/dist/esm/icons/download';
import Star from 'lucide-react/dist/esm/icons/star';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Search from 'lucide-react/dist/esm/icons/search';
import styles from './SubtitleSearchModal.module.css';

interface SubtitleSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    subtitles: SubtitleWithScore[];
    onSelectSubtitle: (subtitle: SubtitleWithScore) => void;
    onQuickTest?: (subtitle: SubtitleWithScore) => void;
    isLoading?: boolean;
    onSearchDifferentTitle?: () => void;
}

export const SubtitleSearchModal: React.FC<SubtitleSearchModalProps> = ({
    isOpen,
    onClose,
    subtitles,
    onSelectSubtitle,
    onQuickTest,
    isLoading = false,
    onSearchDifferentTitle,
}) => {
    if (!isOpen) return null;

    const getLanguageName = (code: string) => {
        const languages: { [key: string]: string } = {
            'EN': 'English',
            'RU': 'Russian',
            'ES': 'Español',
            'FR': 'Français',
            'DE': 'Deutsch',
            'IT': 'Italiano',
            'PT': 'Português',
            'PL': 'Polski',
            'UK': 'Ukrainian',
            'AR': 'العربية',
            'TR': 'Türkçe',
        };
        return languages[code.toUpperCase()] || code;
    };

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                    <div>
                        <h2 className={styles.modalTitle}>Available Subtitles</h2>
                        <p className={styles.warningMessage}>
                            Sorted by ratings and popularity. Use Quick Test or Download.
                        </p>
                    </div>
                    <div className={styles.headerActions}>
                        {onSearchDifferentTitle && (
                            <button
                                type="button"
                                onClick={onSearchDifferentTitle}
                                className={styles.searchDifferentButton}
                                title="Search for a different title"
                            >
                                <Search size={14} />
                                <span>Change title</span>
                            </button>
                        )}
                        <button onClick={onClose} className={styles.closeButton} aria-label="Close">
                            <X className={styles.closeIcon} />
                        </button>
                    </div>
                </div>

                <div className={styles.modalContent}>
                    {isLoading ? (
                        <div className={styles.loadingContainer}>
                            <div className={styles.spinner}></div>
                        </div>
                    ) : subtitles.length === 0 ? (
                        <div className={styles.emptyState}>
                            <p className={styles.emptyTitle}>No subtitles found</p>
                            <p className={styles.emptyDescription}>Try uploading subtitles manually</p>
                        </div>
                    ) : (
                        <div className={styles.subtitlesList}>
                            {subtitles.map((subtitle) => (
                                <div
                                    key={subtitle.subtitlesId || subtitle.name}
                                    className={styles.subtitleCard}
                                    onClick={() => onSelectSubtitle(subtitle)}
                                >
                                    <div className={styles.subtitleCardContent}>
                                        <div className={styles.subtitleInfo}>
                                            <div className={styles.subtitleHeader}>
                                                <h3 className={styles.subtitleName}>
                                                    {subtitle.releaseName || subtitle.name}
                                                </h3>
                                            </div>

                                            <div className={styles.subtitleBadges}>
                                                <span className={`${styles.badge} ${styles.languageBadge}`}>
                                                    {getLanguageName(subtitle.language)}
                                                </span>

                                                {subtitle.fromTrusted && (
                                                    <span className={`${styles.badge} ${styles.trustedBadge}`}>
                                                        <Star className={styles.badgeIcon} />
                                                        Trusted
                                                    </span>
                                                )}

                                                {subtitle.hi && (
                                                    <span className={`${styles.badge} ${styles.hiBadge}`}>
                                                        HI
                                                    </span>
                                                )}
                                            </div>

                                            <div className={styles.subtitleMeta}>
                                                {subtitle.author && (
                                                    <span className={styles.metaItem}>by {subtitle.author}</span>
                                                )}
                                                {subtitle.frameRate > 0 && (
                                                    <span className={styles.metaItem}>{subtitle.frameRate} FPS</span>
                                                )}
                                                {subtitle.ratings > 0 && (
                                                    <span className={styles.metaItem}>
                                                        <Star className={styles.ratingIcon} />
                                                        {subtitle.ratings.toFixed(1)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className={styles.subtitleActions}>
                                            {onQuickTest && (
                                                <button
                                                    className={`${styles.actionButton} ${styles.quickTestButton}`}
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onQuickTest(subtitle);
                                                    }}
                                                    title="Quick Test - Try without saving"
                                                >
                                                    <Zap className={styles.buttonIcon} />
                                                    <span className={styles.tooltip}>Quick Test</span>
                                                </button>
                                            )}
                                            <button
                                                className={`${styles.actionButton} ${styles.downloadButton}`}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSelectSubtitle(subtitle);
                                                }}
                                                title="Download and Save"
                                            >
                                                <Download className={styles.buttonIcon} />
                                                <span className={styles.tooltip}>Save</span>
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
