import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoControlsOverlay, VideoControlsOverlayProps } from './VideoControlsOverlay';

jest.mock('lucide-react/dist/esm/icons/sparkles', () => () => <span data-testid="icon-sparkles" />);
jest.mock('lucide-react/dist/esm/icons/graduation-cap', () => () => <span data-testid="icon-graduation-cap" />);
jest.mock('lucide-react/dist/esm/icons/eye', () => () => <span data-testid="icon-eye" />);
jest.mock('lucide-react/dist/esm/icons/eye-off', () => () => <span data-testid="icon-eye-off" />);
jest.mock('lucide-react/dist/esm/icons/rotate-ccw', () => () => <span data-testid="icon-rotate-ccw" />);
jest.mock('lucide-react/dist/esm/icons/volume-1', () => () => <span data-testid="icon-volume-1" />);
jest.mock('lucide-react/dist/esm/icons/volume-2', () => () => <span data-testid="icon-volume-2" />);
jest.mock('lucide-react/dist/esm/icons/volume-x', () => () => <span data-testid="icon-volume-x" />);
jest.mock('lucide-react/dist/esm/icons/maximize', () => () => <span data-testid="icon-maximize" />);
jest.mock('lucide-react/dist/esm/icons/minimize', () => () => <span data-testid="icon-minimize" />);
jest.mock('lucide-react/dist/esm/icons/play', () => () => <span data-testid="icon-play" />);
jest.mock('lucide-react/dist/esm/icons/pause', () => () => <span data-testid="icon-pause" />);

describe('VideoControlsOverlay Component', () => {
    const defaultProps: VideoControlsOverlayProps = {
        showControls: true,
        isPlaying: false,
        currentTime: 75, // 1:15
        duration: 300, // 5:00
        progress: 25,
        volume: 0.8,
        isMuted: false,
        isFullscreen: false,
        isMobile: false,
        showSubtitles: true,
        blurSubtitles: true,
        delay: 0,
        onVideoClick: jest.fn(),
        onTogglePlayPause: jest.fn(),
        onOpenGrammarIndex: jest.fn(),
        onOpenLessonStudio: jest.fn(),
        onToggleSubtitles: jest.fn(),
        onToggleBlur: jest.fn(),
        onDelayChange: jest.fn(),
        onRepeatCurrentSubtitle: jest.fn(),
        onToggleMute: jest.fn(),
        onVolumeChange: jest.fn(),
        onSeek: jest.fn(),
        onTouchSeek: jest.fn(),
        onToggleFullscreen: jest.fn(),
    };

    it('renders time, icons, and progress correctly', () => {
        render(<VideoControlsOverlay {...defaultProps} />);

        expect(screen.getByText('1:15')).toBeInTheDocument();
        expect(screen.getByText('5:00')).toBeInTheDocument();
        expect(screen.getByTestId('icon-sparkles')).toBeInTheDocument();
        expect(screen.getByTestId('icon-graduation-cap')).toBeInTheDocument();
        expect(screen.getByTestId('icon-eye-off')).toBeInTheDocument();
        expect(screen.getByTestId('icon-volume-2')).toBeInTheDocument();
        expect(screen.getByTestId('icon-maximize')).toBeInTheDocument();
        expect(screen.getByTestId('icon-play')).toBeInTheDocument();
    });

    it('triggers action callbacks when clicking buttons', () => {
        const onOpenGrammarIndex = jest.fn();
        const onOpenLessonStudio = jest.fn();
        const onToggleSubtitles = jest.fn();
        const onToggleBlur = jest.fn();
        const onRepeatCurrentSubtitle = jest.fn();
        const onToggleMute = jest.fn();
        const onToggleFullscreen = jest.fn();
        const onTogglePlayPause = jest.fn();

        render(
            <VideoControlsOverlay
                {...defaultProps}
                onOpenGrammarIndex={onOpenGrammarIndex}
                onOpenLessonStudio={onOpenLessonStudio}
                onToggleSubtitles={onToggleSubtitles}
                onToggleBlur={onToggleBlur}
                onRepeatCurrentSubtitle={onRepeatCurrentSubtitle}
                onToggleMute={onToggleMute}
                onToggleFullscreen={onToggleFullscreen}
                onTogglePlayPause={onTogglePlayPause}
            />
        );

        fireEvent.click(screen.getByRole('button', { name: /play/i }));
        expect(onTogglePlayPause).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /grammar in this video/i }));
        expect(onOpenGrammarIndex).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /teacher studio/i }));
        expect(onOpenLessonStudio).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /hide subtitles/i }));
        expect(onToggleSubtitles).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /toggle blur subtitles/i }));
        expect(onToggleBlur).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /repeat subtitle 3 times/i }));
        expect(onRepeatCurrentSubtitle).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /enter fullscreen/i }));
        expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
    });

    it('renders Pause icon when isPlaying is true and Play icon when false', () => {
        const { rerender } = render(<VideoControlsOverlay {...defaultProps} isPlaying={false} />);
        expect(screen.getByTestId('icon-play')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-pause')).not.toBeInTheDocument();

        rerender(<VideoControlsOverlay {...defaultProps} isPlaying={true} />);
        expect(screen.getByTestId('icon-pause')).toBeInTheDocument();
        expect(screen.queryByTestId('icon-play')).not.toBeInTheDocument();
    });

    it('triggers delay toggle correctly between 0s and -2s', () => {
        const onDelayChange = jest.fn();
        const { rerender } = render(
            <VideoControlsOverlay {...defaultProps} delay={0} onDelayChange={onDelayChange} />
        );

        const delayBtn = screen.getByRole('button', { name: /toggle subtitle delay/i });
        expect(delayBtn).toHaveTextContent('Delay');
        fireEvent.click(delayBtn);
        expect(onDelayChange).toHaveBeenCalledWith(-2);

        rerender(
            <VideoControlsOverlay {...defaultProps} delay={-2} onDelayChange={onDelayChange} />
        );
        expect(delayBtn).toHaveTextContent('-2s');
        fireEvent.click(delayBtn);
        expect(onDelayChange).toHaveBeenCalledWith(0);
    });

    it('hides desktop-only controls on mobile viewports', () => {
        render(<VideoControlsOverlay {...defaultProps} isMobile={true} />);

        expect(screen.queryByTestId('icon-graduation-cap')).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/volume slider/i)).not.toBeInTheDocument();
    });

    it('handles seek and volume events when opening upward volume popup', () => {
        const onSeek = jest.fn();
        const onVolumeChange = jest.fn();

        render(
            <VideoControlsOverlay
                {...defaultProps}
                onSeek={onSeek}
                onVolumeChange={onVolumeChange}
            />
        );

        // Volume slider is hidden by default inside the upward popup
        expect(screen.queryByLabelText(/volume slider/i)).not.toBeInTheDocument();

        // Click sound icon to open upward volume popup
        const volumeBtn = screen.getByRole('button', { name: /volume/i });
        fireEvent.click(volumeBtn);

        const volumeSlider = screen.getByLabelText(/volume slider/i);
        expect(volumeSlider).toBeInTheDocument();
        fireEvent.change(volumeSlider, { target: { value: '0.4' } });
        expect(onVolumeChange).toHaveBeenCalled();

        const seekBar = volumeSlider.closest('.bottomControls')!.querySelector('.seekBarWrapper');
        expect(seekBar).toBeInTheDocument();
        fireEvent.click(seekBar!);
        expect(onSeek).toHaveBeenCalledTimes(1);
    });

    it('toggles vertical volume popup on sound icon click, closes on Escape, and allows muting', () => {
        const onToggleMute = jest.fn();
        render(<VideoControlsOverlay {...defaultProps} onToggleMute={onToggleMute} />);

        const volumeBtn = screen.getByRole('button', { name: /volume/i });
        // Initially closed
        expect(screen.queryByLabelText(/volume slider/i)).not.toBeInTheDocument();

        // Click to open
        fireEvent.click(volumeBtn);
        expect(screen.getByLabelText(/volume slider/i)).toBeInTheDocument();
        expect(screen.getByText('80%')).toBeInTheDocument();

        // Click mute button inside popup
        const miniMuteBtn = screen.getByRole('button', { name: /mute/i });
        fireEvent.click(miniMuteBtn);
        expect(onToggleMute).toHaveBeenCalled();

        // Close on Escape
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(screen.queryByLabelText(/volume slider/i)).not.toBeInTheDocument();
    });

    it('renders Blur quick pill button with activePill when blurSubtitles is true and without it when false', () => {
        const { rerender } = render(<VideoControlsOverlay {...defaultProps} blurSubtitles={true} />);
        const blurBtn = screen.getByRole('button', { name: /toggle blur subtitles/i });
        expect(blurBtn).toHaveClass('quickPillButton');
        expect(blurBtn).toHaveClass('activePill');

        rerender(<VideoControlsOverlay {...defaultProps} blurSubtitles={false} />);
        expect(blurBtn).toHaveClass('quickPillButton');
        expect(blurBtn).not.toHaveClass('activePill');
    });

    it('hides all top controls during onboarding when hideTopControls is true', () => {
        render(<VideoControlsOverlay {...defaultProps} hideTopControls={true} />);
        expect(screen.queryByTestId('icon-sparkles')).not.toBeInTheDocument();
        expect(screen.queryByTestId('icon-graduation-cap')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /toggle blur subtitles/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /repeat subtitle 3 times/i })).not.toBeInTheDocument();
        // Bottom controls like play button should still be present
        expect(screen.getByTestId('icon-play')).toBeInTheDocument();
    });
});
