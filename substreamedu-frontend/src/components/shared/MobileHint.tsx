import React from 'react';
import { FormattedMessage, useIntl } from 'react-intl';
import styles from './MobileHint.module.css';
import { MobileHintProps, DEFAULT_MOBILE_HINT_KEYS } from './MobileHint.types';

const MobileHint: React.FC<MobileHintProps> = ({
    isVisible,
    onClose,
    steps,
    titleKey = DEFAULT_MOBILE_HINT_KEYS.TITLE,
    closeButtonKey = DEFAULT_MOBILE_HINT_KEYS.CLOSE_BUTTON
}) => {
    const intl = useIntl();

    if (!isVisible) return null;

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            onClose();
        }
    };

    return (
        <div
            className={styles.mobileHint}
            onClick={handleBackdropClick}
            onKeyDown={handleKeyDown}
            role="dialog"
            aria-modal="true"
            aria-labelledby="mobile-hint-title"
            tabIndex={-1}
        >
            <div className={styles.mobileHintContent}>
                <h3
                    id="mobile-hint-title"
                    className={styles.mobileHintTitle}
                >
                    {intl.formatMessage({ id: titleKey })}
                </h3>

                <ol className={styles.mobileHintList}>
                    {steps.map((step, index) => (
                        <li key={index} className={styles.mobileHintStep}>
                            <FormattedMessage
                                id={step.key}
                                values={{
                                    highlight: (chunks) => (
                                        <span className={styles.mobileHintHighlight}>
                                            {chunks}
                                        </span>
                                    ),
                                }}
                            />
                        </li>
                    ))}
                </ol>

                <button
                    className={styles.closeHintButton}
                    onClick={onClose}
                    autoFocus
                    aria-label={intl.formatMessage({ id: closeButtonKey })}
                >
                    {intl.formatMessage({ id: closeButtonKey })}
                </button>
            </div>
        </div>
    );
};

export default MobileHint;