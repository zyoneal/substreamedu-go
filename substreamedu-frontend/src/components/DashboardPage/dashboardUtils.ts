import { Variants } from 'framer-motion';
import { RecentVideo } from '../../hooks/useRecentVideos';

export interface DashboardStats {
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

export interface DerivedDashboardMetrics {
    currentDayIndex: number;
    reviewedToday: boolean;
    activeStreakCount: number;
    latestRecentVideo: RecentVideo | null;
    heroVideoTargetUrl: string;
    sessionCardsCount: number;
    dueCount: number;
    newCardsCount: number;
    totalWords: number;
    learningWords: number;
    isNewUser: boolean;
    isAllCaughtUp: boolean;
    weekActivity: boolean[];
}

export const DAYS_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

export const dashboardContainerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.04,
            delayChildren: 0.02,
        },
    },
};

export const dashboardItemVariants: Variants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', bounce: 0, duration: 0.45 },
    },
};

export const computeWeekActivity = (
    stats: DashboardStats | null,
    currentDayIndex: number
): boolean[] => {
    if (stats?.weekDays && stats.weekDays.length === 7) {
        return stats.weekDays;
    }
    const reviewedToday = stats?.reviewedToday ?? false;
    const activeStreakCount = stats ? Math.min(stats.streakDays, 7) : 0;

    return DAYS_LETTERS.map((_, idx) =>
        reviewedToday
            ? idx <= currentDayIndex && currentDayIndex - idx < activeStreakCount
            : idx < currentDayIndex && currentDayIndex - 1 - idx < activeStreakCount
    );
};

export const getHeroVideoTargetUrl = (latestRecentVideo: RecentVideo | null): string => {
    if (latestRecentVideo?.videoUrl && /^https?:\/\//i.test(latestRecentVideo.videoUrl)) {
        const timeParam = latestRecentVideo.currentTime && latestRecentVideo.currentTime > 5
            ? `&t=${Math.floor(latestRecentVideo.currentTime)}`
            : '';
        return `/videos?videoUrl=${encodeURIComponent(latestRecentVideo.videoUrl)}${timeParam}`;
    }
    return '/videos';
};

export const deriveDashboardMetrics = (
    stats: DashboardStats | null,
    statsLoading: boolean,
    recentVideos: RecentVideo[],
    now: Date = new Date()
): DerivedDashboardMetrics => {
    const currentDayIndex = (now.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    const reviewedToday = stats?.reviewedToday ?? false;
    const activeStreakCount = stats ? Math.min(stats.streakDays, 7) : 0;
    const latestRecentVideo = recentVideos && recentVideos.length > 0 ? recentVideos[0] : null;
    const heroVideoTargetUrl = getHeroVideoTargetUrl(latestRecentVideo);

    const sessionCardsCount = stats ? (stats.sessionCards ?? stats.dueToday ?? 0) : 0;
    const dueCount = stats ? (stats.sessionDueCards ?? stats.dueToday ?? 0) : 0;
    const newCardsCount = stats ? (stats.sessionNewCards ?? 0) : 0;
    const totalWords = stats?.totalWords ?? 0;
    const learningWords = stats?.learningWords ?? 0;
    const isNewUser = !statsLoading && stats !== null && totalWords === 0;
    const isAllCaughtUp = !isNewUser && !statsLoading && stats !== null && sessionCardsCount === 0;
    const weekActivity = computeWeekActivity(stats, currentDayIndex);

    return {
        currentDayIndex,
        reviewedToday,
        activeStreakCount,
        latestRecentVideo,
        heroVideoTargetUrl,
        sessionCardsCount,
        dueCount,
        newCardsCount,
        totalWords,
        learningWords,
        isNewUser,
        isAllCaughtUp,
        weekActivity,
    };
};

