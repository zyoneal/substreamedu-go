import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { GoogleDriveButton } from './GoogleDriveButton';
import { GoogleDriveService } from '../../../services/GoogleDriveService';
import enMessages from '../../../locales/en.json';

jest.mock('lucide-react/dist/esm/icons/cloud', () => () => <span data-testid="icon-cloud" />);
jest.mock('lucide-react/dist/esm/icons/check', () => () => <span data-testid="icon-check" />);
jest.mock('lucide-react/dist/esm/icons/loader-2', () => () => <span data-testid="icon-loader" />);
jest.mock('lucide-react/dist/esm/icons/alert-triangle', () => () => <span data-testid="icon-alert" />);
jest.mock('lucide-react/dist/esm/icons/link', () => () => <span data-testid="icon-link" />);
jest.mock('lucide-react/dist/esm/icons/arrow-right', () => () => <span data-testid="icon-arrow-right" />);
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

    it('renders the Google Drive button and link input', () => {
        renderComponent();
        expect(screen.getByRole('button', { name: /select from google drive/i })).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/paste google drive video link/i)).toBeInTheDocument();
    });

    it('handles direct Google Drive link input and invokes onFileSelected', async () => {
        const onFileSelected = jest.fn();
        renderComponent(onFileSelected);

        const input = screen.getByPlaceholderText(/paste google drive video link/i);
        const loadButton = screen.getByRole('button', { name: /load/i });

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

    it('displays error when invalid Google Drive link is submitted', async () => {
        const onFileSelected = jest.fn();
        renderComponent(onFileSelected);

        const input = screen.getByPlaceholderText(/paste google drive video link/i);
        const loadButton = screen.getByRole('button', { name: /load/i });

        fireEvent.change(input, {
            target: { value: 'https://invalid-link.com/video.mp4' },
        });
        fireEvent.click(loadButton);

        await waitFor(() => {
            expect(screen.getByText(/please enter a valid google drive video link/i)).toBeInTheDocument();
            expect(onFileSelected).not.toHaveBeenCalled();
        });
    });

    it('handles Google Drive button click and shows error gracefully if Picker fails or is unconfigured', async () => {
        jest.spyOn(GoogleDriveService, 'selectVideoFile').mockRejectedValue(new Error('Google Picker API not loaded'));

        const onFileSelected = jest.fn();
        renderComponent(onFileSelected);

        const button = screen.getByRole('button', { name: /select from google drive/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(screen.getByText(/failed to access google drive/i)).toBeInTheDocument();
        });
    });

    it('invokes onFileSelected when selectVideoFile resolves with a file', async () => {
        jest.spyOn(GoogleDriveService, 'selectVideoFile').mockResolvedValue({
            id: 'mock-file-123',
            name: 'test-movie.mp4',
            mimeType: 'video/mp4',
        });

        const onFileSelected = jest.fn();
        renderComponent(onFileSelected);

        const button = screen.getByRole('button', { name: /select from google drive/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(onFileSelected).toHaveBeenCalledWith('mock-file-123', 'test-movie.mp4');
        });
    });
});
