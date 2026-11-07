import React from 'react';
import { Link } from 'react-router-dom';
import { FormattedMessage } from 'react-intl';
import { motion } from 'framer-motion';
import {
    ArrowRight,
    Play,
    Music,
    FileText,
    BookOpen,
    Send,
    Film,
    Layers,
} from 'lucide-react';
import { RecentVideo } from '../../../hooks/useRecentVideos';
import { dashboardItemVariants } from '../dashboardUtils';
import styles from '../css/DashboardPage.module.css';

const MotionLink = typeof motion.create === 'function' ? motion.create(Link) : motion(Link);

interface DashboardFormatCardsProps {
    latestRecentVideo: RecentVideo | null;
    heroVideoTargetUrl: string;
}

export const DashboardFormatCards: React.FC<DashboardFormatCardsProps> = ({
    latestRecentVideo,
    heroVideoTargetUrl,
}) => {
    return (
        <>
            {/* ROW 1, COLS 1–8: FEATURED FORMAT: VIDEO LEARNING (SPAN 8) */}
            <MotionLink
                to={heroVideoTargetUrl}
                className={`${styles.bentoCard} ${styles.cardHeroVideo}`}
                variants={dashboardItemVariants}
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

            {/* ROW 2, COLS 1–4: SONGS & LYRICS (SPAN 4) */}
            <MotionLink
                to="/songs"
                className={`${styles.bentoCard} ${styles.cardFormat} ${styles.cardSongs}`}
                variants={dashboardItemVariants}
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

            {/* ROW 2, COLS 5–8: BOOKS & READING (SPAN 4) */}
            <MotionLink
                to="/books"
                className={`${styles.bentoCard} ${styles.cardFormat} ${styles.cardBooks}`}
                variants={dashboardItemVariants}
            >
                <div className={styles.formatTop}>
                    <div className={styles.formatHeaderLeft}>
                        <div className={styles.iconSquircle}>
                            <BookOpen size={20} strokeWidth={1.8} />
                        </div>
                        <h3 className={styles.cardTitle}>
                            <FormattedMessage id="dashboard.learnWithBooks" defaultMessage="Learning with books" />
                        </h3>
                    </div>
                    <ArrowRight size={18} strokeWidth={2} className={styles.quietChevron} />
                </div>

                <p className={styles.cardDescription}>
                    <FormattedMessage
                        id="dashboard.learnWithBooks.desc"
                        defaultMessage="Read graded books by CEFR levels or upload EPUB/TXT files, highlight words, and save them to your deck."
                    />
                </p>
            </MotionLink>

            {/* ROW 3, COLS 1–4: TEXTS & AI (SPAN 4) */}
            <MotionLink
                to="/text-paste"
                className={`${styles.bentoCard} ${styles.cardFormat} ${styles.cardTexts}`}
                variants={dashboardItemVariants}
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

            {/* ROW 3, COLS 5–8: SUBTITLES (SPAN 4) */}
            <MotionLink
                to="/subtitles"
                className={`${styles.bentoCard} ${styles.cardFormat} ${styles.cardSubtitles}`}
                variants={dashboardItemVariants}
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

            {/* ROW 4, COLS 1–12: TELEGRAM BOT (FULL-WIDTH ACCENT) */}
            <MotionLink
                to="/telegramBot"
                className={`${styles.bentoCard} ${styles.cardTelegram}`}
                variants={dashboardItemVariants}
            >
                <div className={styles.telegramBody}>
                    <div className={styles.iconSquircle}>
                        <Send size={20} strokeWidth={1.8} />
                    </div>
                    <div className={styles.telegramTextGroup}>
                        <h3 className={styles.cardTitle}>
                            <FormattedMessage id="dashboard.telegramBot" defaultMessage="Telegram bot practice" />
                        </h3>
                        <p className={styles.cardDescription}>
                            <FormattedMessage
                                id="dashboard.telegramBot.desc"
                                defaultMessage="Review saved words and phrases daily in a convenient format right in Telegram."
                            />
                        </p>
                    </div>
                </div>

                <ArrowRight size={18} strokeWidth={2} className={styles.quietChevron} />
            </MotionLink>
        </>
    );
};
