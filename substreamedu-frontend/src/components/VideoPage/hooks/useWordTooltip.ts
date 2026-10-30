import { useState, useEffect } from 'react';
import styles from '../css/VideoPlayerPopover.module.css';

export interface TooltipState {
    text: string;
    x: number;
    y: number;
}

const decodeHtmlEntities = (str: string): string => {
    if (!str) return '';
    const textarea = document.createElement('textarea');
    textarea.innerHTML = str;
    return textarea.value;
};

export const useWordTooltip = () => {
    const [tooltipState, setTooltipState] = useState<TooltipState | null>(null);

    useEffect(() => {
        const isDictionaryWordTarget = (target: HTMLElement | null): boolean => {
            if (!target) return false;
            // Match against module class or fallback string 'dictionaryWord'
            return (
                (styles.dictionaryWord && target.classList.contains(styles.dictionaryWord)) ||
                target.classList.contains('dictionaryWord')
            );
        };

        const updatePosition = (target: HTMLElement) => {
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

        const handleMouseOver = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (isDictionaryWordTarget(target)) {
                updatePosition(target);
            }
        };

        const handleMouseOut = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (isDictionaryWordTarget(target)) {
                setTooltipState(null);
            }
        };

        const handleMouseMove = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (isDictionaryWordTarget(target) && tooltipState) {
                updatePosition(target);
            }
        };

        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);
        document.addEventListener('mousemove', handleMouseMove);

        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
            document.removeEventListener('mousemove', handleMouseMove);
        };
    }, [tooltipState]);

    return {
        tooltipState,
        setTooltipState,
    };
};
