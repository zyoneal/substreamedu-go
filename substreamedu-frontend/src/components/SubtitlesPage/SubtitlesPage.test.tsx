import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { MemoryRouter } from 'react-router-dom';
import SubtitlesPage from './SubtitlesPage';
import { SubtitleService } from '../../services/SubtitleService';
import { AuthService } from '../../services/AuthService';

jest.mock('../../services/SubtitleService', () => ({
    SubtitleService: {
        fetchAllSubtitles: jest.fn(),
        uploadSubtitles: jest.fn(),
        deleteSubtitlesByName: jest.fn(),
    },
}));

jest.mock('../../services/AuthService', () => ({
    AuthService: {
        getUserEmail: jest.fn(),
    },
}));

describe('SubtitlesPage (Pixzen Monochrome Editorial)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        document.body.classList.remove('pixzen');
    });

    it('activates body.pixzen theme, renders .pixzenGrain, subtitle files, and filters with frameless clear button', async () => {
        (AuthService.getUserEmail as jest.Mock).mockReturnValue('learner@substreamedu.com');
        (SubtitleService.fetchAllSubtitles as jest.Mock).mockResolvedValue([
            { name: 'Inception_2010.srt' },
            { name: 'Interstellar_2014.vtt' },
        ]);

        const { container } = render(
            <MemoryRouter>
                <IntlProvider locale="en" messages={{}}>
                    <SubtitlesPage />
                </IntlProvider>
            </MemoryRouter>
        );

        expect(document.body.classList.contains('pixzen')).toBe(true);
        expect(container.querySelector('.pixzenGrain')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /my subtitles/i })).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.getByText('Inception_2010.srt')).toBeInTheDocument();
        });
        expect(screen.getByText('Interstellar_2014.vtt')).toBeInTheDocument();
        expect(screen.getByText('2 files')).toBeInTheDocument();

        const searchInput = screen.getByPlaceholderText(/search subtitle by name/i) as HTMLInputElement;
        fireEvent.change(searchInput, { target: { value: 'Inception' } });

        expect(screen.getByText('Inception_2010.srt')).toBeInTheDocument();
        expect(screen.queryByText('Interstellar_2014.vtt')).not.toBeInTheDocument();
        expect(screen.getByText('1 file')).toBeInTheDocument();

        const clearBtn = screen.getByRole('button', { name: /clear search query/i });
        fireEvent.click(clearBtn);
        expect(searchInput.value).toBe('');
        expect(screen.getByText('2 files')).toBeInTheDocument();
    });

    it('renders editorial delete button without binButton leakage and triggers deletion with loading state', async () => {
        (AuthService.getUserEmail as jest.Mock).mockReturnValue('learner@substreamedu.com');
        (SubtitleService.fetchAllSubtitles as jest.Mock).mockResolvedValue([
            { name: 'Inception_2010.srt' },
        ]);
        let resolveDelete: () => void = () => {};
        (SubtitleService.deleteSubtitlesByName as jest.Mock).mockImplementation(
            () => new Promise<void>((resolve) => { resolveDelete = resolve; })
        );

        render(
            <MemoryRouter>
                <IntlProvider locale="en" messages={{}}>
                    <SubtitlesPage />
                </IntlProvider>
            </MemoryRouter>
        );

        await waitFor(() => {
            expect(screen.getByText('Inception_2010.srt')).toBeInTheDocument();
        });

        const deleteBtn = screen.getByRole('button', { name: /delete inception_2010\.srt/i });
        expect(deleteBtn).toBeInTheDocument();
        expect(deleteBtn.className).toContain('deleteButton');
        expect(deleteBtn.className).not.toContain('binButton');

        fireEvent.click(deleteBtn);
        expect(SubtitleService.deleteSubtitlesByName).toHaveBeenCalledWith('Inception_2010.srt');
        expect(deleteBtn).toBeDisabled();
        expect(deleteBtn.querySelector('.deleteSpinner')).toBeInTheDocument();

        resolveDelete();
        await waitFor(() => {
            expect(screen.queryByText('Inception_2010.srt')).not.toBeInTheDocument();
        });
    });
});
