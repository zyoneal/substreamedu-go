import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ScrollToTop component
 * Ensures that on any route change, the viewport resets to the top of the new page (0, 0),
 * preventing the browser from retaining previous page scroll offsets.
 * Supports anchor hashes (e.g. #section-id).
 */
export const ScrollToTop: React.FC = () => {
    const { pathname, search, hash } = useLocation();

    useEffect(() => {
        // Disable automatic browser scroll restoration so browser does not override our reset
        if (typeof window !== 'undefined' && 'scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
    }, []);

    useEffect(() => {
        if (hash) {
            const element = document.getElementById(hash.replace('#', ''));
            if (element) {
                element.scrollIntoView({ behavior: 'smooth' });
                return;
            }
        }

        // Instant reset on route change
        window.scrollTo(0, 0);
        if (document.documentElement) {
            document.documentElement.scrollTop = 0;
        }
        if (document.body) {
            document.body.scrollTop = 0;
        }

        // Ensure reset on next paint frame in case of async layout/DOM updates
        const frameId = requestAnimationFrame(() => {
            window.scrollTo(0, 0);
            if (document.documentElement) {
                document.documentElement.scrollTop = 0;
            }
            if (document.body) {
                document.body.scrollTop = 0;
            }
        });

        return () => cancelAnimationFrame(frameId);
    }, [pathname, search, hash]);

    return null;
};

export default ScrollToTop;
