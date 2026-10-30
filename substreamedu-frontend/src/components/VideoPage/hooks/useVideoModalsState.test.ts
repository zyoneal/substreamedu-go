import { renderHook, act } from '@testing-library/react';
import { useVideoModalsState } from './useVideoModalsState';

describe('useVideoModalsState', () => {
    it('initializes all modals as closed', () => {
        const { result } = renderHook(() =>
            useVideoModalsState({
                currentSubtitle: null,
                subtitlesForVideo: null,
            })
        );

        expect(result.current.isReelModalOpen).toBe(false);
        expect(result.current.isGrammarModalOpen).toBe(false);
        expect(result.current.isGrammarIndexOpen).toBe(false);
        expect(result.current.isLessonStudioOpen).toBe(false);
        expect(result.current.showLanguageOverlay).toBe(false);
    });

    it('opens and closes grammar modal properly', () => {
        const { result } = renderHook(() =>
            useVideoModalsState({
                currentSubtitle: 'She has gone.',
                subtitlesForVideo: null,
            })
        );

        act(() => {
            result.current.openGrammarModal({ id: 'present_perfect', title: 'Present Perfect' } as any, 'She has gone.');
        });

        expect(result.current.isGrammarModalOpen).toBe(true);
        expect(result.current.selectedGrammarSentence).toBe('She has gone.');

        act(() => {
            result.current.closeGrammarModal();
        });

        expect(result.current.isGrammarModalOpen).toBe(false);
        expect(result.current.selectedGrammarSentence).toBe('');
    });

    it('opens and closes reel modal properly', () => {
        const { result } = renderHook(() =>
            useVideoModalsState({
                currentSubtitle: null,
                subtitlesForVideo: null,
            })
        );

        act(() => {
            result.current.openReelModal({
                word: 'hello',
                translation: 'привет',
                sentence: 'hello world',
                startSec: 1,
                endSec: 3,
            });
        });

        expect(result.current.isReelModalOpen).toBe(true);
        expect(result.current.reelModalData?.word).toBe('hello');

        act(() => {
            result.current.closeReelModal();
        });

        expect(result.current.isReelModalOpen).toBe(false);
    });
});
