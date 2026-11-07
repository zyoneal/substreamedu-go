import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { SubtitleSelectionBar, SubtitleSelectionBarProps } from './SubtitleSelectionBar';

const renderWithIntl = (ui: React.ReactElement) => {
    return render(
        <IntlProvider locale="en" messages={{ 'videoPlayer.selectSubtitles': 'Select subtitles', 'noSubtitlesFound': 'No subtitles found' }}>
            {ui}
        </IntlProvider>
    );
};

describe('SubtitleSelectionBar Component', () => {
    const defaultProps: SubtitleSelectionBarProps = {
        subtitles: [],
        fileName: '',
        isSearchingSubtitles: false,
        subtitleInputRef: { current: null },
        onSelectSubtitle: jest.fn(),
        onSearchSubtitles: jest.fn(),
        onUploadSubtitles: jest.fn(),
    };

    it('renders empty description and search button when subtitles list is empty', () => {
        renderWithIntl(<SubtitleSelectionBar {...defaultProps} />);
        expect(screen.getByText(/Automatic subtitle search available/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /search subtitles/i })).toBeInTheDocument();
        expect(screen.getByText(/upload subtitles/i)).toBeInTheDocument();
    });

    it('renders alternative description when subtitles list has items', () => {
        const props = {
            ...defaultProps,
            subtitles: [{ name: 'English.srt' }, { name: 'Spanish.srt' }],
        };
        renderWithIntl(<SubtitleSelectionBar {...props} />);
        expect(screen.getByText(/If you haven't selected subtitles for this video yet/i)).toBeInTheDocument();
    });

    it('triggers onSearchSubtitles when clicking search button', () => {
        const onSearchSubtitles = jest.fn();
        renderWithIntl(<SubtitleSelectionBar {...defaultProps} onSearchSubtitles={onSearchSubtitles} />);
        const button = screen.getByRole('button', { name: /search subtitles/i });
        fireEvent.click(button);
        expect(onSearchSubtitles).toHaveBeenCalledTimes(1);
    });

    it('disables search button while searching', () => {
        renderWithIntl(<SubtitleSelectionBar {...defaultProps} isSearchingSubtitles={true} />);
        const button = screen.getByRole('button', { name: /searching subtitles/i });
        expect(button).toBeDisabled();
        expect(button).toHaveTextContent('Searching...');
    });

    it('handles file upload change', () => {
        const onUploadSubtitles = jest.fn();
        renderWithIntl(<SubtitleSelectionBar {...defaultProps} onUploadSubtitles={onUploadSubtitles} />);
        const input = document.getElementById('subtitle-upload-player') as HTMLInputElement;
        expect(input).toBeInTheDocument();

        fireEvent.change(input, {
            target: { files: [new File(['dummy srt'], 'sub.srt', { type: 'text/plain' })] }
        });
        expect(onUploadSubtitles).toHaveBeenCalledTimes(1);
    });
});
