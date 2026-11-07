import React from 'react';
import styles from './pixzen.module.css';

export interface MarqueeItem {
  label: string;
  icon?: React.ReactNode;
}

interface BrandMarqueeProps {
  items: readonly MarqueeItem[];
  /** `muted` = small sources strip (grayscale, pauses on hover); `display` = massive uppercase values band. */
  variant?: 'muted' | 'display';
  ariaLabel: string;
}

const BrandMarquee: React.FC<BrandMarqueeProps> = ({ items, variant = 'muted', ariaLabel }) => {
  const rowClass = `${styles.marqueeRow} ${variant === 'display' ? styles.marqueeDisplay : styles.marqueeMuted}`;
  const renderGroup = (suffix: string, hidden: boolean): React.ReactNode => (
    <ul className={styles.marqueeGroup} aria-hidden={hidden || undefined}>
      {items.map((item) => (
        <li key={`${suffix}-${item.label}`} className={styles.marqueeItem}>
          {item.icon}
          <span>{item.label}</span>
          {variant === 'display' && <span className={styles.marqueeDash}>—</span>}
        </li>
      ))}
    </ul>
  );

  return (
    <div className={styles.marquee} role="group" aria-label={ariaLabel}>
      <div className={rowClass}>
        {renderGroup('a', false)}
        {renderGroup('b', true)}
      </div>
    </div>
  );
};

export default BrandMarquee;
