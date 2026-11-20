import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DictionaryWordCard } from './DictionaryWordCard';
import { DictionaryItem } from '../utils/dictionaryUtils';

const baseWord: DictionaryItem = {
    id: 42,
    resourceName: 'Bee.Movie.2007.srt',
    highlightedText: 'stem',
    translatedText: 'стебель',
    definition: 'the main stalk of a plant',
    context: 'Pound those petunias, you striped stem-suckers!',
    note: null,
    imageUrl: null,
    transcription: '/stɛm/',
    reviewCount: 0,
    mastered: false,
};

describe('DictionaryWordCard', () => {
    it('renders editorial word row with headword, transcription, meaning, context, source and actions', () => {
        const onEdit = jest.fn();
        const onDelete = jest.fn();
        const onListen = jest.fn();

        render(
            <MemoryRouter>
                <DictionaryWordCard
                    word={baseWord}
                    index={0}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onListen={onListen}
                />
            </MemoryRouter>
        );

        expect(screen.getByRole('article')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /listen to pronunciation/i })).toHaveTextContent('stem');
        expect(screen.getByText('[stɛm]')).toBeInTheDocument();
        expect(screen.getByText('the main stalk of a plant')).toBeInTheDocument();
        expect(screen.getByText('стебель')).toBeInTheDocument();
        expect(screen.getByText(/Pound those petunias/i)).toBeInTheDocument();
        expect(screen.getByText('Bee.Movie.2007.srt')).toBeInTheDocument();
        expect(screen.getByText('New')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /listen to pronunciation/i }));
        expect(onListen).toHaveBeenCalledWith('stem');

        fireEvent.click(screen.getByRole('button', { name: /edit word/i }));
        expect(onEdit).toHaveBeenCalledWith(baseWord);

        fireEvent.click(screen.getByRole('button', { name: /delete word/i }));
        expect(onDelete).toHaveBeenCalledWith('Bee.Movie.2007.srt', 42);
    });

    it('renders mastery state, personal note, tags and video timestamp link when present', () => {
        const enrichedWord: DictionaryItem = {
            ...baseWord,
            mastered: true,
            note: 'Think of a flower stem',
            tags: ['nature', 'idiom'],
            resourceName: 'yt:abc123',
            timestampSec: 95,
        };

        render(
            <MemoryRouter>
                <DictionaryWordCard
                    word={enrichedWord}
                    index={1}
                    onEdit={jest.fn()}
                    onDelete={jest.fn()}
                    onListen={jest.fn()}
                />
            </MemoryRouter>
        );

        expect(screen.getByText('Mastered')).toBeInTheDocument();
        expect(screen.getByText('Think of a flower stem')).toBeInTheDocument();
        expect(screen.getByText('#nature')).toBeInTheDocument();
        expect(screen.getByText('#idiom')).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /jump to 1:35 in video/i })).toBeInTheDocument();
    });
});
