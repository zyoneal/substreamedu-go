import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage, useIntl } from 'react-intl';
import { motion } from 'framer-motion';
import Share2 from 'lucide-react/dist/esm/icons/share-2';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Play from 'lucide-react/dist/esm/icons/play';
import Music from 'lucide-react/dist/esm/icons/music';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import BookOpen from 'lucide-react/dist/esm/icons/book-open';
import Send from 'lucide-react/dist/esm/icons/send';
import Film from 'lucide-react/dist/esm/icons/film';
import Layers from 'lucide-react/dist/esm/icons/layers';
import Check from 'lucide-react/dist/esm/icons/check';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';

import { DictionaryService } from '../../services/DictionaryService';
import { useRecentVideos } from '../../hooks/useRecentVideos';
import { StreakShareModal, VectorFlameIcon } from './components/StreakShareModal';
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

    const currentDayIndex = (new Date().getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const reviewedToday = stats?.reviewedToday ?? false;
    const activeStreakCount = stats ? Math.min(stats.streakDays, 7) : 0;
    const latestRecentVideo = recentVideos && recentVideos.length > 0 ? recentVideos[0] : null;

    const sessionCardsCount = stats ? (stats.sessionCards ?? stats.dueToday ?? 0) : 0;
    const dueCount = stats ? (stats.sessionDueCards ?? stats.dueToday ?? 0) : 0;
    const newCardsCount = stats ? (stats.sessionNewCards ?? 0) : 0;
    const newWordsCount = stats ? (stats.sessionNewWords ?? Math.floor(newCardsCount / 2)) : 0;
    const isNewUser = !statsLoading && (stats?.totalWords ?? 0) === 0;
    const isAllCaughtUp = !isNewUser && reviewedToday && dueCount === 0;

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.06,
                delayChildren: 0.04
            }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 16 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
        }
    };

    return (
        <motion.div
            className={styles.dashboardContainer}
            initial="hidden"
            animate="visible"
            variants={containerVariants}
        >
            <div className={styles.ambientGlow} />
            <div className={`${styles.ambientGlow} ${styles.ambientGlowSecond}`} />

            <div className={styles.contentWrapper}>
                <motion.div className={styles.headerSection} variants={itemVariants}>
                    <span className={styles.eyebrow}>00 // DASHBOARD</span>
                    <h1 className={styles.pageTitle}>
                        {parseDoTags(intl.formatMessage({
                            id: 'dashboard.chooseAction',
                            defaultMessage: 'Choose your <do>learning</do> format'
                        }))}
                    </h1>
                </motion.div>

                <motion.div className={styles.bentoGrid} variants={containerVariants}>
                    <motion.div
                        className={`${styles.bentoCard} ${styles.cardStreak}`}
                        variants={itemVariants}
                        onClick={() => !isNewUser && setIsStreakModalOpen(true)}
                        role="button"
                        tabIndex={0}
                        aria-label={intl.formatMessage({ id: 'dashboard.stats.shareStreak', defaultMessage: 'Share streak' })}
                    >
                        <div className={styles.streakTop}>
                            <div className={styles.streakNumberRow}>
                                <VectorFlameIcon theme="solar" size={28} />
                                <span className={`${styles.streakBigNumber} ${isNewUser ? styles.streakNumberZero : ''}`}>
                                    {statsLoading ? '–' : stats?.streakDays ?? 0}
                                </span>
                                <span className={styles.streakLabel}>
                                    <FormattedMessage id="dashboard.stats.streak" defaultMessage="day streak" />
                                </span>
                            </div>
                            {isNewUser ? (
                                <span className={styles.streakReadyBadge}>
                                    <Sparkles size={10} strokeWidth={2.5} />
                                    <FormattedMessage id="dashboard.stats.dayOne" defaultMessage="Day 1" />
                                </span>
                            ) : (
                                <span className={styles.streakShareBadge}>
                                    <Share2 size={11} strokeWidth={2.5} />
                                    <FormattedMessage id="dashboard.stats.share" defaultMessage="Share" />
                                </span>
                            )}
                        </div>

                        <div className={styles.streakWeekNodes}>
                            {DAYS_LETTERS.map((day, idx) => {
                                const isActive = reviewedToday
                                    ? idx <= currentDayIndex && (currentDayIndex - idx < activeStreakCount)
                                    : idx < currentDayIndex && (currentDayIndex - 1 - idx < activeStreakCount);
                                const isToday = idx === currentDayIndex;
                                return (
                                    <div key={idx} className={styles.weekNode}>
                                        <span className={styles.weekNodeDay}>{day}</span>
                                        <div
                                            className={`${styles.weekNodeCircle} ${
                                                isActive ? styles.weekNodeActive : ''
                                            } ${isToday ? styles.weekNodeToday : ''}`}
                                        >
                                            {isActive && <Check size={11} strokeWidth={3} />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>

                    <MotionLink
                        to={isNewUser ? "/videos" : "/learning"}
                        className={`${styles.bentoCard} ${styles.cardReview}`}
                        variants={itemVariants}
                    >
                        <div>
                            <div className={styles.glassPillRow}>
                                <span className={`${styles.monoTag} ${styles.monoTagAccent}`}>
                                    <Sparkles size={10} />
                                    {isNewUser ? (
                                        <FormattedMessage id="dashboard.bento.tag.getStarted" defaultMessage="GET STARTED" />
                                    ) : (
                                        <FormattedMessage id="dashboard.bento.tag.instantSrs" defaultMessage="01 // INSTANT SRS" />
                                    )}
                                </span>
                            </div>
                            <div className={styles.reviewHeader}>
                                <div>
                                    {isNewUser ? (
                                        <>
                                            <div className={styles.reviewNumberRow}>
                                                <span className={styles.zeroStateCardTitle}>
                                                    <FormattedMessage id="dashboard.zeroState.srsTitle" defaultMessage="Start Your Deck" />
                                                </span>
                                            </div>
                                            <div className={styles.srsBreakdownRow}>
                                                <span className={styles.srsZeroBadge}>
                                                    <Sparkles size={10} strokeWidth={2.5} />
                                                    <FormattedMessage id="dashboard.zeroState.srsBadge" defaultMessage="Save words while watching" />
                                                </span>
                                            </div>
                                        </>
                                    ) : isAllCaughtUp ? (
                                        <>
                                            <div className={styles.reviewNumberRow}>
                                                <span className={`${styles.reviewStatNumber} ${styles.reviewStatNumberDone}`}>
                                                    0
                                                </span>
                                                <span className={styles.streakLabel}>
                                                    <FormattedMessage id="dashboard.stats.dueToday" defaultMessage="due today" />
                                                </span>
                                            </div>
                                            <div className={styles.srsBreakdownRow}>
                                                <span className={styles.srsAllDoneBadge}>
                                                    <Check size={11} strokeWidth={3} className={styles.srsCheckIcon} />
                                                    <FormattedMessage id="dashboard.stats.dailyGoalCompleted" defaultMessage="Daily goal completed!" />
                                                </span>
                                                {newCardsCount > 0 && (
                                                    <span className={styles.srsChipNewOptional}>
                                                        <Sparkles size={10} strokeWidth={2.5} />
                                                        <FormattedMessage
                                                            id="dashboard.stats.extraPracticeBadge"
                                                            defaultMessage="{count} new (optional practice)"
                                                            values={{ count: newCardsCount }}
                                                        />
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className={styles.reviewNumberRow}>
                                                <span className={`${styles.reviewStatNumber} ${sessionCardsCount > 0 ? styles.reviewStatNumberActive : ''}`}>
                                                    {statsLoading ? '–' : sessionCardsCount}
                                                </span>
                                                <span className={styles.streakLabel}>
                                                    <FormattedMessage id="dashboard.stats.cardsToday" defaultMessage="cards today" />
                                                </span>
                                            </div>
                                            {!statsLoading && sessionCardsCount > 0 && (
                                                <div className={styles.srsBreakdownRow}>
                                                    {dueCount > 0 && (
                                                        <span className={styles.srsChipReview}>
                                                            <RotateCcw size={10} strokeWidth={2.5} />
                                                            <FormattedMessage
                                                                id="dashboard.stats.reviewsBadge"
                                                                defaultMessage="{count} to review"
                                                                values={{ count: dueCount }}
                                                            />
                                                        </span>
                                                    )}
                                                    {newCardsCount > 0 && (
                                                        <span className={styles.srsChipNew}>
                                                            <Sparkles size={10} strokeWidth={2.5} />
                                                            <FormattedMessage
                                                                id="dashboard.stats.newBadge"
                                                                defaultMessage="{count} new ({words} words)"
                                                                values={{ count: newCardsCount, words: newWordsCount }}
                                                            />
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            {!statsLoading && sessionCardsCount === 0 && (
                                                <div className={styles.srsAllDoneRow}>
                                                    <Check size={12} strokeWidth={2.5} className={styles.srsCheckIcon} />
                                                    <FormattedMessage id="dashboard.stats.allCaughtUp" defaultMessage="All caught up for today!" />
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className={styles.reviewActionRow}>
                            <span className={styles.cardDescription}>
                                {isNewUser ? (
                                    <FormattedMessage
                                        id="dashboard.zeroState.srsDesc"
                                        defaultMessage="Click any subtitle to save words, then train them here with smart flashcards."
                                    />
                                ) : isAllCaughtUp ? (
                                    <FormattedMessage
                                        id="dashboard.learning.allDoneDesc"
                                        defaultMessage="Great job! Take a rest or practice extra words"
                                    />
                                ) : (
                                    <FormattedMessage
                                        id="dashboard.learning.desc"
                                        defaultMessage="Train memory with smart flashcards"
                                    />
                                )}
                            </span>
                            <span className={`${styles.reviewBtn} ${isAllCaughtUp ? styles.reviewBtnOptional : ''}`}>
                                {isNewUser ? (
                                    <>
                                        <FormattedMessage id="dashboard.bento.exploreVideos" defaultMessage="Explore Videos" />
                                        <ArrowRight size={12} strokeWidth={2.5} />
                                    </>
                                ) : isAllCaughtUp ? (
                                    <>
                                        <FormattedMessage id="dashboard.bento.practiceMore" defaultMessage="Practice More" />
                                        <ArrowRight size={12} strokeWidth={2.5} />
                                    </>
                                ) : (
                                    <>
                                        <FormattedMessage id="dashboard.bento.startReview" defaultMessage="Start Review" />
                                        <ArrowRight size={12} strokeWidth={2.5} />
                                    </>
                                )}
                            </span>
                        </div>
                    </MotionLink>

                    <MotionLink
                        to={isNewUser ? "/videos" : "/dictionary"}
                        className={`${styles.bentoCard} ${styles.cardVault}`}
                        variants={itemVariants}
                    >
                        <div>
                            <div className={styles.glassPillRow}>
                                <span className={styles.monoTag}>
                                    <BookOpen size={10} />
                                    <FormattedMessage id="dashboard.bento.vocabularyVault" defaultMessage="02 // VOCABULARY VAULT" />
                                </span>
                            </div>

                            <div className={styles.vaultStatsRow}>
                                {isNewUser ? (
                                    <div className={styles.vaultZeroStateRow}>
                                        <span className={styles.vaultZeroStateTitle}>
                                            <FormattedMessage id="dashboard.zeroState.vaultTitle" defaultMessage="Your Vault is Empty" />
                                        </span>
                                        <span className={styles.vaultZeroStateSubtitle}>
                                            <FormattedMessage id="dashboard.zeroState.vaultSubtitle" defaultMessage="Collect words from subtitles" />
                                        </span>
                                    </div>
                                ) : (
                                    <>
                                        <div className={styles.vaultStatItem}>
                                            <span className={styles.vaultValue}>
                                                {statsLoading ? '–' : stats?.totalWords.toLocaleString() ?? 0}
                                            </span>
                                            <span className={styles.vaultSubLabel}>
                                                <FormattedMessage id="dashboard.stats.totalWords" defaultMessage="total words" />
                                            </span>
                                        </div>
                                        <div className={styles.vaultStatItem}>
                                            <span className={styles.vaultValue} style={{ color: '#60a5fa' }}>
                                                {statsLoading ? '–' : stats?.learningWords.toLocaleString() ?? 0}
                                            </span>
                                            <span className={styles.vaultSubLabel}>
                                                <FormattedMessage id="dashboard.stats.learning" defaultMessage="in progress" />
                                            </span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        <div className={styles.subtitlesRow} style={{ marginTop: 12 }}>
                            <span className={styles.cardDescription}>
                                {isNewUser ? (
                                    <FormattedMessage
                                        id="dashboard.zeroState.vaultDesc"
                                        defaultMessage="Every word and phrase you save will be organized and analyzed here."
                                    />
                                ) : (
                                    <FormattedMessage
                                        id="dashboard.dictionary.desc"
                                        defaultMessage="Manage saved words and phrases"
                                    />
                                )}
                            </span>
                            <div className={styles.arrowPill}>
                                <ArrowRight size={14} strokeWidth={2.5} />
                            </div>
                        </div>
                    </MotionLink>

                    <MotionLink
                        to="/videos"
                        className={`${styles.bentoCard} ${styles.cardHeroVideo}`}
                        variants={itemVariants}
                    >
                        <div className={styles.heroCardBody}>
                            <div className={styles.glassPillRow}>
                                <span className={`${styles.monoTag} ${styles.monoTagAccent}`}>
                                    <Film size={10} />
                                    <FormattedMessage id="dashboard.bento.tag.cinema" defaultMessage="03 // YOUTUBE & MOVIES" />
                                </span>
                                <span className={styles.monoTag}>
                                    <FormattedMessage id="dashboard.bento.tag.aiLookup" defaultMessage="AI LOOKUP" />
                                </span>
                            </div>

                            {latestRecentVideo ? (
                                <>
                                    <h2 className={styles.heroTitle}>
                                        <FormattedMessage id="dashboard.bento.resume" defaultMessage="Resume Watching" />
                                    </h2>
                                    <p className={styles.heroDescription}>
                                        <FormattedMessage id="dashboard.uploadMovieDesc" defaultMessage="Open a YouTube video from the link or a movie / TV series from your computer. Watch, read the subtitles, and save new words and phrases to your dictionary." />
                                    </p>
                                    <div className={styles.recentVideoBanner}>
                                        {latestRecentVideo.thumbnailUrl ? (
                                            <img
                                                src={latestRecentVideo.thumbnailUrl}
                                                alt=""
                                                className={styles.recentThumb}
                                            />
                                        ) : (
                                            <div className={styles.recentThumb} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <Film size={18} color="#94a3b8" />
                                            </div>
                                        )}
                                        <div className={styles.recentInfo}>
                                            <h4 className={styles.recentTitle}>{latestRecentVideo.name}</h4>
                                            <span className={styles.monoTag} style={{ fontSize: 9, padding: '1px 6px' }}>
                                                {latestRecentVideo.date}
                                            </span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <h2 className={styles.heroTitle}>
                                        <FormattedMessage id="dashboard.uploadMovie" defaultMessage="Video-based learning" />
                                    </h2>
                                    <p className={styles.heroDescription}>
                                        <FormattedMessage id="dashboard.uploadMovieDesc" defaultMessage="Open a YouTube video from the link or a movie / TV series from your computer. Watch, read the subtitles, and save new words and phrases to your dictionary." />
                                    </p>
                                </>
                            )}
                        </div>

                        <div className={styles.heroFooter}>
                            <span className={styles.heroPrimaryBtn}>
                                <Play size={13} fill="currentColor" strokeWidth={0} />
                                {latestRecentVideo ? (
                                    <FormattedMessage id="dashboard.bento.continue" defaultMessage="Continue" />
                                ) : (
                                    <FormattedMessage id="dashboard.bento.browseCatalog" defaultMessage="Explore Catalog" />
                                )}
                            </span>
                            <div className={styles.arrowPill}>
                                <ArrowRight size={14} strokeWidth={2.5} />
                            </div>
                        </div>

                        <Film className={styles.heroThumbnailWatermark} />
                    </MotionLink>

                    <MotionLink
                        to="/songs"
                        className={`${styles.bentoCard} ${styles.cardSongs}`}
                        variants={itemVariants}
                    >
                        <div>
                            <div className={styles.cardIconHeader}>
                                <div className={styles.cardIconBox}>
                                    <Music size={20} />
                                </div>
                                <span className={styles.monoTag}>
                                    <FormattedMessage id="dashboard.bento.tag.lyrics" defaultMessage="04 // SONGS & LYRICS" />
                                </span>
                            </div>
                            <h3 className={styles.cardTitle}>
                                <FormattedMessage id="dashboard.learnWithSongs" defaultMessage="Learn with songs" />
                            </h3>
                            <p className={styles.cardDescription}>
                                <FormattedMessage id="dashboard.learnWithSongs.desc" defaultMessage="Translate lyrics in real time while listening to your favorite tracks." />
                            </p>
                        </div>

                        <div className={styles.subtitlesRow} style={{ marginTop: 18 }}>
                            <span className={styles.monoTag} style={{ textTransform: 'none' }}>
                                Spotify & YouTube
                            </span>
                            <div className={styles.arrowPill}>
                                <ArrowRight size={14} strokeWidth={2.5} />
                            </div>
                        </div>
                    </MotionLink>

                    <MotionLink
                        to="/text-paste"
                        className={`${styles.bentoCard} ${styles.cardReader}`}
                        variants={itemVariants}
                    >
                        <div>
                            <div className={styles.cardIconHeader}>
                                <div className={styles.cardIconBox}>
                                    <FileText size={20} />
                                </div>
                                <span className={styles.monoTag}>
                                    <FormattedMessage id="dashboard.bento.tag.analysis" defaultMessage="05 // TEXT & AI" />
                                </span>
                            </div>
                            <h3 className={styles.cardTitle}>
                                <FormattedMessage id="dashboard.learnWithText" defaultMessage="Learn with text" />
                            </h3>
                            <p className={styles.cardDescription}>
                                <FormattedMessage id="dashboard.learnWithText.desc" defaultMessage="Paste any English text, analyze difficulty, and save complex phrases." />
                            </p>
                        </div>

                        <div className={styles.subtitlesRow} style={{ marginTop: 18 }}>
                            <span className={styles.monoTag} style={{ textTransform: 'none' }}>
                                CEFR A1 - C1
                            </span>
                            <div className={styles.arrowPill}>
                                <ArrowRight size={14} strokeWidth={2.5} />
                            </div>
                        </div>
                    </MotionLink>

                    <MotionLink
                        to="/subtitles"
                        className={`${styles.bentoCard} ${styles.cardSubtitles}`}
                        variants={itemVariants}
                    >
                        <div>
                            <div className={styles.cardIconHeader}>
                                <div className={styles.cardIconBox}>
                                    <Layers size={20} />
                                </div>
                                <span className={styles.monoTag}>
                                    <FormattedMessage id="dashboard.bento.tag.sync" defaultMessage="06 // SUBTITLES" />
                                </span>
                            </div>
                            <h3 className={styles.cardTitle}>
                                <FormattedMessage id="dashboard.uploadSubtitles" defaultMessage="Add subtitles" />
                            </h3>
                            <p className={styles.cardDescription}>
                                <FormattedMessage id="dashboard.uploadSubtitles.desc" defaultMessage="Upload custom SRT/VTT subtitle files for your uploaded movies." />
                            </p>
                        </div>

                        <div className={styles.subtitlesRow} style={{ marginTop: 18 }}>
                            <span className={styles.monoTag} style={{ textTransform: 'none' }}>
                                SRT · VTT
                            </span>
                            <div className={styles.arrowPill}>
                                <ArrowRight size={14} strokeWidth={2.5} />
                            </div>
                        </div>
                    </MotionLink>

                    <MotionLink
                        to="/telegramBot"
                        className={`${styles.bentoCard} ${styles.cardTelegram}`}
                        variants={itemVariants}
                    >
                        <div>
                            <div className={styles.cardIconHeader}>
                                <div className={styles.cardIconBox}>
                                    <Send size={20} />
                                </div>
                                <span className={styles.monoTag}>
                                    <FormattedMessage id="dashboard.bento.tag.bot" defaultMessage="07 // TELEGRAM BOT" />
                                </span>
                            </div>
                            <h3 className={styles.cardTitle}>
                                <FormattedMessage id="dashboard.telegramBot" defaultMessage="Telegram bot practice" />
                            </h3>
                            <p className={styles.cardDescription}>
                                <FormattedMessage id="dashboard.telegramBot.desc" defaultMessage="Connect our Telegram assistant bot to receive words daily." />
                            </p>
                        </div>

                        <div className={styles.subtitlesRow} style={{ marginTop: 18 }}>
                            <span className={styles.monoTag} style={{ textTransform: 'none' }}>
                                @substreamedu_bot
                            </span>
                            <div className={styles.arrowPill}>
                                <ArrowRight size={14} strokeWidth={2.5} />
                            </div>
                        </div>
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
                />
            )}
        </motion.div>
    );
};

export default DashboardPage;