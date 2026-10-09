import React from 'react';
import { render, screen } from '@testing-library/react';
import { VideoPlayerModals, VideoPlayerModalsProps } from './VideoPlayerModals';

// Mock sub-modals for focused testing
jest.mock('./SubtitleSearchModal', () => ({
    SubtitleSearchModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="mock-subtitle-search-modal">Subtitle Search Modal</div> : null,
}));

jest.mock('./FilmSelectionModal', () => ({
    FilmSelectionModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="mock-film-selection-modal">Film Selection Modal</div> : null,
}));

jest.mock('./ReelGeneratorModal', () => ({
    ReelGeneratorModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="mock-reel-modal">Reel Generator Modal</div> : null,
}));

jest.mock('./GrammarSpotlightModal', () => ({
    GrammarSpotlightModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="mock-grammar-modal">Grammar Spotlight Modal</div> : null,
}));

jest.mock('./VideoGrammarIndexModal', () => ({
    VideoGrammarIndexModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="mock-grammar-index-modal">Grammar Index Modal</div> : null,
}));

jest.mock('./LessonStudioModal', () => ({
    LessonStudioModal: ({ isOpen }: { isOpen: boolean }) =>
        isOpen ? <div data-testid="mock-lesson-modal">Lesson Studio Modal</div> : null,
}));

describe('VideoPlayerModals Component', () => {
    const defaultProps: VideoPlayerModalsProps = {
        showSubtitleSearchModal: false,
        availableSubtitles: [],
        isSearchingSubtitles: false,
        onCloseSubtitleSearch: jest.fn(),
        onSelectSubtitleFromSearch: jest.fn(),
        onQuickTest: jest.fn(),
        onSearchDifferentTitle: jest.fn(),

        showFilmSelection: false,
        availableFilms: [],
        searchQueryForFilms: '',
        onCloseFilmSelection: jest.fn(),
        onSelectFilm: jest.fn(),
        onSearchAgain: jest.fn(),

        isReelModalOpen: false,
        reelModalData: null,
        videoSource: null,
        youtubeVideoId: null,
        movieTitle: 'Test Movie',
        onCloseReelModal: jest.fn(),

        isGrammarModalOpen: false,
        selectedGrammarPoint: null,
        selectedGrammarSentence: '',
        learningLanguage: 'en',
        fluentLanguage: 'ru',
        onCloseGrammarModal: jest.fn(),

        isGrammarIndexOpen: false,
        videoGrammarMatches: [],
        onCloseGrammarIndex: jest.fn(),
        onSelectGrammarCue: jest.fn(),

        isLessonStudioOpen: false,
        isMobile: false,
        videoTitle: 'Test Video',
        mediaSource: 'youtube',
        youtubeId: 'test-yt-id',
        lessonSubtitles: [],
        onCloseLessonStudio: jest.fn(),
        onSeekToTime: jest.fn(),
    };

    it('renders no modals when all isOpen flags are false', () => {
        render(<VideoPlayerModals {...defaultProps} />);
        expect(screen.queryByTestId('mock-subtitle-search-modal')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-film-selection-modal')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-reel-modal')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-grammar-modal')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-grammar-index-modal')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-lesson-modal')).not.toBeInTheDocument();
    });

    it('renders SubtitleSearchModal when showSubtitleSearchModal is true', () => {
        render(<VideoPlayerModals {...defaultProps} showSubtitleSearchModal={true} />);
        expect(screen.getByTestId('mock-subtitle-search-modal')).toBeInTheDocument();
    });

    it('renders FilmSelectionModal when showFilmSelection is true', () => {
        render(<VideoPlayerModals {...defaultProps} showFilmSelection={true} />);
        expect(screen.getByTestId('mock-film-selection-modal')).toBeInTheDocument();
    });

    it('renders ReelGeneratorModal when isReelModalOpen and reelModalData are provided', () => {
        const reelData = {
            word: 'test',
            translation: 'тест',
            sentence: 'This is a test.',
            startSec: 10,
            endSec: 14,
        };
        render(<VideoPlayerModals {...defaultProps} isReelModalOpen={true} reelModalData={reelData} />);
        expect(screen.getByTestId('mock-reel-modal')).toBeInTheDocument();
    });

    it('renders GrammarSpotlightModal and VideoGrammarIndexModal when their flags are true', () => {
        render(
            <VideoPlayerModals
                {...defaultProps}
                isGrammarModalOpen={true}
                isGrammarIndexOpen={true}
            />
        );
        expect(screen.getByTestId('mock-grammar-modal')).toBeInTheDocument();
        expect(screen.getByTestId('mock-grammar-index-modal')).toBeInTheDocument();
    });

    it('renders LessonStudioModal when open on desktop, but hides it on mobile', () => {
        const { rerender } = render(<VideoPlayerModals {...defaultProps} isLessonStudioOpen={true} isMobile={false} />);
        expect(screen.getByTestId('mock-lesson-modal')).toBeInTheDocument();

        rerender(<VideoPlayerModals {...defaultProps} isLessonStudioOpen={true} isMobile={true} />);
        expect(screen.queryByTestId('mock-lesson-modal')).not.toBeInTheDocument();
    });
});
