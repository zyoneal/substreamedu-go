import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { motion } from 'framer-motion';
import {
    Share2,
    ArrowRight,
    Play,
    Music,
    FileText,
    BookOpen,
    Send,
    Film,
    Layers,
    Check,
    RotateCcw,
} from 'lucide-react';

import { DictionaryService } from '../../services/DictionaryService';
import { useRecentVideos } from '../../hooks/useRecentVideos';
import { StreakShareModal, VectorFlameIcon } from './components/StreakShareModal';
import { WelcomeModal } from './components/WelcomeModal';
import styles from './css/DashboardPage.module.css';

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

const MotionLink = motion(Link);

interface DashboardStats {
    totalWords: number;
    newWords: number;
    learningWords: number;
    dueToday: number;
    sessionCards?: number;
    sessionDueCards?: number;
    sessionNewCards?: number;
    sessionNewWords?: number;
    streakDays: number;
    reviewedToday?: boolean;
    weekDays?: boolean[];
}

const DAYS_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

const DashboardPage: React.FC = () => {
    const intl = useIntl();
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
    const [recentVideos] = useRecentVideos();

    useEffect(() => {
        DictionaryService.fetchDashboardStats()
            .then(setStats)
            .finally(() => setStatsLoading(false));
    }, []);

    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);

    useEffect(() => {
        if (!statsLoading && (stats?.totalWords ?? 0) === 0) {
            const hasSeenOnboarding = localStorage.getItem('hasSeenOnboardingModal');
            if (!hasSeenOnboarding) {
                setIsWelcomeModalOpen(true);
            }
        }
    }, [stats, statsLoading]);

    const handleCloseWelcomeModal = () => {
        localStorage.setItem('hasSeenOnboardingModal', 'true');
        setIsWelcomeModalOpen(false);
    };

    const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const reviewedToday = stats?.reviewedToday ?? false;
    const activeStreakCount = stats ? Math.min(stats.streakDays, 7) : 0;
    const latestRecentVideo = recentVideos && recentVideos.length > 0 ? recentVideos[0] : null;

    const sessionCardsCount = stats ? (stats.sessionCards ?? stats.dueToday ?? 0) : 0;
    const dueCount = stats ? (stats.sessionDueCards ?? stats.dueToday ?? 0) : 0;
    const newCardsCount = stats ? (stats.sessionNewCards ?? 0) : 0;
    const totalWords = stats?.totalWords ?? 0;
    const learningWords = stats?.learningWords ?? 0;
    const isNewUser = !statsLoading && totalWords === 0;
    const isAllCaughtUp = !isNewUser && reviewedToday && dueCount === 0;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.04,
                delayChildren: 0.02
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { type: 'spring', bounce: 0, duration: 0.45 }
        }
    };

    return (
        <motion.div
            className={styles.dashboardContainer}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className={styles.contentWrapper}>
                <motion.header className={styles.headerSection} variants={itemVariants}>
                    <h1 className={styles.pageTitle}>
                        {parseDoTags(intl.formatMessage({
                            id: 'dashboard.chooseAction',
                            defaultMessage: 'Choose your <do>learning</do> format'
                        }))}
                    </h1>
                </motion.header>

                <motion.div className={styles.bentoGrid} variants={containerVariants}>
                    {/* 1. STREAK WIDGET */}
                    <motion.div
                        className={`${styles.bentoCard} ${styles.cardStreak}`}
                        variants={itemVariants}
                        onClick={() => !isNewUser && setIsStreakModalOpen(true)}
                        onKeyDown={(e) => {
                            if (!isNewUser && (e.key === 'Enter' || e.key === ' ')) {
                                e.preventDefault();
                                setIsStreakModalOpen(true);
                            }
                        }}
                        role={!isNewUser ? 'button' : undefined}
                        tabIndex={!isNewUser ? 0 : undefined}
                        aria-label={intl.formatMessage({ id: 'dashboard.stats.shareStreak', defaultMessage: 'Share streak' })}
                    >
                        <div className={styles.streakTop}>
                            <div className={styles.streakNumberRow}>
                                <VectorFlameIcon theme="solar" size={24} />
                                <span className={`${styles.metricValue} ${isNewUser ? styles.metricValueMuted : ''}`}>
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

                        <div className={styles.streakWeekRow}>
                            {DAYS_LETTERS.map((day, idx) => {
                                const isActive = stats?.weekDays && stats.weekDays.length === 7
                                    ? stats.weekDays[idx]
                                    : (reviewedToday
                                        ? idx <= currentDayIndex && (currentDayIndex - idx < activeStreakCount)
                                        : idx < currentDayIndex && (currentDayIndex - 1 - idx < activeStreakCount));
                                const isToday = idx === currentDayIndex;
                                return (
                                    <div key={idx} className={styles.weekDayCol}>
                                        <span className={`${styles.weekDayLetter} ${isToday ? styles.weekDayLetterToday : ''}`}>
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

                    {/* 2. DAILY REVIEW WIDGET */}
                    <MotionLink
                        to={isNewUser ? "/videos" : "/learning"}
                        className={`${styles.bentoCard} ${styles.cardReview}`}
                        variants={itemVariants}
                    >
                        <div className={styles.metricTopGroup}>
                            {isNewUser ? (
                                <>
                                    <span className={styles.zeroStateHeading}>
                                        <FormattedMessage id="dashboard.zeroState.srsTitle" defaultMessage="Start Your Deck" />
                                    </span>
                                    <span className={styles.metricSubtext}>
                                        <FormattedMessage id="dashboard.zeroState.srsBadge" defaultMessage="Save words while watching" />
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
                                        <FormattedMessage id="dashboard.stats.dailyGoalCompleted" defaultMessage="Daily goal completed!" />
                                    </span>
                                </>
                            ) : (
                                <>
                                    <div className={styles.metricRow}>
                                        <span className={`${styles.metricValue} ${sessionCardsCount > 0 ? styles.metricValueAccent : ''}`}>
                                            {statsLoading ? '–' : sessionCardsCount}
                                        </span>
                                        <span className={styles.metricLabel}>
                                            <FormattedMessage id="dashboard.stats.cardsToday" defaultMessage="cards today" />
                                        </span>
                                    </div>
                                    {!statsLoading && sessionCardsCount > 0 && (
                                        <span className={styles.metricSubtext}>
                                            {dueCount > 0 && `${dueCount} to review`}
                                            {dueCount > 0 && newCardsCount > 0 && ' · '}
                                            {newCardsCount > 0 && `${newCardsCount} new`}
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

                    {/* 3. DICTIONARY WIDGET */}
                    <MotionLink
                        to={isNewUser ? "/videos" : "/dictionary"}
                        className={`${styles.bentoCard} ${styles.cardVault}`}
                        variants={itemVariants}
                    >
                        <div className={styles.metricTopGroup}>
                            {isNewUser ? (
                                <>
                                    <span className={styles.zeroStateHeading}>
                                        <FormattedMessage id="dashboard.zeroState.vaultTitle" defaultMessage="Your Vault is Empty" />
                                    </span>
                                    <span className={styles.metricSubtext}>
                                        <FormattedMessage id="dashboard.zeroState.vaultSubtitle" defaultMessage="Collect words from subtitles" />
                                    </span>
                                </>
                            ) : (
                                <>
                                    <div className={styles.metricRow}>
                                        <span className={styles.metricValue}>
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

                    {/* 4. FEATURED FORMAT: VIDEO LEARNING (SPAN 8) */}
                    <MotionLink
                        to="/videos"
                        className={`${styles.bentoCard} ${styles.cardHeroVideo}`}
                        variants={itemVariants}
                    >
                        <div className={styles.heroCardBody}>
                            <div className={styles.formatHeaderLeft}>
                                <div className={styles.iconSquircle}>
                                    <Film size={21} strokeWidth={1.8} />
                                </div>
                                <h2 className={styles.heroTitle}>
                                    {latestRecentVideo ? (
                                        <FormattedMessage id="dashboard.bento.resume" defaultMessage="Resume Watching" />
                                    ) : (
                                        <FormattedMessage id="dashboard.uploadMovie" defaultMessage="Video-based learning" />
                                    )}
                                </h2>
                            </div>

                            <p className={styles.heroDescription}>
                                {latestRecentVideo ? (
                                    latestRecentVideo.name
                                ) : (
                                    <FormattedMessage
                                        id="dashboard.uploadMovieDesc"
                                        defaultMessage="Open a YouTube video from the link or a movie / TV series from your computer. Watch, read the subtitles, and save new words and phrases to your dictionary."
                                    />
                                )}
                            </p>
                        </div>

                        <div className={styles.heroFooter}>
                            <span className={styles.primaryPillBtn}>
                                <Play size={14} fill="currentColor" strokeWidth={0} />
                                {latestRecentVideo ? (
                                    <FormattedMessage id="dashboard.bento.continue" defaultMessage="Continue" />
                                ) : (
                                    <FormattedMessage id="dashboard.bento.browseCatalog" defaultMessage="Explore Catalog" />
                                )}
                            </span>
                        </div>
                    </MotionLink>

                    {/* 5. SONGS & LYRICS (SPAN 4) */}
                    <MotionLink
                        to="/songs"
                        className={`${styles.bentoCard} ${styles.cardFormat}`}
                        variants={itemVariants}
                    >
                        <div className={styles.formatTop}>
                            <div className={styles.formatHeaderLeft}>
                                <div className={styles.iconSquircle}>
                                    <Music size={20} strokeWidth={1.8} />
                                </div>
                                <h3 className={styles.cardTitle}>
                                    <FormattedMessage id="dashboard.learnWithSongs" defaultMessage="Learning with songs" />
                                </h3>
                            </div>
                            <ArrowRight size={18} strokeWidth={2} className={styles.quietChevron} />
                        </div>

                        <p className={styles.cardDescription}>
                            <FormattedMessage
                                id="dashboard.learnWithSongs.desc"
                                defaultMessage="Listen to your favorite music, read the lyrics, and highlight words and phrases to save."
                            />
                        </p>
                    </MotionLink>

                    {/* 6. TEXTS & AI (SPAN 4) */}
                    <MotionLink
                        to="/text-paste"
                        className={`${styles.bentoCard} ${styles.cardFormat}`}
                        variants={itemVariants}
                    >
                        <div className={styles.formatTop}>
                            <div className={styles.formatHeaderLeft}>
                                <div className={styles.iconSquircle}>
                                    <FileText size={20} strokeWidth={1.8} />
                                </div>
                                <h3 className={styles.cardTitle}>
                                    <FormattedMessage id="dashboard.learnWithText" defaultMessage="Learning with texts" />
                                </h3>
                            </div>
                            <ArrowRight size={18} strokeWidth={2} className={styles.quietChevron} />
                        </div>

                        <p className={styles.cardDescription}>
                            <FormattedMessage
                                id="dashboard.learnWithText.desc"
                                defaultMessage="Write or paste any text, highlight individual words or entire phrases, and add them to your dictionary."
                            />
                        </p>
                    </MotionLink>

                    {/* 7. SUBTITLES (SPAN 4) */}
                    <MotionLink
                        to="/subtitles"
                        className={`${styles.bentoCard} ${styles.cardFormat}`}
                        variants={itemVariants}
                    >
                        <div className={styles.formatTop}>
                            <div className={styles.formatHeaderLeft}>
                                <div className={styles.iconSquircle}>
                                    <Layers size={20} strokeWidth={1.8} />
                                </div>
                                <h3 className={styles.cardTitle}>
                                    <FormattedMessage id="dashboard.uploadSubtitles" defaultMessage="Learning with subtitles" />
                                </h3>
                            </div>
                            <ArrowRight size={18} strokeWidth={2} className={styles.quietChevron} />
                        </div>

                        <p className={styles.cardDescription}>
                            <FormattedMessage
                                id="dashboard.uploadSubtitles.desc"
                                defaultMessage="Upload a subtitle file and save any words or phrases to learn."
                            />
                        </p>
                    </MotionLink>

                    {/* 8. TELEGRAM BOT (SPAN 4) */}
                    <MotionLink
                        to="/telegramBot"
                        className={`${styles.bentoCard} ${styles.cardFormat}`}
                        variants={itemVariants}
                    >
                        <div className={styles.formatTop}>
                            <div className={styles.formatHeaderLeft}>
                                <div className={styles.iconSquircle}>
                                    <Send size={20} strokeWidth={1.8} />
                                </div>
                                <h3 className={styles.cardTitle}>
                                    <FormattedMessage id="dashboard.telegramBot" defaultMessage="Telegram bot practice" />
                                </h3>
                            </div>
                            <ArrowRight size={18} strokeWidth={2} className={styles.quietChevron} />
                        </div>

                        <p className={styles.cardDescription}>
                            <FormattedMessage
                                id="dashboard.telegramBot.desc"
                                defaultMessage="Review saved words and phrases daily in a convenient format right in Telegram."
                            />
                        </p>
                    </MotionLink>
                </motion.div>
            </div>

            {!statsLoading && stats && (
                <StreakShareModal
                    isOpen={isStreakModalOpen}
                    onClose={() => setIsStreakModalOpen(false)}
                    streakDays={stats.streakDays}
                    totalWords={stats.totalWords}
                    learningWords={stats.learningWords}
                    dueToday={stats.dueToday}
                    sessionCards={stats.sessionCards}
                    reviewedToday={stats.reviewedToday}
                    weekDays={stats.weekDays}
                />
            )}

            <WelcomeModal
                isOpen={isWelcomeModalOpen}
                onClose={handleCloseWelcomeModal}
            />
        </motion.div>
    );
};

export default DashboardPage;