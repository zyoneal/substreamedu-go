export type SrsTier = 'new' | 'learning' | 'mastered';

/**
 * Classifies a saved vocabulary item into an SRS mastery tier for visual highlighting:
 * - mastered: graduated to 'review' with at least 3 successful repetitions
 * - learning: actively in 'learning' or early 'review' (< 3 repetitions)
 * - new: newly saved or status omitted
 */
export const getSrsTier = (status?: string | null, repetitionLevel?: number | null): SrsTier => {
    const normalized = (status || '').trim().toLowerCase();
    const reps = typeof repetitionLevel === 'number' && Number.isFinite(repetitionLevel) ? repetitionLevel : 0;

    if (normalized === 'review' && reps >= 3) {
        return 'mastered';
    }
    if (normalized === 'learning' || normalized === 'review') {
        return 'learning';
    }
    return 'new';
};
