import React, { useEffect } from 'react';
import { useIntl } from 'react-intl';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Bookmark from 'lucide-react/dist/esm/icons/bookmark';
import Check from 'lucide-react/dist/esm/icons/check';
import X from 'lucide-react/dist/esm/icons/x';
import styles from './OnboardingGuideBar.module.css';

export type OnboardingStep = 1 | 2 | 'completed';

interface OnboardingGuideBarProps {
    step: OnboardingStep;
    onDismiss: () => void;
}

export const OnboardingGuideBar: React.FC<OnboardingGuideBarProps> = ({
    step,
    onDismiss
}) => {
    const intl = useIntl();

    useEffect(() => {
        if (step === 'completed') {
            const timer = setTimeout(() => {
                onDismiss();
            }, 6000);
            return () => clearTimeout(timer);
        }
    }, [step, onDismiss]);

    return (
        <aside 
            className={styles.guideBarContainer} 
            data-testid="onboarding-guide-bar"
            aria-label="Interactive learning guide"
        >
            <div className={`${styles.guideCard} ${step === 2 ? styles.step2 : ''} ${step === 'completed' ? styles.completed : ''}`}>
                <div className={styles.leftGroup}>
                    <div className={styles.stepIndicators} aria-hidden="true">
                        <div
                            className={`${styles.stepCircle} ${
                                step === 1
                                    ? styles.stepCircleActive
                                    : styles.stepCircleDone
                            }`}
                        >
                            {step === 1 ? '1' : <Check size={13} strokeWidth={3} />}
                        </div>
                        <div
                            className={`${styles.stepConnector} ${
                                step !== 1 ? styles.stepConnectorDone : ''
                            }`}
                        />
                        <div
                            className={`${styles.stepCircle} ${
                                step === 2
                                    ? styles.stepCircleActive
                                    : step === 'completed'
                                    ? styles.stepCircleDone
                                    : ''
                            }`}
                        >
                            {step === 'completed' ? <Check size={13} strokeWidth={3} /> : '2'}
                        </div>
                    </div>

                    <div className={styles.contentBlock}>
                        <div className={styles.stepBadgeRow}>
                            {step === 1 && (
                                <>
                                    <Sparkles size={13} className={styles.stepBadge} />
                                    <span className={styles.stepBadge}>
                                        {intl.formatMessage({
                                            id: 'onboarding.step1Title',
                                            defaultMessage: 'Step 1 of 2: Click to Translate'
                                        })}
                                    </span>
                                </>
                            )}
                            {step === 2 && (
                                <>
                                    <Bookmark size={13} className={styles.stepBadge} />
                                    <span className={styles.stepBadge}>
                                        {intl.formatMessage({
                                            id: 'onboarding.step2Title',
                                            defaultMessage: 'Step 2 of 2: Save to Dictionary'
                                        })}
                                    </span>
                                </>
                            )}
                            {step === 'completed' && (
                                <span className={`${styles.stepBadge} ${styles.completedBadge} flex items-center gap-1.5`}>
                                    <Sparkles size={14} className="text-primary shrink-0" />
                                    {intl.formatMessage({
                                        id: 'onboarding.completedTitle',
                                        defaultMessage: 'First Phrase Saved!'
                                    })}
                                </span>
                            )}
                        </div>

                        <p className={styles.hintText}>
                            {step === 1 && (
                                <>
                                    {intl.formatMessage({
                                        id: 'onboarding.step1Desc1',
                                        defaultMessage: 'Try it now: '
                                    })}
                                    <strong className={styles.highlightHint}>
                                        {intl.formatMessage({
                                            id: 'onboarding.step1Desc2',
                                            defaultMessage: 'highlight or click any word'
                                        })}
                                    </strong>
                                    {intl.formatMessage({
                                        id: 'onboarding.step1Desc3',
                                        defaultMessage: ' in the subtitles above to see its instant translation.'
                                    })}
                                </>
                            )}
                            {step === 2 && (
                                <>
                                    {intl.formatMessage({
                                        id: 'onboarding.step2Desc1',
                                        defaultMessage: 'Awesome! Now click '
                                    })}
                                    <strong className={styles.highlightHint}>
                                        {intl.formatMessage({
                                            id: 'onboarding.step2Desc2',
                                            defaultMessage: '«Save»'
                                        })}
                                    </strong>
                                    {intl.formatMessage({
                                        id: 'onboarding.step2Desc3',
                                        defaultMessage: ' in the popup to add it to your personal SRS dictionary.'
                                    })}
                                </>
                            )}
                            {step === 'completed' && (
                                <>
                                    {intl.formatMessage({
                                        id: 'onboarding.completedDesc1',
                                        defaultMessage: 'Great job! This phrase is now added to your '
                                    })}
                                    <strong className={styles.highlightHintSuccess}>
                                        {intl.formatMessage({
                                            id: 'onboarding.completedDesc2',
                                            defaultMessage: 'spaced repetition deck'
                                        })}
                                    </strong>
                                    {intl.formatMessage({
                                        id: 'onboarding.completedDesc3',
                                        defaultMessage: ' for smart review!'
                                    })}
                                </>
                            )}
                        </p>
                    </div>
                </div>

                <div className={styles.rightGroup}>
                    {step === 'completed' && (
                        <button
                            type="button"
                            className={styles.actionButton}
                            onClick={onDismiss}
                        >
                            {intl.formatMessage({
                                id: 'onboarding.gotIt',
                                defaultMessage: 'Got it!'
                            })}
                        </button>
                    )}
                    <button
                        type="button"
                        className={styles.closeButton}
                        onClick={onDismiss}
                        aria-label={intl.formatMessage({
                            id: 'common.close',
                            defaultMessage: 'Close'
                        })}
                        title="Dismiss guide"
                    >
                        <X size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
};

export default OnboardingGuideBar;
