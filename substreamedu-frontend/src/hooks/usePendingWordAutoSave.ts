import { useEffect, useState, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AuthService } from '../services/AuthService';
import { GuestLimitService } from '../services/GuestLimitService';
import { SubtitleService } from '../services/SubtitleService';
import { AnalyticsService } from '../services/AnalyticsService';
import { debugLog, debugError } from '../utils/debug';

export const usePendingWordAutoSave = (isLoggedIn: boolean) => {
    const queryClient = useQueryClient();
    const [savedNotification, setSavedNotification] = useState<string | null>(null);
    const isProcessingRef = useRef(false);

    useEffect(() => {
        if (!isLoggedIn || !AuthService.getUserEmail()) {
            return;
        }

        const pending = GuestLimitService.getPendingSaveWord();
        if (!pending || isProcessingRef.current) {
            return;
        }

        isProcessingRef.current = true;

        // Restore video URL and timecode in sessionStorage if available
        if (pending.videoUrl) {
            sessionStorage.setItem('videoUrl', pending.videoUrl);
        }
        if (pending.timecode !== undefined) {
            sessionStorage.setItem('videoCurrentTime', pending.timecode.toString());
        }

        const executeAutoSave = async () => {
            try {
                debugLog('Auto-saving pending word after login:', pending.highlightedText);
                await SubtitleService.processHighlightedTextAfterTranslation({
                    resourceName: pending.resourceName || 'Unknown Resource',
                    highlightedText: pending.highlightedText,
                    context: pending.context || pending.highlightedText,
                    extendedContext: pending.extendedContext,
                    translation: pending.translation || '',
                    note: pending.note || '',
                    transcription: pending.transcription || null,
                    definition: pending.definition || null,
                    imageUrl: pending.imageUrl || null,
                });

                AnalyticsService.trackSaveWord({
                    text: pending.highlightedText,
                    translation: pending.translation || undefined,
                    resourceName: pending.resourceName,
                    status: 'success',
                });

                // Invalidate dictionary queries so UI immediately sees the saved word
                queryClient.invalidateQueries({ queryKey: ['dictionaryItems'] });
                queryClient.invalidateQueries({ queryKey: ['dictionaryResources'] });

                const successMsg = `Saved "${pending.highlightedText}" to your dictionary!`;
                setSavedNotification(successMsg);
                GuestLimitService.clearPendingSaveWord();
                try {
                    localStorage.setItem('substreamedu_onboarding_completed', 'true');
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent('substreamedu:onboarding_completed'));
                    }
                } catch {}

                // Automatically clear notification after 5s
                setTimeout(() => {
                    setSavedNotification(null);
                }, 5000);
            } catch (err) {
                debugError('Failed to auto-save pending word:', err);
                AnalyticsService.trackSaveWord({
                    text: pending.highlightedText,
                    translation: pending.translation || undefined,
                    resourceName: pending.resourceName,
                    status: 'failed',
                });
            } finally {
                isProcessingRef.current = false;
            }
        };

        executeAutoSave();
    }, [isLoggedIn, queryClient]);

    return { savedNotification, setSavedNotification };
};
