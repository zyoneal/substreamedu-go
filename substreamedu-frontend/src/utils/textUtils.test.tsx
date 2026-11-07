import React from 'react';
import { render } from '@testing-library/react';
import { parseDoTags } from './textUtils';

describe('parseDoTags', () => {
    it('returns empty array when input is empty', () => {
        expect(parseDoTags('')).toEqual([]);
    });

    it('returns array with plain string when no <do> tags exist', () => {
        const result = parseDoTags('Plain text without tags');
        expect(result).toEqual(['Plain text without tags']);
    });

    it('parses single <do> tag into a span with accent class', () => {
        const result = parseDoTags('Choose your <do>learning</do> format', 'custom-accent');
        expect(result).toHaveLength(3);
        expect(result[0]).toBe('Choose your ');
        expect(result[2]).toBe(' format');

        const { container } = render(<div>{result}</div>);
        const span = container.querySelector('span.custom-accent');
        expect(span).not.toBeNull();
        expect(span?.textContent).toBe('learning');
    });

    it('handles multiple <do> tags in a single message', () => {
        const result = parseDoTags('Watch <do>videos</do> and read <do>books</do>!', 'accent');
        const { container } = render(<div>{result}</div>);
        const spans = container.querySelectorAll('span.accent');
        expect(spans).toHaveLength(2);
        expect(spans[0].textContent).toBe('videos');
        expect(spans[1].textContent).toBe('books');
    });

    it('works without passing an accent class name', () => {
        const result = parseDoTags('Only <do>accented</do>');
        const { container } = render(<div>{result}</div>);
        const span = container.querySelector('span');
        expect(span).not.toBeNull();
        expect(span?.className).toBe('');
        expect(span?.textContent).toBe('accented');
    });
});
