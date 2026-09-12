import React from 'react';
import styles from './css/TiktokPage.module.css';
import { Link } from 'react-router-dom';

const TiktokPage: React.FC = () => {
    return (
        <div className={styles.container}>
            <div className={styles.card}>
                <div className={styles.iconContainer}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.icon}>
                        <circle cx="12" cy="12" r="1"></circle>
                        <circle cx="12" cy="5" r="1"></circle>
                        <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                </div>
                <h1 className={styles.title}>For a better experience</h1>
                <p className={styles.instructions}>
                    Please open this page in your browser.
                </p>
                <p className={styles.instructions}>
                    Click on the three dots in the upper right corner of the screen and select "Open in browser" for a better service experience.
                </p>
                <p className={styles.instructions}>
                    After you switch to the browser, click the button below.
                </p>
                <Link to="/" className={styles.continueButton}>
                    Continue to site
                </Link>
                <p className={styles.ps}>
                    P.S. For the best experience, use the site from a computer or laptop at <a href="https://substreamedu.com" target="_blank" rel="noopener noreferrer" className={styles.link}>substreamedu.com</a>.
                </p>
            </div>
        </div>
    );
};

export default TiktokPage;