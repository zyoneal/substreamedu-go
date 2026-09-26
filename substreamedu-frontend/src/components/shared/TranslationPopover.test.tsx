import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { TranslationPopover } from './TranslationPopover';
import { INITIAL_TRANSLATION_DATA, TranslationData } from '../VideoPage/types';

jest.mock('lucide-react/dist/esm/icons/x', () => () => <span data-testid="icon-x" />);
jest.mock('lucide-react/dist/esm/icons/smartphone', () => () => <span data-testid="icon-smartphone" />);
jest.mock('lucide-react/dist/esm/icons/lightbulb', () => () => <span data-testid="icon-lightbulb" />);
jest.mock('lucide-react/dist/esm/icons/book-open', () => () => <span data-testid="icon-book-open" />);
jest.mock('lucide-react/dist/esm/icons/layers', () => () => <span data-testid="icon-layers" />);

describe('TranslationPopover Component', () => {
    const defaultPosition = { x: 100, y: 150 };
    const defaultTranslationData: TranslationData = {
        ...INITIAL_TRANSLATION_DATA,
        translation: 'привет',
        definition: 'used as a greeting',
        transcription: 'həˈloʊ',
    };

    const renderPopover = (props = {}) => {
        return render(
            <IntlProvider locale="en" messages={{}}>
                <TranslationPopover
                    selectionPosition={defaultPosition}
                    isPopoverOpen={true}
                    isLoading={false}
                    isMobile={false}
                    selectedText="hello"
                    translationData={defaultTranslationData}
                    translationOptions={[]}
                    isSaving={false}
                    showSubmitButton={true}
                    onSelectOption={jest.fn()}
                    onChunkClick={jest.fn()}
                    onSaveToDict={jest.fn()}
                    onClose={jest.fn()}
                    {...props}
                />
            </IntlProvider>
        );
    };

    it('returns null if isPopoverOpen is false or selectionPosition is null', () => {
        const { container: closedContainer } = render(
            <IntlProvider locale="en" messages={{}}>
                <TranslationPopover
                    selectionPosition={defaultPosition}
                    isPopoverOpen={false}
                    isLoading={false}
                    isMobile={false}
                    selectedText="hello"
                    translation="привет"
                    onClose={jest.fn()}
                />
            </IntlProvider>
        );
        expect(closedContainer).toBeEmptyDOMElement();

        const { container: noPosContainer } = render(
            <IntlProvider locale="en" messages={{}}>
                <TranslationPopover
                    selectionPosition={null}
                    isPopoverOpen={true}
                    isLoading={false}
                    isMobile={false}
                    selectedText="hello"
                    translation="привет"
                    onClose={jest.fn()}
                />
            </IntlProvider>
        );
        expect(noPosContainer).toBeEmptyDOMElement();
    });

    it('renders with flat translation props', () => {
        render(
            <IntlProvider locale="en" messages={{}}>
                <TranslationPopover
                    selectionPosition={defaultPosition}
                    isPopoverOpen={true}
                    isLoading={false}
                    selectedText="world"
                    translation="мир"
                    transcription="wɜːrld"
                    definition="the earth or globe"
                    onClose={jest.fn()}
                />
            </IntlProvider>
        );

        expect(screen.getByText('world')).toBeInTheDocument();
        expect(screen.getByText('мир')).toBeInTheDocument();
        expect(screen.getByText('[/wɜːrld/]')).toBeInTheDocument();
        expect(screen.getByText('the earth or globe')).toBeInTheDocument();
    });

    it('renders with structured translationData', () => {
        renderPopover();

        expect(screen.getByText('hello')).toBeInTheDocument();
        expect(screen.getByText('привет')).toBeInTheDocument();
        expect(screen.getByText('[/həˈloʊ/]')).toBeInTheDocument();
        expect(screen.getByText('used as a greeting')).toBeInTheDocument();
    });

    it('calls onSaveToDict when SAVE button is clicked', () => {
        const onSaveToDict = jest.fn();
        renderPopover({ onSaveToDict, showSubmitButton: true });

        const saveButton = screen.getByText('SAVE').closest('button');
        expect(saveButton).toBeInTheDocument();
        fireEvent.click(saveButton!);
        expect(onSaveToDict).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', () => {
        const onClose = jest.fn();
        renderPopover({ onClose });

        const closeButton = screen.getByTestId('icon-x').closest('button');
        expect(closeButton).toBeInTheDocument();
        fireEvent.click(closeButton!);
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('renders admin reel button and calls onOpenReelModal', () => {
        const onOpenReelModal = jest.fn();
        renderPopover({ isAdmin: true, onOpenReelModal });

        const reelButton = screen.getByRole('button', { name: /REEL/i });
        expect(reelButton).toBeInTheDocument();
        fireEvent.click(reelButton);
        expect(onOpenReelModal).toHaveBeenCalledTimes(1);
    });
});
