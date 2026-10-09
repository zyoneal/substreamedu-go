import { renderHook, act } from '@testing-library/react';
import { useSubtitleTranslation, UseSubtitleTranslationParams } from './useSubtitleTranslation';
import { SubtitleService } from '../../../services/SubtitleService';

jest.mock('../../../services/SubtitleService', () => ({
    SubtitleService: {
        getTranslationProd: jest.fn(),
    },
}));

jest.mock('react-intl', () => ({
    useIntl: () => ({
        formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
    }),
}));

jest.mock('@tanstack/react-query', () => ({
    useQueryClient: () => ({
        cancelQueries: jest.fn(),
    }),
}));

jest.mock('../../../hooks/useDictionary', () => ({
    useSaveWord: () => ({
        mutate: jest.fn(),
        isPending: false,
    }),
}));

describe('useSubtitleTranslation hook', () => {
    let mockPauseVideo: jest.Mock;
    let mockPlayVideo: jest.Mock;
    let mockShowNotification: jest.Mock;
    let mockSaveWordMutation: { mutate: jest.Mock; isPending: boolean };

    beforeEach(() => {
        jest.clearAllMocks();
        mockPauseVideo = jest.fn();
        mockPlayVideo = jest.fn();
        mockShowNotification = jest.fn();
        mockSaveWordMutation = {
            mutate: jest.fn(),
            isPending: false,
        };
    });

    const createParams = (overrides: Partial<UseSubtitleTranslationParams> = {}): UseSubtitleTranslationParams => ({
        currentSubtitle: 'The weather today is exceptionally sunny.',
        subtitlesForVideo: [
            { text: 'Good morning everyone.', startTimeMs: 0, endTimeMs: 2000 },
            { text: 'The weather today is exceptionally sunny.', startTimeMs: 2100, endTimeMs: 4500 },
            { text: 'Enjoy your weekend.', startTimeMs: 4600, endTimeMs: 7000 },
        ],
        fluentLanguage: 'ru',
        learningLanguage: 'en',
        getResourceName: () => 'movie:101',
        isMobile: false,
        pauseVideo: mockPauseVideo,
        playVideo: mockPlayVideo,
        showNotification: mockShowNotification,
        customSaveWordMutation: mockSaveWordMutation,
        isMountedRef: { current: true },
        ...overrides,
    });

    it('initializes with default state values', () => {
        const { result } = renderHook(() => useSubtitleTranslation(createParams()));
        expect(result.current.isPopoverOpen).toBe(false);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.selectedText).toBeNull();
        expect(result.current.translationData.translation).toBeNull();
    });

    it('updates active translation option coherently via handleSelectOption', () => {
        const { result } = renderHook(() => useSubtitleTranslation(createParams()));

        act(() => {
            result.current.handleSelectOption({
                text: 'исключительно',
                definition: 'в высшей степени',
                usageNote: 'formal context',
                register: 'formal',
                isPrimary: false,
                source: 'alternative',
            });
        });

        expect(result.current.translationData.translation).toBe('исключительно');
        expect(result.current.translationData.definition).toBe('в высшей степени');
        expect(result.current.translationData.usageNote).toBe('formal context');
        expect(result.current.translationData.register).toBe('formal');
    });

    it('resets all translation and popover state on resetPopoverState', () => {
        const { result } = renderHook(() => useSubtitleTranslation(createParams()));

        act(() => {
            result.current.setIsPopoverOpen(true);
            result.current.setSelectedText('exceptionally');
            result.current.setNote('custom study note');
            result.current.resetPopoverState();
        });

        expect(result.current.isPopoverOpen).toBe(false);
        expect(result.current.selectedText).toBeNull();
        expect(result.current.note).toBe('');
    });

    it('fetches translation and populates translation options', async () => {
        (SubtitleService.getTranslationProd as jest.Mock).mockResolvedValueOnce({
            translation: 'исключительно',
            definition: 'в необычайной степени',
            alternatives: [{ text: 'особенно', usage_note: 'informal' }],
        });

        const { result } = renderHook(() => useSubtitleTranslation(createParams()));

        await act(async () => {
            await result.current.fetchTranslation('exceptionally', 'The weather is exceptionally sunny.', true);
        });

        expect(result.current.translationData.translation).toBe('исключительно');
        expect(result.current.translationData.definition).toBe('в необычайной степени');
        expect(result.current.showSubmitButton).toBe(true);
        expect(mockPauseVideo).toHaveBeenCalled();
    });

    it('submits vocabulary entry via saveToDict', () => {
        const { result } = renderHook(() => useSubtitleTranslation(createParams()));

        act(() => {
            result.current.setSelectedText('sunny');
            result.current.setSelectedSentence('The weather today is exceptionally sunny.');
            result.current.setTranslationData(prev => ({
                ...prev,
                translation: 'солнечно',
                definition: 'ясно',
            }));
            result.current.setNote('test note');
        });

        act(() => {
            result.current.saveToDict();
        });

        expect(mockSaveWordMutation.mutate).toHaveBeenCalledWith(
            expect.objectContaining({
                resourceName: 'movie:101',
                highlightedText: 'sunny',
                context: 'The weather today is exceptionally sunny.',
                translation: 'солнечно',
                definition: 'ясно',
                note: 'test note',
            })
        );
    });
});
