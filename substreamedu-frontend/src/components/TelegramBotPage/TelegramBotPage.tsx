import React, { useEffect, useState } from 'react';
import { UserDto } from '../../interfaces/response/UserDto';
import { userService } from '../../services/UserService';
import styles from './css/TelegramBotPage.module.css';
import { FormattedMessage } from 'react-intl';
import { Rocket } from 'lucide-react';
import { usePixzenTheme } from '../HomePage/pixzen/usePixzenTheme';
import '../../styles/pixzen.css';

const TelegramBotPage: React.FC = () => {
    usePixzenTheme();

    const [user, setUser] = useState<UserDto | null>(null);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const response = await userService.getCabinetInfo();
                setUser(response.data);
            } catch (err) {
                console.error('Error fetching user data:', err);
                setError('Unable to fetch user data. Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, []);

    if (loading) {
        return (
            <div className={styles.pageWrapper}>
                <div className="pixzenGrain" aria-hidden="true" />
                <div className={styles.loading}>Loading...</div>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.pageWrapper}>
                <div className="pixzenGrain" aria-hidden="true" />
                <div className={styles.error}>{error}</div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className={styles.pageWrapper}>
                <div className="pixzenGrain" aria-hidden="true" />
                <div className={styles.error}>User data not available.</div>
            </div>
        );
    }

    return (
        <div className={styles.pageWrapper}>
            <div className="pixzenGrain" aria-hidden="true" />
            <div className={styles.content}>
                <div className={styles.container}>
                    <div className={styles.heroSection}>
                        <span className={styles.heroLabel}>TELEGRAM AI ASSISTANT</span>

                        <h1 className={styles.heroTitle}>
                            <FormattedMessage
                                id="telegramBotPage.title"
                                defaultMessage="Learn English Through Your Personal AI Bot in Telegram"
                            />
                        </h1>

                        <p className={styles.heroSubtitle}>
                            <FormattedMessage
                                id="telegramBotPage.subtitle"
                                defaultMessage="Daily lessons with your saved words, spaced repetition, and AI-generated stories - all in your pocket"
                            />
                        </p>

                        <a
                            href={`https://t.me/substreamedu_bot?start=${user.telegramToken}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.heroCta}
                        >
                            <Rocket className={styles.ctaIcon} size={18} aria-hidden="true" />
                            <FormattedMessage
                                id="telegramBotPage.connectButton"
                                defaultMessage="Connect to Telegram Bot"
                            />
                        </a>

                        <div className={styles.heroStats}>
                            <div className={styles.statItem}>
                                <div className={styles.statNumber}>50</div>
                                <div className={styles.statLabel}>
                                    <FormattedMessage id="telegramBotPage.stats.words" defaultMessage="words daily" />
                                </div>
                            </div>
                            <div className={styles.statDivider} aria-hidden="true" />
                            <div className={styles.statItem}>
                                <div className={styles.statNumber}>9:00</div>
                                <div className={styles.statLabel}>
                                    <FormattedMessage id="telegramBotPage.stats.time" defaultMessage="every morning" />
                                </div>
                            </div>
                            <div className={styles.statDivider} aria-hidden="true" />
                            <div className={styles.statItem}>
                                <div className={styles.statNumber}>100%</div>
                                <div className={styles.statLabel}>
                                    <FormattedMessage id="telegramBotPage.stats.personal" defaultMessage="personal" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TelegramBotPage;