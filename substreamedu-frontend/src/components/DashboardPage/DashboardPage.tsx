import React from 'react';
import { useIntl } from 'react-intl';
import { motion } from 'framer-motion';

import { usePixzenTheme } from '../HomePage/pixzen/usePixzenTheme';
import { StreakShareModal } from './components/StreakShareModal';
import { WelcomeModal } from './components/WelcomeModal';
import { DashboardFormatCards } from './components/DashboardFormatCards';
import { DashboardTelemetryCards } from './components/DashboardTelemetryCards';
import { useDashboardData } from './useDashboardData';
import {
    dashboardContainerVariants,
    dashboardItemVariants,
} from './dashboardUtils';
import { parseDoTags } from '../../utils/textUtils';
import styles from './css/DashboardPage.module.css';

const DashboardPage: React.FC = () => {
    usePixzenTheme();
    const intl = useIntl();
    const {
        stats,
        statsLoading,
        metrics,
        isStreakModalOpen,
        openStreakModal,
        closeStreakModal,
        isWelcomeModalOpen,
        closeWelcomeModal,
    } = useDashboardData();

    return (
        <motion.div
            className={styles.dashboardContainer}
            initial="hidden"
            animate="visible"
            variants={dashboardContainerVariants}
        >
            <div className="pixzenGrain" aria-hidden="true" />
            <div className={styles.contentWrapper}>
                <motion.header className={styles.headerSection} variants={dashboardItemVariants}>
                    <h1 className={styles.pageTitle}>
                        {parseDoTags(
                            intl.formatMessage({
                                id: 'dashboard.chooseAction',
                                defaultMessage: 'Choose your <do>learning</do> format',
                            }),
                            styles.accent
                        )}
                    </h1>
                </motion.header>

                <motion.div className={styles.bentoGrid} variants={dashboardContainerVariants}>
                    <DashboardFormatCards
                        latestRecentVideo={metrics.latestRecentVideo}
                        heroVideoTargetUrl={metrics.heroVideoTargetUrl}
                    />
                    <DashboardTelemetryCards
                        stats={stats}
                        statsLoading={statsLoading}
                        metrics={metrics}
                        onOpenStreakModal={openStreakModal}
                    />
                </motion.div>
            </div>

            {!statsLoading && stats && (
                <StreakShareModal
                    isOpen={isStreakModalOpen}
                    onClose={closeStreakModal}
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
                onClose={closeWelcomeModal}
            />
        </motion.div>
    );
};

export default DashboardPage;
