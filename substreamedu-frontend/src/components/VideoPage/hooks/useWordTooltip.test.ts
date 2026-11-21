import { renderHook, act } from '@testing-library/react';
import { useWordTooltip } from './useWordTooltip';

describe('useWordTooltip', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('initializes with null tooltipState', () => {
        const { result } = renderHook(() => useWordTooltip());
        expect(result.current.tooltipState).toBeNull();
    });

    it('sets tooltipState on mouseover over an element with dictionaryWord class and data-translation', () => {
        const { result } = renderHook(() => useWordTooltip());

        const el = document.createElement('span');
        el.className = 'dictionaryWord';
        el.setAttribute('data-translation', 'apple &amp; pie');
        el.textContent = 'apple';
        jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
            left: 100,
            top: 200,
            width: 50,
            height: 20,
            bottom: 220,
            right: 150,
            x: 100,
            y: 200,
            toJSON: () => {},
        });
        document.body.appendChild(el);

        act(() => {
            const event = new MouseEvent('mouseover', { bubbles: true });
            Object.defineProperty(event, 'target', { value: el, enumerable: true });
            document.dispatchEvent(event);
        });

        expect(result.current.tooltipState).toEqual({
            text: 'apple & pie',
            x: 125,
            y: 170,
        });
    });

    it('clears tooltipState on mouseout of dictionaryWord element', () => {
        const { result } = renderHook(() => useWordTooltip());

        const el = document.createElement('span');
        el.className = 'dictionaryWord';
        el.setAttribute('data-translation', 'test');
        el.textContent = 'word';
        document.body.appendChild(el);

        act(() => {
            const event = new MouseEvent('mouseover', { bubbles: true });
            Object.defineProperty(event, 'target', { value: el });
            document.dispatchEvent(event);
        });

        expect(result.current.tooltipState).not.toBeNull();

        act(() => {
            const outEvent = new MouseEvent('mouseout', { bubbles: true });
            Object.defineProperty(outEvent, 'target', { value: el });
            document.dispatchEvent(outEvent);
        });

        expect(result.current.tooltipState).toBeNull();
    });

    it('does not re-register listeners or call getBoundingClientRect on mousemove', () => {
        const addListenerSpy = jest.spyOn(document, 'addEventListener');
        const { result } = renderHook(() => useWordTooltip());

        const el = document.createElement('span');
        el.className = 'dictionaryWord';
        el.setAttribute('data-translation', 'привіт');
        el.textContent = 'hello';
        const rectSpy = jest.spyOn(el, 'getBoundingClientRect').mockReturnValue({
            left: 100,
            top: 200,
            width: 50,
            height: 20,
            bottom: 220,
            right: 150,
            x: 100,
            y: 200,
            toJSON: () => {},
        });
        document.body.appendChild(el);
        addListenerSpy.mockClear();

        act(() => {
            const overEvent = new MouseEvent('mouseover', { bubbles: true });
            Object.defineProperty(overEvent, 'target', { value: el });
            document.dispatchEvent(overEvent);
        });

        expect(result.current.tooltipState?.text).toBe('привіт');
        expect(rectSpy).toHaveBeenCalledTimes(1);

        act(() => {
            for (let i = 0; i < 10; i++) {
                const moveEvent = new MouseEvent('mousemove', { bubbles: true });
                Object.defineProperty(moveEvent, 'target', { value: el });
                document.dispatchEvent(moveEvent);
            }
        });

        expect(rectSpy).toHaveBeenCalledTimes(1);
        expect(addListenerSpy.mock.calls.filter(([evt]) => evt === 'mouseover' || evt === 'mousemove')).toHaveLength(0);
        addListenerSpy.mockRestore();
    });
});
