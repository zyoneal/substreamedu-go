import React from 'react';
import Check from 'lucide-react/dist/esm/icons/check';
import styles from '../styles/layout.module.css';

interface PlanProps {
    name: string;
    price: string;
    period: string;
    oldPrice?: string;
    features: string[];
    ctaText: string;
    ctaLink: string;
    highlight: boolean;
    badge?: string;
}

export const PlanCard: React.FC<PlanProps> = ({
    name,
    price,
    period,
    oldPrice,
    features,
    ctaText,
    ctaLink,
    highlight,
    badge
}) => {
    return (
        <div className={`${styles.card} ${highlight ? styles.highlight : ''}`}>
            {badge && (
                <div className={`${styles.badge} ${highlight ? styles.badgeHighlight : styles.badgeRegular}`}>
                    {badge}
                </div>
            )}

            <div className={styles.cardHeader}>
                <h3 className={styles.planName}>{name}</h3>
                <div className={styles.planPrice}>
                    {oldPrice && <span className={styles.oldPrice}>{oldPrice}</span>}
                    <span className={styles.priceValue}>{price}</span>
                    <span className={styles.pricePeriod}>{period}</span>
                </div>
            </div>

            <ul className={styles.features}>
                {features.map((feat, i) => (
                    <li key={i} className={styles.featureItem}>
                        <Check size={16} className={styles.check} strokeWidth={2.5} />
                        <span>{feat}</span>
                    </li>
                ))}
            </ul>

            <a
                href={ctaLink}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.button} ${highlight ? styles.buttonPrimary : styles.buttonSecondary}`}
            >
                {ctaText}
            </a>
        </div>
    );
};
