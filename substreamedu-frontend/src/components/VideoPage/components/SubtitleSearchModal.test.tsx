import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubtitleSearchModal } from './SubtitleSearchModal';
import { SubtitleWithScore } from '../../../services/SubtitleService';

jest.mock('lucide-react/dist/esm/icons/x', () => () => <span data-testid="icon-x" />);
jest.mock('lucide-react/dist/esm/icons/download', () => () => <span data-testid="icon-download" />);
jest.mock('lucide-react/dist/esm/icons/star', () => () => <span data-testid="icon-star" />);
jest.mock('lucide-react/dist/esm/icons/zap', () => () => <span data-testid="icon-zap" />);
jest.mock('lucide-react/dist/esm/icons/search', () => () => <span data-testid="icon-search" />);

describe('SubtitleSearchModal Component', () => {
    const mockSubtitles: SubtitleWithScore[] = [
        {
            subtitlesId: 'sub-1',
            name: 'Cars 3 2017 BluRay',
            releaseName: 'Cars.3.2017.720p.BluRay.x264-YTS',
            language: 'EN',
            url: 'https://example.com/sub1.srt',
            fromTrusted: true,
            ratings: 4.8,
            votes: 120,
            hi: false,
            frameRate: 23.976,
            downloadCount: '1500',
            uploadDate: '2017-10-15',
            seasonNumber: 0,
            episodeNumber: 0,
            author: 'npdv',
            syncScore: 85,
            syncReason: 'Exact match',
        },
    ];

    it('does not render when isOpen is false', () => {
        const { container } = render(
            <SubtitleSearchModal
                isOpen={false}
                onClose={jest.fn()}
                subtitles={mockSubtitles}
                onSelectSubtitle={jest.fn()}
            />
        );
        expect(container).toBeEmptyDOMElement();
    });

    it('renders subtitles and triggers onQuickTest and onSelectSubtitle', () => {
        const onSelectSubtitle = jest.fn();
        const onQuickTest = jest.fn();

        render(
            <SubtitleSearchModal
                isOpen={true}
                onClose={jest.fn()}
                subtitles={mockSubtitles}
                onSelectSubtitle={onSelectSubtitle}
                onQuickTest={onQuickTest}
            />
        );

        expect(screen.getByText('Cars.3.2017.720p.BluRay.x264-YTS')).toBeInTheDocument();

        const quickTestBtn = screen.getByTitle(/Quick Test/i);
        fireEvent.click(quickTestBtn);
        expect(onQuickTest).toHaveBeenCalledWith(mockSubtitles[0]);

        const downloadBtn = screen.getByTitle(/Download and Save/i);
        fireEvent.click(downloadBtn);
        expect(onSelectSubtitle).toHaveBeenCalledWith(mockSubtitles[0]);
    });

    it('renders Change title button and invokes onSearchDifferentTitle', () => {
        const onSearchDifferentTitle = jest.fn();

        render(
            <SubtitleSearchModal
                isOpen={true}
                onClose={jest.fn()}
                subtitles={mockSubtitles}
                onSelectSubtitle={jest.fn()}
                onSearchDifferentTitle={onSearchDifferentTitle}
            />
        );

        const changeTitleBtn = screen.getByRole('button', { name: /change title/i });
        expect(changeTitleBtn).toBeInTheDocument();

        fireEvent.click(changeTitleBtn);
        expect(onSearchDifferentTitle).toHaveBeenCalledTimes(1);
    });
});
