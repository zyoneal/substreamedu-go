import React, { useState } from 'react';

import Search from 'lucide-react/dist/esm/icons/search';
import X from 'lucide-react/dist/esm/icons/x';
import { Button } from '../ui/button';
import styles from './SongSearchBar.module.css';
import { useIntl } from 'react-intl';

interface SongSearchBarProps {
    onSearch: (query: string) => void;
    loading?: boolean;
}

export const SongSearchBar: React.FC<SongSearchBarProps> = ({ onSearch, loading }) => {
    const intl = useIntl();
    const [query, setQuery] = useState('');

    const handleSearch = () => {
        if (query.trim()) {
            onSearch(query);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.searchRow}>
                <div className={styles.searchInputWrapper}>
                    <Search className={styles.searchIcon} size={18} />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder={intl.formatMessage({
                            id: 'songs.searchPlaceholder',
                            defaultMessage: 'Search for any song...'
                        })}
                        className={styles.searchInput}
                        disabled={loading}
                    />
                    {query && (
                        <button
                            onClick={() => setQuery('')}
                            className={styles.clearButton}
                            type="button"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                <Button
                    onClick={handleSearch}
                    disabled={!query.trim() || loading}
                    className={styles.searchButton}
                >
                    {loading ? intl.formatMessage({
                        id: 'songs.loading',
                        defaultMessage: 'Loading...'
                    }) : intl.formatMessage({
                        id: 'songs.searchButton',
                        defaultMessage: 'Search'
                    })}
                </Button>
            </div>
        </div>
    );
};
