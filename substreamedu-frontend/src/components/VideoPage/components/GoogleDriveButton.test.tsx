import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { GoogleDriveButton } from './GoogleDriveButton';
import { GoogleDriveService } from '../../../services/GoogleDriveService';
import enMessages from '../../../locales/en.json';

jest.mock('lucide-react/dist/esm/icons/cloud', () => () => <span data-testid="icon-cloud" />);
jest.mock('lucide-react/dist/esm/icons/check', () => () => <span data-testid="icon-check" />);
jest.mock('lucide-react/dist/esm/icons/trash-2', () => () => <span data-testid="icon-trash" />);
jest.mock('lucide-react/dist/esm/icons/clipboard', () => () => <span data-testid="icon-clipboard" />);
jest.mock('lucide-react/dist/esm/icons/alert-triangle', () => () => <span data-testid="icon-alert" />);
jest.mock('lucide-react/dist/esm/icons/info', () => () => <span data-testid="icon-info" />);

describe('GoogleDriveService', () => {
    describe('extractFileId', () => {
        it('extracts file ID from standard /file/d/ URL', () => {
            const url = 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view?usp=sharing';
            expect(GoogleDriveService.extractFileId(url)).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs');
        });

        it('extracts file ID from /open?id= URL', () => {
            const url = 'https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs';
            expect(GoogleDriveService.extractFileId(url)).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs');
        });

        it('extracts file ID from /uc?id= URL', () => {
            const url = 'https://drive.google.com/uc?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs&export=download';
            expect(GoogleDriveService.extractFileId(url)).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs');
        });

        it('accepts raw 33-char alphanumeric Google Drive ID', () => {
            const id = '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs';
            expect(GoogleDriveService.extractFileId(id)).toBe('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs');
        });

        it('returns null for non-Google Drive URLs', () => {
            expect(GoogleDriveService.extractFileId('https://youtube.com/watch?v=12345')).toBeNull();
            expect(GoogleDriveService.extractFileId('not-a-url')).toBeNull();
        });
    });

    describe('getStreamingUrl', () => {
        it('does not produce a broken &key= URL when API_KEY is empty', () => {
            const url = GoogleDriveService.getStreamingUrl('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs');
            expect(url).not.toContain('&key=');
            expect(url).toContain('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs');
        });
    });
});

describe('GoogleDriveButton Component', () => {
    const renderComponent = (onFileSelected = jest.fn(), disabled = false) => {
        return render(
            <IntlProvider locale="en" messages={enMessages}>
                <GoogleDriveButton onFileSelected={onFileSelected} disabled={disabled} />
            </IntlProvider>
        );
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the Google Drive input and load button', () => {
        renderComponent();
        expect(screen.getByPlaceholderText(/drive\.google\.com/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /load video/i })).toBeInTheDocument();
    });

    it('handles direct Google Drive link input and invokes onFileSelected', async () => {
        const onFileSelected = jest.fn();
        renderComponent(onFileSelected);

        const input = screen.getByPlaceholderText(/drive\.google\.com/i);
        const loadButton = screen.getByRole('button', { name: /load video/i });

        fireEvent.change(input, {
            target: { value: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view' },
        });
        fireEvent.click(loadButton);

        await waitFor(() => {
            expect(onFileSelected).toHaveBeenCalledWith(
                '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
                'Google Drive Video'
            );
        });
    });

    it('submits on Enter keypress with a valid link', async () => {
        const onFileSelected = jest.fn();
        renderComponent(onFileSelected);

        const input = screen.getByPlaceholderText(/drive\.google\.com/i);

        fireEvent.change(input, {
            target: { value: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view' },
        });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

        await waitFor(() => {
            expect(onFileSelected).toHaveBeenCalledWith(
                '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs',
                'Google Drive Video'
            );
        });
    });

    it('disables the Load button when input is empty or invalid', () => {
        renderComponent();
        const loadButton = screen.getByRole('button', { name: /load video/i });
        expect(loadButton).toBeDisabled();

        const input = screen.getByPlaceholderText(/drive\.google\.com/i);
        fireEvent.change(input, {
            target: { value: 'https://invalid-url.com/movie.mp4' },
        });
        expect(loadButton).toBeDisabled();
    });

    it('clears input when clear button is clicked', () => {
        renderComponent();
        const input = screen.getByPlaceholderText(/drive\.google\.com/i) as HTMLInputElement;

        fireEvent.change(input, {
            target: { value: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view' },
        });
        expect(input.value).toBe('https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/view');

        const clearButton = screen.getByTitle('Clear input');
        fireEvent.click(clearButton);

        expect(input.value).toBe('');
    });
});
