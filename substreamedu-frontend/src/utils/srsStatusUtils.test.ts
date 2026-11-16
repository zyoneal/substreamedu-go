import { getSrsTier } from './srsStatusUtils';

describe('getSrsTier', () => {
    it('classifies new and unknown statuses as new', () => {
        expect(getSrsTier(undefined, undefined)).toBe('new');
        expect(getSrsTier('new', 0)).toBe('new');
    });

    it('classifies learning and early review (< 3 reps) as learning', () => {
        expect(getSrsTier('learning', 0)).toBe('learning');
        expect(getSrsTier('review', 1)).toBe('learning');
        expect(getSrsTier('review', 2)).toBe('learning');
    });

    it('classifies review with >= 3 reps as mastered', () => {
        expect(getSrsTier('review', 3)).toBe('mastered');
        expect(getSrsTier('REVIEW', 8)).toBe('mastered');
    });
});
