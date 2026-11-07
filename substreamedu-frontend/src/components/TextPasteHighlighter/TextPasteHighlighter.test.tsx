import React from 'react';
import { render, screen } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TextPasteHighlighter from './TextPasteHighlighter';
import { LanguageContext } from '../LanguageContext';
import enMessages from '../../locales/en.json';

jest.mock('../../services/DictionaryService', () => ({
    DictionaryService: {
        fetchDictionaryItemsByUser: jest.fn().mockResolvedValue([]),
    },
}));

jest.mock('../../services/AuthService', () => ({
    AuthService: {
        getUserEmail: jest.fn().mockReturnValue(null),
    },
}));

jest.mock('../../services/SubtitleService', () => ({
    SubtitleService: {
        getTranslationProd: jest.fn(),
        generateTextByLevel: jest.fn(),
    },
}));

jest.mock('../ui/modal', () => ({
    Modal: Object.assign(
        ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => (isOpen ? <div>{children}</div> : null),
        {
            Header: ({ title }: { title: string }) => <div>{title}</div>,
            Body: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
            Footer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
        }
    ),
    ConfirmModal: () => null,
}));

jest.mock('../shared/TranslationPopover', () => ({
    TranslationPopover: () => null,
}));

describe('TextPasteHighlighter Pixzen Monochrome Editorial Redesign', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        document.body.classList.remove('pixzen');
    });

    it('activates body.pixzen, renders .pixzenGrain, AI CEFR level buttons, and studio editor canvas', () => {
        const queryClient = new QueryClient({
            defaultOptions: {
                queries: { retry: false },
            },
        });

        render(
            <QueryClientProvider client={queryClient}>
                <IntlProvider locale="en" messages={enMessages}>
                    <LanguageContext.Provider
                        value={{
                            fluentLanguage: 'uk',
                            setFluentLanguage: jest.fn(),
                            learningLanguage: 'en',
                            setLearningLanguage: jest.fn(),
                            isPlayerActive: false,
                            setIsPlayerActive: jest.fn(),
                        }}
                    >
                        <TextPasteHighlighter />
                    </LanguageContext.Provider>
                </IntlProvider>
            </QueryClientProvider>
        );

        expect(document.body.classList.contains('pixzen')).toBe(true);
        expect(document.querySelector('.pixzenGrain')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /learn from text/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'A1' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'C1' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /paste from clipboard/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /clear text/i })).toBeDisabled();
        expect(screen.getByRole('textbox', { name: /text to study/i })).toBeInTheDocument();
    });
});
