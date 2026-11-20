import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
    ExpandCard,
    EXPAND_PROGRESS_SPRING,
    EXPAND_DETAILS_SPRING,
    EXPAND_DETAILS_DELAY_MS,
} from './ExpandCard';

describe('ExpandCard', () => {
    it('preserves the exact spring parameters and detail delay from designbookmark expand.js', () => {
        expect(EXPAND_PROGRESS_SPRING).toEqual({ stiffness: 240, damping: 21 });
        expect(EXPAND_DETAILS_SPRING).toEqual({ stiffness: 260, damping: 28 });
        expect(EXPAND_DETAILS_DELAY_MS).toBe(160);
    });

    it('invokes onExpand when clicking collapsed card, but ignores clicks on nested buttons', () => {
        const onExpand = jest.fn();
        const onNestedClick = jest.fn();

        render(
            <ExpandCard
                expanded={false}
                onExpand={onExpand}
                summary={
                    <div>
                        <h2>finish or conclude something</h2>
                        <button type="button" onClick={onNestedClick}>
                            Audio
                        </button>
                    </div>
                }
                details={<p>wrap up</p>}
            />
        );

        expect(screen.queryByText('wrap up')).not.toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: 'Audio' }));
        expect(onNestedClick).toHaveBeenCalledTimes(1);
        expect(onExpand).not.toHaveBeenCalled();

        fireEvent.click(screen.getByText('finish or conclude something'));
        expect(onExpand).toHaveBeenCalledTimes(1);
    });

    it('animates details opacity and translateY after the 160ms stagger and settles cleanly', () => {
        jest.useFakeTimers();
        let now = 0;
        const rafCallbacks: FrameRequestCallback[] = [];
        const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            rafCallbacks.push(cb);
            return rafCallbacks.length;
        });
        const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
        const perfSpy = jest.spyOn(performance, 'now').mockImplementation(() => now);

        const { rerender, container } = render(
            <ExpandCard
                expanded={false}
                summary={<div>Front prompt</div>}
                details={<div>Revealed answer</div>}
            />
        );

        rerender(
            <ExpandCard
                expanded={true}
                summary={<div>Front prompt</div>}
                details={<div>Revealed answer</div>}
            />
        );

        const detailsEl = container.querySelector('.details') as HTMLElement;
        expect(detailsEl).toBeInTheDocument();
        expect(parseFloat(detailsEl.style.opacity)).toBe(0);

        // Before 160ms stagger, details opacity remains 0
        act(() => {
            jest.advanceTimersByTime(100);
            now += 16;
            const cb = rafCallbacks.shift();
            if (cb) cb(now);
        });
        expect(parseFloat(detailsEl.style.opacity)).toBe(0);

        // Trigger the 160ms detail reveal stagger and step frames until settled
        act(() => {
            jest.advanceTimersByTime(100);
            for (let i = 0; i < 200 && rafCallbacks.length > 0; i++) {
                now += 16;
                const cb = rafCallbacks.shift();
                if (cb) cb(now);
            }
        });

        expect(rafCallbacks.length).toBe(0);
        expect(parseFloat(detailsEl.style.opacity)).toBe(1);
        expect(detailsEl.style.transform).toBe('translateY(0.00px)');

        rafSpy.mockRestore();
        cancelSpy.mockRestore();
        perfSpy.mockRestore();
        jest.useRealTimers();
    });
});
