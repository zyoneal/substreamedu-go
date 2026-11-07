import { renderHook, act } from '@testing-library/react';
import { useVideoOnboarding } from './useVideoOnboarding';

describe('useVideoOnboarding', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('initializes onboarding state correctly', () => {
        const { result } = renderHook(() =>
            useVideoOnboarding({
                videoUrl: 'https://youtube.com/watch?v=dQw4w9WgXcQ',
                videoId: 'dQw4w9WgXcQ',
                isLoggedIn: false,
                isPopoverOpen: false,
            })
        );

        expect(result.current.onboardingStep).toBe(1);
        expect(result.current.onboardingDismissed).toBe(false);
    });

    it('dismisses onboarding and sets localStorage on handleDismissOnboarding', () => {
        const { result } = renderHook(() =>
            useVideoOnboarding({
                videoUrl: '',
                videoId: null,
                isLoggedIn: false,
                isPopoverOpen: false,
            })
        );

        act(() => {
            result.current.handleDismissOnboarding();
        });

        expect(result.current.onboardingDismissed).toBe(true);
        expect(localStorage.getItem('substreamedu_onboarding_completed')).toBe('true');
    });

    it('handles guest save reached event', () => {
        const { result } = renderHook(() =>
            useVideoOnboarding({
                videoUrl: '',
                videoId: null,
                isLoggedIn: false,
                isPopoverOpen: false,
            })
        );

        act(() => {
            window.dispatchEvent(new CustomEvent('substreamedu:guest_save_reached'));
        });

        expect(result.current.onboardingStep).toBe('completed');
        expect(result.current.onboardingDismissed).toBe(true);
    });
});
