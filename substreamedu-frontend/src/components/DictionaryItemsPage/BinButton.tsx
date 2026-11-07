import React from 'react';
import styles from './css/DictionaryItemsPage.module.css';

interface BinButtonProps {
    onClick: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    ariaLabel?: string;
    className?: string;
    disabled?: boolean;
}

const BinButton: React.FC<BinButtonProps> = ({ onClick, ariaLabel, className, disabled }) => (
    <button
        className={`${styles.binButton} ${className || ''}`}
        onClick={onClick}
        aria-label={ariaLabel}
        disabled={disabled}
        style={disabled ? { opacity: 0.4, pointerEvents: 'none' } : undefined}
    >
        <div className={styles.binIconWrapper}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={styles.binSvg}
            >
                <path d="M3 6h18" className={styles.binLidLine} />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" className={styles.binBody} />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" className={styles.binLidHandle} />
                <line x1="10" y1="11" x2="10" y2="17" className={styles.binLines} />
                <line x1="14" y1="11" x2="14" y2="17" className={styles.binLines} />
            </svg>
            <div className={styles.binParticles}>
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </button>
);

export default BinButton;