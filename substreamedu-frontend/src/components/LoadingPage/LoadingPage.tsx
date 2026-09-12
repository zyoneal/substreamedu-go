import React from 'react';
import styles from './css/LoadingPage.module.css';

const LoadingPage: React.FC = () => {
    return (
        <div className={styles.loadingContainer}>
            <div className={styles.logoWrapper}>
                <div className={styles.magicGlow}></div>
                <div className={styles.gradientOverlay}></div>
                <img
                    src="/loadingLogo.png"
                    alt="Loading Logo"
                    className={styles.logo}
                />
            </div>
            <div className={styles.loader}>
                <div className={styles.dot}></div>
                <div className={styles.dot}></div>
                <div className={styles.dot}></div>
            </div>
        </div>
    );
};

export default LoadingPage;