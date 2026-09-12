import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import OnboardingGuideBar from './OnboardingGuideBar';
import enMessages from '../../../locales/en.json';

jest.mock('lucide-react/dist/esm/icons/sparkles', () => () => <span data-testid="icon-sparkles" />);
jest.mock('lucide-react/dist/esm/icons/bookmark', () => () => <span data-testid="icon-bookmark" />);
jest.mock('lucide-react/dist/esm/icons/check', () => () => <span data-testid="icon-check" />);
jest.mock('lucide-react/dist/esm/icons/x', () => () => <span data-testid="icon-x" />);

describe('OnboardingGuideBar Component', () => {
    const renderComponent = (step: 1 | 2 | 'completed', onDismiss = jest.fn()) => {
        return render(
            <IntlProvider locale="en" messages={enMessages}>
                <OnboardingGuideBar step={step} onDismiss={onDismiss} />
            </IntlProvider>
        );
    };

    it('renders Step 1 with instructions to click/highlight a word', () => {
        renderComponent(1);
        expect(screen.getByTestId('onboarding-guide-bar')).toBeInTheDocument();
        expect(screen.getByText(/Step 1 of 2/i)).toBeInTheDocument();
        expect(screen.getByText(/highlight or click any word/i)).toBeInTheDocument();
    });

    it('renders Step 2 when step is 2', () => {
        renderComponent(2);
        expect(screen.getByText(/Step 2 of 2/i)).toBeInTheDocument();
        expect(screen.getByText(/«Save»/i)).toBeInTheDocument();
    });

    it('renders Completed state with Got it! button', () => {
        const onDismiss = jest.fn();
        renderComponent('completed', onDismiss);
        expect(screen.getByText(/First Phrase Saved!/i)).toBeInTheDocument();

        const gotItBtn = screen.getByText(/Got it!/i);
        fireEvent.click(gotItBtn);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('calls onDismiss when close button is clicked', () => {
        const onDismiss = jest.fn();
        renderComponent(1, onDismiss);
        const closeBtn = screen.getByTitle(/Dismiss guide/i);
        fireEvent.click(closeBtn);
        expect(onDismiss).toHaveBeenCalledTimes(1);
    });
});
