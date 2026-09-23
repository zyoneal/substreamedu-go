import { renderHook, act } from '@testing-library/react';
import { useVideoPlayer } from './useVideoPlayer';
import * as debugModule from '../../../utils/debug';

describe('useVideoPlayer hook', () => {
    let debugErrorSpy: jest.SpyInstance;
    let consoleErrorSpy: jest.SpyInstance;

    beforeAll(() => {
        // jsdom doesn't implement HTMLMediaElement methods
        window.HTMLMediaElement.prototype.pause = jest.fn();
    });

    beforeEach(() => {
        debugErrorSpy = jest.spyOn(debugModule, 'debugError').mockImplementation(() => {});
        consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation((...args) => {
            // Ignore ReactDOMTestUtils.act deprecation warning from React 18 testing library
            if (typeof args[0] === 'string' && args[0].includes('ReactDOMTestUtils.act')) return;
        });
    });

    afterEach(() => {
        debugErrorSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('gracefully handles and suppresses AbortError when play() is interrupted by DOM removal or pause', async () => {
        const { result } = renderHook(() =>
            useVideoPlayer({
                videoUrl: 'https://drive.google.com/uc?export=download&id=test12345',
            })
        );

        const mockVideo = document.createElement('video');
        document.body.appendChild(mockVideo);

        const abortError = new DOMException(
            'The play() request was interrupted because the media was removed from the document.',
            'AbortError'
        );

        jest.spyOn(mockVideo, 'play').mockRejectedValue(abortError);

        // Assign mock video to ref
        Object.defineProperty(result.current.videoRef, 'current', {
            value: mockVideo,
            writable: true,
        });

        await act(async () => {
            result.current.playVideo();
        });

        // AbortError should be gracefully suppressed without logging red errors
        expect(debugErrorSpy).not.toHaveBeenCalled();

        document.body.removeChild(mockVideo);
    });

    it('gracefully handles and suppresses NotAllowedError (autoplay policy blocked)', async () => {
        const { result } = renderHook(() =>
            useVideoPlayer({
                videoUrl: 'https://drive.google.com/uc?export=download&id=test12345',
            })
        );

        const mockVideo = document.createElement('video');
        document.body.appendChild(mockVideo);

        const notAllowedError = new DOMException(
            'play() failed because the user didn\'t interact with the document first.',
            'NotAllowedError'
        );

        jest.spyOn(mockVideo, 'play').mockRejectedValue(notAllowedError);

        Object.defineProperty(result.current.videoRef, 'current', {
            value: mockVideo,
            writable: true,
        });

        await act(async () => {
            result.current.playVideo();
        });

        expect(debugErrorSpy).not.toHaveBeenCalled();

        document.body.removeChild(mockVideo);
    });

    it('logs genuine playback errors (non-AbortError / non-NotAllowedError)', async () => {
        const { result } = renderHook(() =>
            useVideoPlayer({
                videoUrl: 'https://drive.google.com/uc?export=download&id=test12345',
            })
        );

        const mockVideo = document.createElement('video');
        document.body.appendChild(mockVideo);

        const realError = new Error('Corrupt video bitstream');
        jest.spyOn(mockVideo, 'play').mockRejectedValue(realError);

        Object.defineProperty(result.current.videoRef, 'current', {
            value: mockVideo,
            writable: true,
        });

        await act(async () => {
            result.current.playVideo();
        });

        expect(debugErrorSpy).toHaveBeenCalledWith('Video playback failed:', realError);

        document.body.removeChild(mockVideo);
    });
});
