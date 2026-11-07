import { useState, useEffect, useCallback, useMemo } from 'react';
import { DictionaryService } from '../../services/DictionaryService';
import { useRecentVideos } from '../../hooks/useRecentVideos';
import {
    DashboardStats,
    DerivedDashboardMetrics,
    deriveDashboardMetrics,
} from './dashboardUtils';

const ONBOARDING_MODAL_STORAGE_KEY = 'hasSeenOnboardingModal';

export interface UseDashboardDataResult {
    stats: DashboardStats | null;
    statsLoading: boolean;
    metrics: DerivedDashboardMetrics;
    isStreakModalOpen: boolean;
    openStreakModal: () => void;
    closeStreakModal: () => void;
    isWelcomeModalOpen: boolean;
    closeWelcomeModal: () => void;
}

export const useDashboardData = (): UseDashboardDataResult => {
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [statsLoading, setStatsLoading] = useState(true);
    const [isStreakModalOpen, setIsStreakModalOpen] = useState(false);
    const [isWelcomeModalOpen, setIsWelcomeModalOpen] = useState(false);
    const [recentVideos] = useRecentVideos();

    useEffect(() => {
        let isMounted = true;
        const loadStats = async () => {
            try {
                const data = await DictionaryService.fetchDashboardStats();
                if (isMounted) {
                    setStats(data);
                    setStatsLoading(false);
                }
            } catch {
                if (isMounted) {
                    setStatsLoading(false);
                }
            }
        };
        loadStats();
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        if (!statsLoading && (stats?.totalWords ?? 0) === 0) {
            const hasSeenOnboarding = localStorage.getItem(ONBOARDING_MODAL_STORAGE_KEY);
            if (!hasSeenOnboarding) {
                setIsWelcomeModalOpen(true);
            }
        }
    }, [stats, statsLoading]);

    const metrics = useMemo(
        () => deriveDashboardMetrics(stats, statsLoading, recentVideos),
        [stats, statsLoading, recentVideos]
    );

    const openStreakModal = useCallback(() => {
        if (!metrics.isNewUser) {
            setIsStreakModalOpen(true);
        }
    }, [metrics.isNewUser]);

    const closeStreakModal = useCallback(() => {
        setIsStreakModalOpen(false);
    }, []);

    const closeWelcomeModal = useCallback(() => {
        localStorage.setItem(ONBOARDING_MODAL_STORAGE_KEY, 'true');
        setIsWelcomeModalOpen(false);
    }, []);

    return {
        stats,
        statsLoading,
        metrics,
        isStreakModalOpen,
        openStreakModal,
        closeStreakModal,
        isWelcomeModalOpen,
        closeWelcomeModal,
    };
};
