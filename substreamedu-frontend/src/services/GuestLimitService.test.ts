import { GuestLimitService } from './GuestLimitService';

describe('GuestLimitService', () => {
    beforeEach(() => {
        localStorage.clear();
        sessionStorage.clear();
    });

    it('defaults to 15 limit and tracks count correctly', () => {
        expect(GuestLimitService.getLimit()).toBe(15);
        expect(GuestLimitService.getCount()).toBe(0);
        expect(GuestLimitService.getRemaining()).toBe(15);
        expect(GuestLimitService.hasReachedLimit()).toBe(false);

        GuestLimitService.incrementCount();
        expect(GuestLimitService.getCount()).toBe(1);
        expect(GuestLimitService.getRemaining()).toBe(14);
    });

    it('stores, retrieves, and clears pending save word', () => {
        expect(GuestLimitService.getPendingSaveWord()).toBeNull();

        const sampleWord = {
            resourceName: 'YouTube - Friends',
            highlightedText: 'unbelievable',
            context: 'This is unbelievable!',
            translation: 'невероятно',
            videoUrl: 'https://youtube.com/watch?v=12345678901',
            timecode: 42.5,
            returnUrl: '/videos?v=https%3A%2F%2Fyoutube.com%2Fwatch%3Fv%3D12345678901&t=42.5',
        };

        GuestLimitService.setPendingSaveWord(sampleWord);
        const retrieved = GuestLimitService.getPendingSaveWord();
        expect(retrieved).toEqual(sampleWord);

        GuestLimitService.clearPendingSaveWord();
        expect(GuestLimitService.getPendingSaveWord()).toBeNull();
    });
});
