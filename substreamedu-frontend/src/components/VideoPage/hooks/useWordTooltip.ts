import { useState, useEffect } from 'react';
import styles from '../css/VideoPlayerPopover.module.css';

export interface TooltipState {
    text: string;
    x: number;
    y: number;
}

const HTML_ENTITY_MAP: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#39;': "'",
};

const decodeHtmlEntities = (str: string): string => {
    if (!str || !str.includes('&')) return str;
    return str.replace(/&(amp|lt|gt|quot|#x27|#39);/g, (entity) => HTML_ENTITY_MAP[entity] ?? entity);
};

export const useWordTooltip = () => {
    const [tooltipState, setTooltipState] = useState<TooltipState | null>(null);

    useEffect(() => {
        let activeTarget: HTMLElement | null = null;

        const isDictionaryWordTarget = (target: HTMLElement | null): boolean => {
            if (!target) return false;
            return (
                (Boolean(styles.dictionaryWord) && target.classList.contains(styles.dictionaryWord)) ||
                target.classList.contains('dictionaryWord')
            );
        };

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (!isDictionaryWordTarget(target) || !target || activeTarget === target) {
                return;
            }
            activeTarget = target;

            const translationRaw = target.getAttribute('data-translation');
            const translation = translationRaw ? decodeHtmlEntities(translationRaw).trim() : '';
            const word = target.textContent;

            if (word && translation) {
                const rect = target.getBoundingClientRect();
                setTooltipState({
                    text: translation,
                    x: rect.left + rect.width / 2,
                    y: rect.top - 30,
                });
            }
        };

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement | null;
            if (isDictionaryWordTarget(target)) {
                activeTarget = null;
                setTooltipState(null);
            }
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);

        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
        };
    }, []);

    return {
        tooltipState,
        setTooltipState,
    };
};
