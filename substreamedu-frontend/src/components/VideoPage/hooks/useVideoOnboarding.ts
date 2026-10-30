import { useState, useEffect, useCallback, useMemo } from 'react';
import { OnboardingStep } from '../components/OnboardingGuideBar';
import { ONBOARDING_PRESETS } from '../../../constants/onboardingPresets';

export interface UseVideoOnboardingParams {
    videoUrl: string;
    videoId: string | null;
    isLoggedIn: boolean;
    isPopoverOpen: boolean;
    isOnboardingProp?: boolean;
}

export const useVideoOnboarding = ({
    videoUrl,
    videoId,
    isLoggedIn,
    isPopoverOpen,
    isOnboardingProp = false,
}: UseVideoOnboardingParams) => {
    const [onboardingDismissed, setOnboardingDismissed] = useState<boolean>(() => {
        try {
            if (typeof window !== 'undefined') {
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.get('onboarding') === 'true') {
                    return false;
                }
            }
            return localStorage.getItem('substreamedu_onboarding_completed') === 'true';
        } catch {
            return false;
        }
    });

    const isDemoRoute = typeof window !== 'undefined' && (
        window.location.pathname === '/youtube-demo' ||
        window.location.pathname === '/demo' ||
        window.location.pathname === '/movies'
    );
    const isGuestDemoMode = !isLoggedIn && isDemoRoute;

    const isUrlOnboardingParam = typeof window !== 'undefined' && (
        new URLSearchParams(window.location.search).get('onboarding') === 'true'
    );
    const isOnboardingActive = Boolean(isOnboardingProp || isUrlOnboardingParam);

    const isOnboardingMode = false; // Disabled by AI: preserves core mechanics (blur, delay, top controls)

    const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>(1);

    const handleDismissOnboarding = useCallback(() => {
        setOnboardingDismissed(true);
        try {
            localStorage.setItem('substreamedu_onboarding_completed', 'true');
            sessionStorage.removeItem('videoUrl');
            sessionStorage.removeItem('videoFileName');
            sessionStorage.removeItem('videoCurrentTime');
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('substreamedu:onboarding_completed'));
            }
        } catch {}
    }, []);

    useEffect(() => {
        const handleOnboardingCompleted = () => {
            setOnboardingDismissed(true);
        };
        window.addEventListener('substreamedu:onboarding_completed', handleOnboardingCompleted);
        return () => window.removeEventListener('substreamedu:onboarding_completed', handleOnboardingCompleted);
    }, []);

    useEffect(() => {
        if (isPopoverOpen && onboardingStep === 1) {
            setOnboardingStep(2);
        }
    }, [isPopoverOpen, onboardingStep]);

    useEffect(() => {
        const handleGuestSave = () => {
            setOnboardingStep('completed');
            setOnboardingDismissed(true);
            try {
                localStorage.setItem('substreamedu_onboarding_completed', 'true');
            } catch {}
        };
        window.addEventListener('substreamedu:guest_save_reached', handleGuestSave);
        return () => window.removeEventListener('substreamedu:guest_save_reached', handleGuestSave);
    }, []);

    const activePreset = useMemo(() => {
        return ONBOARDING_PRESETS.find(p => p.url === videoUrl || (videoId && p.url.includes(videoId))) || ONBOARDING_PRESETS[0];
    }, [videoUrl, videoId]);

    const onboardingUnderlineWords = useMemo(() => {
        return isOnboardingMode ? (activePreset?.recommendedWords || []) : [];
    }, [isOnboardingMode, activePreset]);

    return {
        onboardingDismissed,
        setOnboardingDismissed,
        onboardingStep,
        setOnboardingStep,
        isGuestDemoMode,
        isOnboardingActive,
        isOnboardingMode,
        handleDismissOnboarding,
        activePreset,
        onboardingUnderlineWords,
    };
};
