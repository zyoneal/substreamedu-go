import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import {
    ToggleSwitch,
    TOGGLE_POSITION_SPRING,
    TOGGLE_STRETCH_SPRING,
    TOGGLE_STRETCH_KICK,
} from './ToggleSwitch';

describe('ToggleSwitch', () => {
    it('preserves the exact spring parameters from designbookmark tokens/switch.js', () => {
        expect(TOGGLE_POSITION_SPRING).toEqual({ stiffness: 320, damping: 18 });
        expect(TOGGLE_STRETCH_SPRING).toEqual({ stiffness: 300, damping: 20 });
        expect(TOGGLE_STRETCH_KICK).toBe(60);
    });

    it('renders accessible switch role, label, aria-checked, and invokes onChange', () => {
        const onChange = jest.fn();
        const { rerender } = render(
            <ToggleSwitch
                checked={false}
                onChange={onChange}
                label="Blur"
                ariaLabel="Toggle blur subtitles"
                size="sm"
            />
        );

        const sw = screen.getByRole('switch', { name: /toggle blur subtitles/i });
        expect(sw).toHaveAttribute('aria-checked', 'false');
        expect(sw).toHaveTextContent('Blur');

        fireEvent.click(sw);
        expect(onChange).toHaveBeenCalledWith(true);

        rerender(
            <ToggleSwitch
                checked={true}
                onChange={onChange}
                label="Blur"
                ariaLabel="Toggle blur subtitles"
                size="sm"
            />
        );
        expect(sw).toHaveAttribute('aria-checked', 'true');
    });

    it('animates knob width stretch and translation via requestAnimationFrame and settles cleanly', () => {
        let now = 0;
        const rafCallbacks: FrameRequestCallback[] = [];
        const rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            rafCallbacks.push(cb);
            return rafCallbacks.length;
        });
        const cancelSpy = jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
        const perfSpy = jest.spyOn(performance, 'now').mockImplementation(() => now);

        const { rerender, container } = render(
            <ToggleSwitch
                checked={false}
                onChange={jest.fn()}
                ariaLabel="Toggle 2x speed"
                size="md"
            />
        );

        const knob = container.querySelector('.knob') as HTMLElement;
        expect(knob.style.width).toBe('26.00px');
        expect(knob.style.transform).toBe('translateX(0.00px)');

        rerender(
            <ToggleSwitch
                checked={true}
                onChange={jest.fn()}
                ariaLabel="Toggle 2x speed"
                size="md"
            />
        );

        // Advance one frame (~16ms): knob should stretch wider than 26px during travel
        act(() => {
            now += 16;
            const cb = rafCallbacks.shift();
            if (cb) cb(now);
        });
        const midWidth = parseFloat(knob.style.width);
        expect(midWidth).toBeGreaterThan(26);

        // Step until settled
        act(() => {
            for (let i = 0; i < 180 && rafCallbacks.length > 0; i++) {
                now += 16;
                const cb = rafCallbacks.shift();
                if (cb) cb(now);
            }
        });

        expect(rafCallbacks.length).toBe(0);
        expect(knob.style.width).toBe('26.00px');
        expect(knob.style.transform).toBe('translateX(20.00px)');

        rafSpy.mockRestore();
        cancelSpy.mockRestore();
        perfSpy.mockRestore();
    });

    it('does not invoke onChange when disabled', () => {
        const onChange = jest.fn();
        render(
            <ToggleSwitch
                checked={false}
                onChange={onChange}
                ariaLabel="Disabled toggle"
                disabled
            />
        );

        fireEvent.click(screen.getByRole('switch', { name: /disabled toggle/i }));
        expect(onChange).not.toHaveBeenCalled();
    });
});
