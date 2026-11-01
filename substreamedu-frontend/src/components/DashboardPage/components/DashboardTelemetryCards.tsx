import React from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { motion } from 'framer-motion';
import {
    Share2,
    ArrowRight,
    BookOpen,
    Check,
    RotateCcw,
} from 'lucide-react';
import { VectorFlameIcon } from './StreakShareModal';
import {
    DAYS_LETTERS,
    DashboardStats,
    DerivedDashboardMetrics,
    dashboardItemVariants,
} from '../dashboardUtils';
import styles from '../css/DashboardPage.module.css';

const MotionLink = typeof motion.create === 'function' ? motion.create(Link) : motion(Link);

interface DashboardTelemetryCardsProps {
    stats: DashboardStats | null;
    statsLoading: boolean;
    metrics: DerivedDashboardMetrics;
    onOpenStreakModal: () => void;
}

export const DashboardTelemetryCards: React.FC<DashboardTelemetryCardsProps> = ({
    stats,
    statsLoading,
    metrics,
    onOpenStreakModal,
}) => {
    const intl = useIntl();
    const {
        currentDayIndex,
        sessionCardsCount,
        dueCount,
        newCardsCount,
        totalWords,
        learningWords,
        isNewUser,
        isAllCaughtUp,
        weekActivity,
    } = metrics;

    const toReviewLabel = intl.formatMessage(
        { id: 'dashboard.stats.toReviewCount', defaultMessage: '{count} to review' },
        { count: dueCount }
    );
    const newCardsLabel = intl.formatMessage(
        { id: 'dashboard.stats.newCount', defaultMessage: '{count} new' },
        { count: newCardsCount }
    );

    return (
        <>
            {/* ROW 1, COLS 9–12: STREAK WIDGET */}
            <motion.div
                className={`${styles.bentoCard} ${styles.cardStreak} ${isNewUser ? styles.cardStreakDisabled : ''}`}
                variants={dashboardItemVariants}
                onClick={onOpenStreakModal}
                onKeyDown={(e) => {
                    if (!isNewUser && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onOpenStreakModal();
                    }
                }}
                role={!isNewUser ? 'button' : undefined}
                tabIndex={!isNewUser ? 0 : undefined}
                aria-busy={statsLoading}
                aria-label={intl.formatMessage({ id: 'dashboard.stats.shareStreak', defaultMessage: 'Share streak' })}
            >
                <div className={styles.streakTop}>
                    <div className={styles.streakNumberRow}>
                        <VectorFlameIcon theme="solar" size={24} />
                        <span
                            className={`${styles.metricValue} ${isNewUser ? styles.metricValueMuted : ''} ${
                                statsLoading ? styles.metricValueLoading : ''
                            }`}
                        >
                            {statsLoading ? '–' : stats?.streakDays ?? 0}
                        </span>
                        <span className={styles.metricLabel}>
                            <FormattedMessage id="dashboard.stats.streak" defaultMessage="day streak" />
                        </span>
                    </div>
                    {!isNewUser && (
                        <span className={styles.sharePill}>
                            <Share2 size={12} strokeWidth={2} />
                            <FormattedMessage id="dashboard.stats.share" defaultMessage="Share" />
                        </span>
                    )}
                </div>

                <div
                    className={styles.streakWeekRow}
                    role="group"
                    aria-label={intl.formatMessage({
                        id: 'dashboard.stats.weeklyConsistency',
                        defaultMessage: 'Weekly consistency',
                    })}
                >
                    {DAYS_LETTERS.map((day, idx) => {
                        const isActive = weekActivity[idx] ?? false;
                        const isToday = idx === currentDayIndex;
                        return (
                            <div
                                key={idx}
                                className={styles.weekDayCol}
                                data-active={isActive}
                                data-today={isToday}
                            >
                                <span
                                    className={`${styles.weekDayLetter} ${
                                        isToday ? styles.weekDayLetterToday : ''
                                    }`}
                                >
                                    {day}
                                </span>
                                <div
                                    className={`${styles.weekDot} ${
                                        isActive ? styles.weekDotActive : ''
                                    } ${isToday && !isActive ? styles.weekDotToday : ''}`}
                                >
                                    {isActive && <Check size={10} strokeWidth={3} />}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            {/* ROW 2, COLS 9–12: DAILY REVIEW WIDGET */}
            <MotionLink
                to={isNewUser ? '/videos' : '/learning'}
                className={`${styles.bentoCard} ${styles.cardReview}`}
                variants={dashboardItemVariants}
                aria-busy={statsLoading}
            >
                <div className={styles.metricTopGroup}>
                    {isNewUser ? (
                        <>
                            <span className={styles.zeroStateHeading}>
                                <FormattedMessage id="dashboard.zeroState.srsTitle" defaultMessage="Start Your Deck" />
                            </span>
                            <span className={styles.metricSubtext}>
                                <FormattedMessage
                                    id="dashboard.zeroState.srsBadge"
                                    defaultMessage="Save words while watching"
                                />
                            </span>
                        </>
                    ) : isAllCaughtUp ? (
                        <>
                            <div className={styles.metricRow}>
                                <span className={`${styles.metricValue} ${styles.metricValueSuccess}`}>0</span>
                                <span className={styles.metricLabel}>
                                    <FormattedMessage id="dashboard.stats.dueToday" defaultMessage="due today" />
                                </span>
                            </div>
                            <span className={styles.metricSubtextSuccess}>
                                <Check size={13} strokeWidth={2.5} />
                                <FormattedMessage
                                    id="dashboard.stats.dailyGoalCompleted"
                                    defaultMessage="Daily goal completed!"
                                />
                            </span>
                        </>
                    ) : (
                        <>
                            <div className={styles.metricRow}>
                                <span
                                    className={`${styles.metricValue} ${
                                        sessionCardsCount > 0 ? styles.metricValueAccent : ''
                                    } ${statsLoading ? styles.metricValueLoading : ''}`}
                                >
                                    {statsLoading ? '–' : sessionCardsCount}
                                </span>
                                <span className={styles.metricLabel}>
                                    <FormattedMessage id="dashboard.stats.cardsToday" defaultMessage="cards today" />
                                </span>
                            </div>
                            {!statsLoading && sessionCardsCount > 0 && (
                                <span className={styles.metricSubtext}>
                                    {dueCount > 0 && toReviewLabel}
                                    {dueCount > 0 && newCardsCount > 0 && ' · '}
                                    {newCardsCount > 0 && newCardsLabel}
                                </span>
                            )}
                        </>
                    )}
                </div>

                <div className={styles.metricFooter}>
                    <span className={styles.metricFooterTitle}>
                        <RotateCcw size={14} strokeWidth={2} />
                        <FormattedMessage id="learning" defaultMessage="Repetition" />
                    </span>
                    <span className={styles.inlineAction}>
                        {isNewUser ? (
                            <FormattedMessage id="dashboard.bento.exploreVideos" defaultMessage="Explore Videos" />
                        ) : isAllCaughtUp ? (
                            <FormattedMessage id="dashboard.bento.practiceMore" defaultMessage="Practice More" />
                        ) : (
                            <FormattedMessage id="dashboard.bento.startReview" defaultMessage="Start Review" />
                        )}
                        <ArrowRight size={13} strokeWidth={2.2} />
                    </span>
                </div>
            </MotionLink>

            {/* ROW 3, COLS 9–12: DICTIONARY WIDGET */}
            <MotionLink
                to={isNewUser ? '/videos' : '/dictionary'}
                className={`${styles.bentoCard} ${styles.cardVault}`}
                variants={dashboardItemVariants}
                aria-busy={statsLoading}
            >
                <div className={styles.metricTopGroup}>
                    {isNewUser ? (
                        <>
                            <span className={styles.zeroStateHeading}>
                                <FormattedMessage
                                    id="dashboard.zeroState.vaultTitle"
                                    defaultMessage="Your Vault is Empty"
                                />
                            </span>
                            <span className={styles.metricSubtext}>
                                <FormattedMessage
                                    id="dashboard.zeroState.vaultSubtitle"
                                    defaultMessage="Collect words from subtitles"
                                />
                            </span>
                        </>
                    ) : (
                        <>
                            <div className={styles.metricRow}>
                                <span
                                    className={`${styles.metricValue} ${
                                        statsLoading ? styles.metricValueLoading : ''
                                    }`}
                                >
                                    {statsLoading ? '–' : totalWords.toLocaleString()}
                                </span>
                                <span className={styles.metricLabel}>
                                    <FormattedMessage id="dashboard.stats.totalWords" defaultMessage="total words" />
                                </span>
                            </div>
                            <span className={styles.metricSubtext}>
                                {statsLoading ? '–' : learningWords.toLocaleString()}{' '}
                                <FormattedMessage id="dashboard.stats.learning" defaultMessage="in progress" />
                            </span>
                        </>
                    )}
                </div>

                <div className={styles.metricFooter}>
                    <span className={styles.metricFooterTitle}>
                        <BookOpen size={14} strokeWidth={2} />
                        <FormattedMessage id="dictionary" defaultMessage="Dictionary" />
                    </span>
                    <ArrowRight size={15} strokeWidth={2} className={styles.quietChevron} />
                </div>
            </MotionLink>
        </>
    );
};
