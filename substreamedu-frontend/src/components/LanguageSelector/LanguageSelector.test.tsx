import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import LanguageSelector from './LanguageSelector';
import { getRecommendedLanguages, getSortedLanguages } from '../../utils/languageUtils';
import enMessages from '../../locales/en.json';

jest.mock('lucide-react/dist/esm/icons/chevron-down', () => () => <span data-testid="icon-chevron-down" />);

describe('LanguageSelector Component', () => {
    const renderComponent = (currentLanguage = '', onSelect = jest.fn()) => {
        return render(
            <IntlProvider locale="en" messages={enMessages}>
                <LanguageSelector
                    currentLanguage={currentLanguage}
                    onLanguageSelect={onSelect}
                    detectedRegion="US"
                />
            </IntlProvider>
        );
    };

    it('renders "Select language" when currentLanguage is empty', () => {
        renderComponent('');
        expect(screen.getByText('Select language')).toBeInTheDocument();
    });

    it('renders "Select language" even if currentLanguage is "en"', () => {
        renderComponent('en');
        expect(screen.getByText('Select language')).toBeInTheDocument();
        expect(screen.queryByText(/^en$/i)).not.toBeInTheDocument();
    });

    it('renders valid language label when currentLanguage is supported', () => {
        renderComponent('uk');
        expect(screen.getByText('Українська')).toBeInTheDocument();
    });

    it('never contains English in the dropdown options', () => {
        renderComponent('');
        fireEvent.click(screen.getByRole('button'));
        const options = screen.getAllByRole('option');
        const optionTexts = options.map(opt => opt.textContent);
        expect(optionTexts.some(text => text?.toLowerCase() === 'english' || text?.toLowerCase() === 'en')).toBe(false);
    });

    it('calls onLanguageSelect when a language is picked', () => {
        const handleSelect = jest.fn();
        renderComponent('', handleSelect);
        fireEvent.click(screen.getByRole('button'));
        const polishOption = screen.getAllByText('Polski')[0];
        fireEvent.click(polishOption);
        expect(handleSelect).toHaveBeenCalledWith('pl');
    });
});

describe('languageUtils', () => {
    it('never includes "en" in getRecommendedLanguages', () => {
        const recsUS = getRecommendedLanguages('en', 'US', 'en');
        expect(recsUS.some(l => l.code === 'en')).toBe(false);

        const recsGB = getRecommendedLanguages('en', 'GB', 'en');
        expect(recsGB.some(l => l.code === 'en')).toBe(false);
    });

    it('never includes "en" in getSortedLanguages', () => {
        const allLangs = getSortedLanguages('en', 'US', 'en');
        expect(allLangs.some(l => l.code === 'en')).toBe(false);
    });
});
