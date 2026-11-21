import React, { useEffect, useState } from 'react';
import { useIntl } from 'react-intl';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-ccw';
import { DictionaryService, SRSItemKind, SRSSessionFilters } from '../../../services/DictionaryService';
import { SegmentedControl } from '../../ui/SegmentedControl';
import styles from '../Flashcards.module.css';

interface ResourceOption {
    groupName?: string;
    numberOfWords?: number;
    resourceName?: string;
    name?: string;
    source?: string;
}

interface NormalizedResourceOption {
    name: string;
    numberOfWords?: number;
}

interface CategoryOption {
    categoryName: string;
    numberOfWords: number;
}

export interface SessionFilterBarProps {
    filters: SRSSessionFilters;
    hasActiveFilters: boolean;
    disabled?: boolean;
    onApplyFilters: (next: SRSSessionFilters) => void;
    onResetFilters: () => void;
}

const KIND_OPTIONS: { value: SRSItemKind; id: string; defaultMessage: string }[] = [
    { value: 'all', id: 'flashcards.filter.kindAll', defaultMessage: 'All' },
    { value: 'words', id: 'flashcards.filter.kindWords', defaultMessage: 'Words' },
    { value: 'phrases', id: 'flashcards.filter.kindPhrases', defaultMessage: 'Phrases' },
];

export const SessionFilterBar: React.FC<SessionFilterBarProps> = ({
    filters,
    hasActiveFilters,
    disabled = false,
    onApplyFilters,
    onResetFilters,
}) => {
    const intl = useIntl();
    const [resources, setResources] = useState<NormalizedResourceOption[]>([]);
    const [categories, setCategories] = useState<CategoryOption[]>([]);

    useEffect(() => {
        const hasResourceFn = typeof DictionaryService.fetchDictionaryResources === 'function';
        const hasCatFn = typeof DictionaryService.fetchDictionaryCategories === 'function';
        if (!hasResourceFn && !hasCatFn) return;

        let mounted = true;
        const loadOptions = async () => {
            try {
                const [resList, catList] = await Promise.all([
                    hasResourceFn ? DictionaryService.fetchDictionaryResources().catch(() => []) : Promise.resolve([]),
                    hasCatFn ? DictionaryService.fetchDictionaryCategories().catch(() => []) : Promise.resolve([]),
                ]);
                if (!mounted) return;
                const seenNames = new Set<string>();
                const normalizedResources: NormalizedResourceOption[] = Array.isArray(resList)
                    ? (resList as ResourceOption[]).reduce<NormalizedResourceOption[]>((acc, r) => {
                        const name = (r.groupName || r.resourceName || r.name || r.source || '').trim();
                        if (!name || seenNames.has(name)) return acc;
                        seenNames.add(name);
                        acc.push({
                            name,
                            numberOfWords: typeof r.numberOfWords === 'number' ? r.numberOfWords : undefined,
                        });
                        return acc;
                    }, [])
                    : [];
                if (normalizedResources.length > 0) setResources(normalizedResources);
                const validCats = Array.isArray(catList) ? catList.filter((c) => c.categoryName) : [];
                if (validCats.length > 0) setCategories(validCats);
            } catch {
                // Keep filter bar functional even if optional metadata fails to load
            }
        };
        loadOptions();
        return () => {
            mounted = false;
        };
    }, []);

    const activeKind: SRSItemKind = filters.kind || 'all';
    const segmentedOptions = KIND_OPTIONS.map((opt) => ({
        value: opt.value,
        label: intl.formatMessage({ id: opt.id, defaultMessage: opt.defaultMessage }),
    }));

    return (
        <div
            className={styles.filterBar}
            role="region"
            aria-label={intl.formatMessage({ id: 'flashcards.filter.regionLabel', defaultMessage: 'Session filters' })}
        >
            <SegmentedControl
                options={segmentedOptions}
                value={activeKind}
                onChange={(nextKind) => onApplyFilters({ ...filters, kind: nextKind })}
                ariaLabel={intl.formatMessage({ id: 'flashcards.filter.kindLabel', defaultMessage: 'Card type' })}
                roleMode="group"
                variant="light"
                size="sm"
                disabled={disabled}
            />

            {resources.length > 0 && (
                <select
                    aria-label={intl.formatMessage({ id: 'flashcards.filter.sourceLabel', defaultMessage: 'Filter by source' })}
                    className={styles.filterSelect}
                    disabled={disabled}
                    value={filters.resource || ''}
                    onChange={(e) => onApplyFilters({ ...filters, resource: e.target.value })}
                >
                    <option value="">
                        {intl.formatMessage({ id: 'flashcards.filter.allSources', defaultMessage: 'All sources' })}
                    </option>
                    {resources.map((res) => (
                        <option key={res.name} value={res.name}>
                            {res.numberOfWords !== undefined ? `${res.name} (${res.numberOfWords})` : res.name}
                        </option>
                    ))}
                </select>
            )}

            {categories.length > 0 && (
                <select
                    aria-label={intl.formatMessage({ id: 'flashcards.filter.categoryLabel', defaultMessage: 'Filter by category' })}
                    className={styles.filterSelect}
                    disabled={disabled}
                    value={filters.category || ''}
                    onChange={(e) => onApplyFilters({ ...filters, category: e.target.value })}
                >
                    <option value="">
                        {intl.formatMessage({ id: 'flashcards.filter.allCategories', defaultMessage: 'All categories' })}
                    </option>
                    {categories.map((cat) => (
                        <option key={cat.categoryName} value={cat.categoryName}>
                            {cat.categoryName} ({cat.numberOfWords})
                        </option>
                    ))}
                </select>
            )}

            {hasActiveFilters && (
                <button
                    type="button"
                    disabled={disabled}
                    onClick={onResetFilters}
                    className={styles.filterResetButton}
                    aria-label={intl.formatMessage({ id: 'flashcards.filter.reset', defaultMessage: 'Reset filters' })}
                >
                    <RotateCcw size={14} aria-hidden="true" />
                    <span>{intl.formatMessage({ id: 'flashcards.filter.reset', defaultMessage: 'Reset' })}</span>
                </button>
            )}
        </div>
    );
};
