import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { TranslationOptionsGrid } from './TranslationOptionsGrid';
import { TranslationOption } from '../types';

jest.mock('lucide-react/dist/esm/icons/lightbulb', () => () => <span data-testid="icon-lightbulb" />);
jest.mock('lucide-react/dist/esm/icons/book-open', () => () => <span data-testid="icon-book-open" />);
jest.mock('lucide-react/dist/esm/icons/layers', () => () => <span data-testid="icon-layers" />);

describe('TranslationOptionsGrid Component', () => {
    const mockOptions: TranslationOption[] = [
        { text: 'run', definition: 'бежать', source: 'primary' },
        { text: 'operate', definition: 'управлять', source: 'alternative', register: 'formal', usageNote: 'machines' },
    ];

    it('renders best matching AI hint when sentence matches recommendedSelections', () => {
        render(
            <TranslationOptionsGrid
                currentTranslation="run"
                selectedSentence="I want to run a business"
                recommendedSelections={['run a business', 'business']}
                translationOptions={mockOptions}
                onSelectOption={jest.fn()}
                onChunkClick={jest.fn()}
            />
        );

        expect(screen.getByText('run a business')).toBeInTheDocument();
    });

    it('renders translation options pills and handles clicking an option', () => {
        const onSelectOption = jest.fn();
        render(
            <TranslationOptionsGrid
                currentTranslation="run"
                selectedSentence="I want to run"
                translationOptions={mockOptions}
                onSelectOption={onSelectOption}
                onChunkClick={jest.fn()}
            />
        );

        expect(screen.getByText('operate')).toBeInTheDocument();
        fireEvent.click(screen.getByText('operate'));
        expect(onSelectOption).toHaveBeenCalledWith(mockOptions[1]);
    });

    it('renders phrase chunks and invokes onChunkClick', () => {
        const onChunkClick = jest.fn();
        render(
            <TranslationOptionsGrid
                currentTranslation="run"
                translationOptions={[]}
                chunks={['run away', 'run over']}
                onSelectOption={jest.fn()}
                onChunkClick={onChunkClick}
            />
        );

        const chunkPill = screen.getByText('run away');
        expect(chunkPill).toBeInTheDocument();
        fireEvent.click(chunkPill);
        expect(onChunkClick).toHaveBeenCalledWith('run away');
    });

    it('renders synonyms, collocations, examples, and typical contexts', () => {
        render(
            <TranslationOptionsGrid
                currentTranslation="run"
                translationOptions={[]}
                synonyms={['sprint', 'jog']}
                collocations={['run fast']}
                examples={['She runs every morning.']}
                typicalContexts={['Sports', 'Daily life']}
                onSelectOption={jest.fn()}
                onChunkClick={jest.fn()}
            />
        );

        expect(screen.getByText('sprint')).toBeInTheDocument();
        expect(screen.getByText('run fast')).toBeInTheDocument();
        expect(screen.getByText('"She runs every morning."')).toBeInTheDocument();
        expect(screen.getByText('Sports')).toBeInTheDocument();
    });
});
