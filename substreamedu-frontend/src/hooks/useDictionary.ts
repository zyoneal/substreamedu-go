import { useQuery, useMutation, useQueryClient, UseMutationOptions } from '@tanstack/react-query';
import { DictionaryService } from '../services/DictionaryService';
import { SubtitleService } from '../services/SubtitleService';
import { AuthService } from '../services/AuthService';
import { GuestLimitService } from '../services/GuestLimitService';
import { AnalyticsService } from '../services/AnalyticsService';

export const useDictionaryResources = () => {
    return useQuery({
        queryKey: ['dictionaryResources'],
        queryFn: DictionaryService.fetchDictionaryResources,
        staleTime: 1000 * 60 * 10, 
    });
};

export const useDictionaryItems = (resourceName: string, enabled: boolean = true) => {
    return useQuery({
        queryKey: ['dictionaryItems', resourceName],
        queryFn: () => DictionaryService.fetchDictionaryItemsByResourceName(resourceName),
        enabled: !!resourceName && enabled,
    });
};


export const useReviewWords = () => {
    return useQuery({
        queryKey: ['reviewWords'],
        queryFn: DictionaryService.fetchSRSToday,
        enabled: !!AuthService.getUserEmail(),
    });
};

export const useUserDictionaryItems = () => {
    return useQuery({
        queryKey: ['dictionaryItems', 'user'],
        queryFn: DictionaryService.fetchDictionaryItemsByUser,
        staleTime: 1000 * 60 * 10,
        enabled: !!AuthService.getUserEmail(),
    });
};


export const useUserDictionaryItemsLight = () => {
    return useQuery({
        queryKey: ['dictionaryItems', 'user', 'light'],
        queryFn: DictionaryService.fetchDictionaryItemsLight,
        staleTime: 1000 * 60 * 10,
        enabled: !!AuthService.getUserEmail(),
    });
};

export interface SaveWordData {
    resourceName: string;
    highlightedText: string;
    context: string;
    extendedContext?: string;
    translation: string | null;
    note: string;
    transcription: string | null;
    definition: string | null;
    imageUrl: string | null;
}

export interface SaveWordContext {
    previousItems?: any[];
    previousHighlightedWords?: string[];
}

export const useSaveWord = (
    options?: UseMutationOptions<any, any, SaveWordData, SaveWordContext>
) => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: SaveWordData) => {
            if (!AuthService.getUserEmail()) {
                const videoUrl = typeof window !== 'undefined' ? (sessionStorage.getItem('videoUrl') || undefined) : undefined;
                const storedTime = typeof window !== 'undefined' ? sessionStorage.getItem('videoCurrentTime') : null;
                const timecode = storedTime ? parseFloat(storedTime) : undefined;
                const returnUrl = typeof window !== 'undefined' ? (window.location.pathname + window.location.search) : undefined;

                GuestLimitService.setPendingSaveWord({
                    resourceName: data.resourceName,
                    highlightedText: data.highlightedText,
                    context: data.context,
                    extendedContext: data.extendedContext,
                    translation: data.translation || '',
                    note: data.note,
                    transcription: data.transcription || undefined,
                    definition: data.definition || undefined,
                    imageUrl: data.imageUrl || undefined,
                    videoUrl,
                    timecode,
                    returnUrl,
                });

                GuestLimitService.triggerGuestSavePrompt();
                AnalyticsService.trackSaveWord({
                    text: data.highlightedText,
                    translation: data.translation || undefined,
                    resourceName: data.resourceName,
                    status: 'guest_blocked',
                });
                throw new Error('GUEST_SAVE_REQUIRES_LOGIN');
            }
            return SubtitleService.processHighlightedTextAfterTranslation(data);
        },
        onSuccess: (data, variables, context) => {
            (options as any)?.onSuccess?.(data, variables, context);
            
            queryClient.invalidateQueries({ queryKey: ['dictionaryItems'] });
            queryClient.invalidateQueries({ queryKey: ['dictionaryResources'] });
        },
        onError: (err, variables, context) => {
            const status = (err as any)?.status || (err as any)?.response?.status;
            const message = ((err as any)?.message || (err as any)?.response?.data?.message || '').toLowerCase();
            if (status === 403 || message.includes('save limit') || message.includes('word save')) {
                window.dispatchEvent(new CustomEvent('substreamedu:premium_limit_reached', { detail: { type: 'save' } }));
            }
            if ((err as any)?.message !== 'GUEST_SAVE_REQUIRES_LOGIN') {
                AnalyticsService.trackSaveWord({
                    text: variables.highlightedText,
                    translation: variables.translation || undefined,
                    resourceName: variables.resourceName,
                    status: 'failed',
                });
            }
            (options as any)?.onError?.(err, variables, context);
            console.error("Mutation failed", err);
        },

        onMutate: options?.onMutate,
        onSettled: options?.onSettled,
    });
};
