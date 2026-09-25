import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubtitleOverlay, SubtitleOverlayProps } from './SubtitleOverlay';
import { DetectedGrammarPoint } from '../../../utils/grammarDetector';

jest.mock('lucide-react/dist/esm/icons/sparkles', () => () => <span data-testid="icon-sparkles" />);

describe('SubtitleOverlay Component', () => {
    const mockGrammarPoint: DetectedGrammarPoint = {
        tag: 'past_simple',
        name: 'Past Simple',
        shortLabel: 'Past Simple',
        cefrLevel: 'B1',
        formula: 'Subject + V2/ed',
        explanation: 'Used for completed actions in the past.',
        nativeExplanation: 'Используется для завершенных действий в прошлом.',
        matchedText: 'went',
        matchIndex: 2,
        matchLength: 4,
        miniQuiz: {
            question: 'What is the past simple of go?',
            options: ['goed', 'went', 'gone', 'going'],
            answer: 'went',
            hint: 'Irregular verb',
            explanation: 'Go is irregular: go -> went -> gone',
        },
    };

    const defaultProps: SubtitleOverlayProps = {
        isFullscreen: false,
        showSubtitles: true,
        currentSubtitle: 'I went to the store yesterday.',
        isLoadingSubtitles: false,
        hasNoSubtitlesForVideo: false,
        activeGrammarPoint: null,
        blurSubtitles: false,
        isMobile: false,
        isPopoverOpen: false,
        isLoadingTranslation: false,
        onTextSelection: jest.fn(),
        onExploreGrammar: jest.fn(),
        onPauseVideo: jest.fn(),
        onPlayVideo: jest.fn(),
        renderedSubtitle: <span>I went to the store yesterday.</span>,
    };

    it('renders renderedSubtitle content when subtitles are loaded', () => {
        render(<SubtitleOverlay {...defaultProps} />);
        expect(screen.getByText('I went to the store yesterday.')).toBeInTheDocument();
    });

    it('renders loading indicator when isLoadingSubtitles is true', () => {
        render(<SubtitleOverlay {...defaultProps} isLoadingSubtitles={true} />);
        expect(screen.getByText(/loading subtitles.../i)).toBeInTheDocument();
    });

    it('renders empty message when hasNoSubtitlesForVideo is true', () => {
        render(<SubtitleOverlay {...defaultProps} hasNoSubtitlesForVideo={true} />);
        expect(screen.getByText(/no subtitles found for this video/i)).toBeInTheDocument();
    });

    it('renders grammar badge and triggers onExploreGrammar', () => {
        const onExploreGrammar = jest.fn();
        const onPauseVideo = jest.fn();

        render(
            <SubtitleOverlay
                {...defaultProps}
                activeGrammarPoint={mockGrammarPoint}
                onExploreGrammar={onExploreGrammar}
                onPauseVideo={onPauseVideo}
            />
        );

        expect(screen.getByText('Past Simple')).toBeInTheDocument();
        expect(screen.getByText('B1')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: /explore grammar/i }));
        expect(onPauseVideo).toHaveBeenCalled();
        expect(onExploreGrammar).toHaveBeenCalledWith(mockGrammarPoint, 'I went to the store yesterday.');
    });

    it('triggers onTextSelection on mouseUp', () => {
        const onTextSelection = jest.fn();
        render(<SubtitleOverlay {...defaultProps} onTextSelection={onTextSelection} />);

        const container = screen.getByText('I went to the store yesterday.').closest('.currentSubtitleContainer');
        expect(container).toBeInTheDocument();
        fireEvent.mouseUp(container!);
        expect(onTextSelection).toHaveBeenCalled();
    });

    it('applies isBlurred class when blurSubtitles is true', () => {
        render(<SubtitleOverlay {...defaultProps} blurSubtitles={true} />);
        const paragraph = screen.getByText('I went to the store yesterday.').closest('p');
        expect(paragraph).toHaveClass('isBlurred');
    });

    it('applies fullscreenSubtitles class when isFullscreen is true', () => {
        const { container } = render(<SubtitleOverlay {...defaultProps} isFullscreen={true} />);
        const wrapper = container.querySelector('.fullscreenSubtitles');
        expect(wrapper).toBeInTheDocument();
    });
});
