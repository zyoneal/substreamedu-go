import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import {
    SwipeDeck,
    DECK_DRAG_SPRING,
    DECK_RETURN_SPRING,
    DECK_DEPTH_SPRING,
    DECK_FLING_SPRING,
    DECK_THRESHOLD,
    DECK_VELOCITY_THRESHOLD,
} from './SwipeDeck';

describe('SwipeDeck', () => {
    it('preserves the exact spring parameters and thresholds from designbookmark tokens.css & deck.js', () => {
        expect(DECK_DRAG_SPRING).toEqual({ stiffness: 900, damping: 50 });
        expect(DECK_RETURN_SPRING).toEqual({ stiffness: 280, damping: 16 });
        expect(DECK_DEPTH_SPRING).toEqual({ stiffness: 260, damping: 22 });
        expect(DECK_FLING_SPRING).toEqual({ stiffness: 70, damping: 17 });
        expect(DECK_THRESHOLD).toBe(110);
        expect(DECK_VELOCITY_THRESHOLD).toBe(700);
    });

    it('invokes onSwipeRight when dragged past +110px and onSwipeLeft when dragged past -110px', () => {
        const onSwipeRight = jest.fn();
        const onSwipeLeft = jest.fn();

        const { container } = render(
            <SwipeDeck
                cardKey="card-1"
                upcomingCount={2}
                canSwipe={true}
                rightLabel="Good"
                leftLabel="Again"
                onSwipeRight={onSwipeRight}
                onSwipeLeft={onSwipeLeft}
            >
                <div>Active Flashcard</div>
            </SwipeDeck>
        );

        const topCard = container.querySelector('.topCard') as HTMLElement;
        expect(container.querySelectorAll('.backCard')).toHaveLength(2);
        expect(screen.getByText('Active Flashcard')).toBeInTheDocument();

        // Swipe right past threshold (+150px)
        fireEvent(topCard, new MouseEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 100 }));
        fireEvent(topCard, new MouseEvent('pointermove', { bubbles: true, clientX: 350, clientY: 100 }));
        fireEvent(topCard, new MouseEvent('pointerup', { bubbles: true, clientX: 350, clientY: 100 }));
        expect(onSwipeRight).toHaveBeenCalledTimes(1);
        expect(onSwipeLeft).not.toHaveBeenCalled();

        // Swipe left past threshold (-150px)
        fireEvent(topCard, new MouseEvent('pointerdown', { bubbles: true, clientX: 300, clientY: 100 }));
        fireEvent(topCard, new MouseEvent('pointermove', { bubbles: true, clientX: 150, clientY: 100 }));
        fireEvent(topCard, new MouseEvent('pointerup', { bubbles: true, clientX: 150, clientY: 100 }));
        expect(onSwipeLeft).toHaveBeenCalledTimes(1);
    });

    it('does not trigger swipe when released below threshold or when canSwipe is false', () => {
        let now = 1000;
        const perfSpy = jest.spyOn(performance, 'now').mockImplementation(() => now);
        const onSwipeRight = jest.fn();
        const onSwipeLeft = jest.fn();

        const { container, rerender } = render(
            <SwipeDeck
                cardKey="card-1"
                upcomingCount={1}
                canSwipe={true}
                onSwipeRight={onSwipeRight}
                onSwipeLeft={onSwipeLeft}
            >
                <div>Active Flashcard</div>
            </SwipeDeck>
        );

        const topCard = container.querySelector('.topCard') as HTMLElement;

        // Slow drag below 110px threshold (40px over 250ms = 160px/s < 700px/s) -> returns without rating
        fireEvent(topCard, new MouseEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 100 }));
        now += 250;
        fireEvent(topCard, new MouseEvent('pointermove', { bubbles: true, clientX: 240, clientY: 100 }));
        now += 50;
        fireEvent(topCard, new MouseEvent('pointerup', { bubbles: true, clientX: 240, clientY: 100 }));
        expect(onSwipeRight).not.toHaveBeenCalled();
        expect(onSwipeLeft).not.toHaveBeenCalled();

        // Locked (unrevealed card) -> ignores drag completely
        rerender(
            <SwipeDeck
                cardKey="card-2"
                upcomingCount={1}
                canSwipe={false}
                onSwipeRight={onSwipeRight}
                onSwipeLeft={onSwipeLeft}
            >
                <div>Unrevealed Flashcard</div>
            </SwipeDeck>
        );

        fireEvent(topCard, new MouseEvent('pointerdown', { bubbles: true, clientX: 200, clientY: 100 }));
        now += 50;
        fireEvent(topCard, new MouseEvent('pointermove', { bubbles: true, clientX: 400, clientY: 100 }));
        now += 50;
        fireEvent(topCard, new MouseEvent('pointerup', { bubbles: true, clientX: 400, clientY: 100 }));
        expect(onSwipeRight).not.toHaveBeenCalled();
        expect(onSwipeLeft).not.toHaveBeenCalled();

        perfSpy.mockRestore();
    });
});
