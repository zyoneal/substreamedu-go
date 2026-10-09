import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link } from 'react-router-dom';
import ScrollToTop from './ScrollToTop';

describe('ScrollToTop component', () => {
    beforeEach(() => {
        window.scrollTo = jest.fn();
        Object.defineProperty(window.history, 'scrollRestoration', {
            writable: true,
            value: 'auto'
        });
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('sets history.scrollRestoration to manual', () => {
        render(
            <MemoryRouter initialEntries={['/']}>
                <ScrollToTop />
            </MemoryRouter>
        );

        expect(window.history.scrollRestoration).toBe('manual');
    });

    it('calls window.scrollTo(0, 0) on mount and navigation', () => {
        render(
            <MemoryRouter initialEntries={['/page1', '/page2']} initialIndex={0}>
                <ScrollToTop />
                <Routes>
                    <Route path="/page1" element={<Link to="/page2">Go to Page 2</Link>} />
                    <Route path="/page2" element={<div>Page 2</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(window.scrollTo).toHaveBeenCalledWith(0, 0);
    });
});
