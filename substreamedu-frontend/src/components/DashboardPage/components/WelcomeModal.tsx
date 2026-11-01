import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FormattedMessage, useIntl } from 'react-intl';
import { Sparkles, ArrowRight, Play, MousePointer2, Bookmark, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import styles from '../css/DashboardPage.module.css';

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const intl = useIntl();

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    const handleStart = () => {
        onClose();
        navigate('/youtube-demo?onboarding=true');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className={styles.welcomeModalOverlay}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.welcomeModalBackdrop}
                        onClick={onClose}
                    />

                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="welcome-modal-title"
                        initial={{ opacity: 0, scale: 0.96, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96, y: 16 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className={styles.welcomeModalCard}
                    >
                        <button
                            type="button"
                            className={styles.welcomeModalCloseBtn}
                            onClick={onClose}
                            aria-label={intl.formatMessage({
                                id: 'common.close',
                                defaultMessage: 'Close',
                            })}
                        >
                            <X size={18} />
                        </button>

                        <div className={styles.welcomeModalIconBadge}>
                            <Sparkles size={22} />
                        </div>

                        <h2 id="welcome-modal-title" className={styles.welcomeModalTitle}>
                            <FormattedMessage id="onboarding.welcome.title" defaultMessage="Welcome to SubStreamEdu" />
                        </h2>

                        <p className={styles.welcomeModalDesc}>
                            <FormattedMessage
                                id="onboarding.welcome.desc"
                                defaultMessage="Learn how to use the app in 3 simple steps:"
                            />
                        </p>

                        <div className={styles.welcomeModalSteps}>
                            <div className={styles.welcomeModalStepItem}>
                                <div className={styles.welcomeModalStepIcon}>
                                    <Play size={15} />
                                </div>
                                <span className={styles.welcomeModalStepText}>
                                    <FormattedMessage id="onboarding.welcome.step1" defaultMessage="1. Watch the demo video" />
                                </span>
                            </div>

                            <div className={styles.welcomeModalStepItem}>
                                <div className={styles.welcomeModalStepIcon}>
                                    <MousePointer2 size={15} />
                                </div>
                                <span className={styles.welcomeModalStepText}>
                                    <FormattedMessage id="onboarding.welcome.step2" defaultMessage="2. Highlight an unknown word" />
                                </span>
                            </div>

                            <div className={styles.welcomeModalStepItem}>
                                <div className={styles.welcomeModalStepIcon}>
                                    <Bookmark size={15} />
                                </div>
                                <span className={styles.welcomeModalStepText}>
                                    <FormattedMessage id="onboarding.welcome.step3" defaultMessage="3. Save it to your dictionary" />
                                </span>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleStart}
                            className={styles.welcomeModalPrimaryBtn}
                        >
                            <FormattedMessage id="onboarding.welcome.startInteractive" defaultMessage="Start Interactive Demo" />
                            <ArrowRight size={15} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
