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

describe('VideoControlsOverlay Component', () => {
    const defaultProps: VideoControlsOverlayProps = {
        showControls: true,
        currentTime: 75, // 1:15
        duration: 300, // 5:00
        progress: 25,
        volume: 0.8,
        isMuted: false,
        isFullscreen: false,
        isMobile: false,
        showSubtitles: true,
        blurSubtitles: false,
        delay: 0,
        onVideoClick: jest.fn(),
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
    });

    it('triggers action callbacks when clicking buttons', () => {
        const onOpenGrammarIndex = jest.fn();
        const onOpenLessonStudio = jest.fn();
        const onToggleSubtitles = jest.fn();
        const onToggleBlur = jest.fn();
        const onRepeatCurrentSubtitle = jest.fn();
        const onToggleMute = jest.fn();
        const onToggleFullscreen = jest.fn();

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
            />
        );

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

        fireEvent.click(screen.getByRole('button', { name: /mute/i }));
        expect(onToggleMute).toHaveBeenCalledTimes(1);

        fireEvent.click(screen.getByRole('button', { name: /enter fullscreen/i }));
        expect(onToggleFullscreen).toHaveBeenCalledTimes(1);
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

    it('handles seek and volume events', () => {
        const onSeek = jest.fn();
        const onVolumeChange = jest.fn();

        render(
            <VideoControlsOverlay
                {...defaultProps}
                onSeek={onSeek}
                onVolumeChange={onVolumeChange}
            />
        );

        const volumeSlider = screen.getByLabelText(/volume slider/i);
        fireEvent.change(volumeSlider, { target: { value: '0.4' } });
        expect(onVolumeChange).toHaveBeenCalled();

        const seekBar = volumeSlider.closest('.bottomControls')!.querySelector('.seekBarWrapper');
        expect(seekBar).toBeInTheDocument();
        fireEvent.click(seekBar!);
        expect(onSeek).toHaveBeenCalledTimes(1);
    });
});
