import React from 'react';
import { useIntl } from 'react-intl';
import { X } from 'lucide-react';
import { usePromo } from '../hooks/usePromo';
import styles from '../styles/layout.module.css';

export const PromoSection: React.FC = () => {
    const intl = useIntl();
    const { promoCode, setPromoCode, status, message, applyPromo, resetStatus } = usePromo();

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            applyPromo();
        }
    };

    const placeholderText = intl.formatMessage({
        id: 'paymentPage.promo.placeholder',
        defaultMessage: 'Enter promo code',
    });

    return (
        <div className={styles.promoWrapper}>
            <div className={styles.promoContainer}>
                <div className={styles.promoInputWrapper}>
                    <input
                        className={`${styles.promoInput} ${status === 'error' ? styles.error : ''} ${
                            status === 'success' ? styles.success : ''
                        }`}
                        placeholder={placeholderText}
                        aria-label={placeholderText}
                        value={promoCode}
                        onChange={(e) => {
                            setPromoCode(e.target.value);
                            resetStatus();
                        }}
                        onKeyDown={handleKeyDown}
                        disabled={status === 'loading'}
                    />
                    {promoCode && (
                        <button
                            type="button"
                            className={styles.promoClearButton}
                            onClick={() => {
                                setPromoCode('');
                                resetStatus();
                            }}
                            aria-label="Clear promo code"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>
                <button
                    type="button"
                    className={styles.promoButton}
                    onClick={applyPromo}
                    disabled={status === 'loading'}
                >
                    {status === 'loading'
                        ? '...'
                        : intl.formatMessage({ id: 'paymentPage.promo.apply', defaultMessage: 'Apply' })}
                </button>
            </div>
            {message && (
                <div className={`${styles.message} ${status === 'success' ? styles.success : styles.error}`}>
                    {message}
                </div>
            )}
        </div>
    );
};
