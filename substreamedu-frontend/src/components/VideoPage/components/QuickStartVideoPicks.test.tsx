import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import QuickStartVideoPicks, { CURATED_DEMO_VIDEOS } from './QuickStartVideoPicks';
import enMessages from '../../../locales/en.json';

jest.mock('lucide-react/dist/esm/icons/play', () => () => <span data-testid="icon-play" />);
jest.mock('lucide-react/dist/esm/icons/sparkles', () => () => <span data-testid="icon-sparkles" />);
jest.mock('lucide-react/dist/esm/icons/zap', () => () => <span data-testid="icon-zap" />);
jest.mock('lucide-react/dist/esm/icons/loader-2', () => () => <span data-testid="icon-loader-2" />);

describe('QuickStartVideoPicks Component', () => {
    const renderComponent = (onSelect = jest.fn(), disabled = false) => {
        return render(
            <IntlProvider locale="en" messages={enMessages}>
                <QuickStartVideoPicks onSelectVideo={onSelect} disabled={disabled} />
            </IntlProvider>
        );
    };

    it('renders all 4 curated video cards', () => {
        renderComponent();
        expect(screen.getByTestId('quick-start-video-picks')).toBeInTheDocument();
        expect(screen.getByText('4+ Hours of English Comprehensible Input')).toBeInTheDocument();
        expect(screen.getByText('150 Phrasal Verbs! Mega English Lesson!')).toBeInTheDocument();
        expect(screen.getByText('3 Hour Masterclass: Fluency, Pronunciation & Grammar')).toBeInTheDocument();
        expect(screen.getByText('BBC 6 Minute English: 1-Hour Lifestyle Mega-Class')).toBeInTheDocument();
    });

    it('triggers onSelectVideo with correct URL when a card is clicked', () => {
        const handleSelect = jest.fn();
        renderComponent(handleSelect);

        const firstCard = screen.getByText('4+ Hours of English Comprehensible Input').closest('button');
        expect(firstCard).toBeInTheDocument();

        if (firstCard) {
            fireEvent.click(firstCard);
            expect(handleSelect).toHaveBeenCalledWith(
                CURATED_DEMO_VIDEOS[0].url,
                CURATED_DEMO_VIDEOS[0].title,
                CURATED_DEMO_VIDEOS[0].thumbnailUrl
            );
        }
    });

    it('does not trigger onSelectVideo when disabled is true', () => {
        const handleSelect = jest.fn();
        renderComponent(handleSelect, true);

        const card = screen.getByText('4+ Hours of English Comprehensible Input').closest('button');
        if (card) {
            fireEvent.click(card);
            expect(handleSelect).not.toHaveBeenCalled();
        }
    });
});
