import { useEffect } from 'react';

export interface UseFlashcardsKeyboardOptions {
    enabled: boolean;
    currentIndex: number;
    totalCards: number;
    revealLevel: 0 | 1 | 2 | 3;
    currentCard?: {
        id: number;
        definition?: string | null;
        translatedText?: string | null;
    } | null;
    isInFlight: boolean;
    onPrevCard: () => void;
    onNextCard: () => void;
    onRevealNext: () => void;
    onRateAgain: () => void;
    onRateGood: () => void;
}

/**
 * Encapsulates keyboard shortcuts for reviewing flashcards.
 * Supports Left/Right navigation, Space/Enter reveal progression, and 1/2 SRS ratings.
 */
export const useFlashcardsKeyboard = ({
    enabled,
    currentIndex,
    totalCards,
    revealLevel,
    currentCard,
    isInFlight,
    onPrevCard,
    onNextCard,
    onRevealNext,
    onRateAgain,
    onRateGood,
}: UseFlashcardsKeyboardOptions): void => {
    useEffect(() => {
        if (!enabled || isInFlight || !currentCard) return;

        const hasDef = Boolean(currentCard.definition && currentCard.definition.trim());
        const hasTrans = Boolean(currentCard.translatedText && currentCard.translatedText.trim());
        const maxLevel = hasDef ? (hasTrans ? 3 : 2) : (hasTrans ? 2 : 1);

        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.repeat) return;

            switch (event.key) {
                case 'ArrowLeft':
                    event.preventDefault();
                    if (currentIndex > 0) onPrevCard();
                    break;
                case 'ArrowRight':
                    event.preventDefault();
                    if (currentIndex < totalCards - 1) onNextCard();
                    break;
                case ' ':
                case 'Enter':
                    event.preventDefault();
                    if (revealLevel < maxLevel) {
                        onRevealNext();
                    }
                    break;
                case '1':
                    event.preventDefault();
                    if (revealLevel >= maxLevel) {
                        onRateAgain();
                    }
                    break;
                case '2':
                    event.preventDefault();
                    if (revealLevel >= maxLevel) {
                        onRateGood();
                    }
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyPress);
        return () => window.removeEventListener('keydown', handleKeyPress);
    }, [
        enabled,
        currentIndex,
        totalCards,
        revealLevel,
        currentCard,
        isInFlight,
        onPrevCard,
        onNextCard,
        onRevealNext,
        onRateAgain,
        onRateGood,
    ]);
};
