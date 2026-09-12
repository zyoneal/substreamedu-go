import React, { useState, useRef, useEffect, useMemo } from 'react';
import styles from './SearchableSelect.module.css';

interface SearchableSelectProps {
    options: { name: string }[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    noOptionsMessage?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Search...',
    noOptionsMessage = 'No options found'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(0);
    const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        
        const query = searchQuery.toLowerCase();
        return options.filter(option => 
            option.name.toLowerCase().includes(query)
        ).sort((a, b) => {
            const aIndex = a.name.toLowerCase().indexOf(query);
            const bIndex = b.name.toLowerCase().indexOf(query);
            if (aIndex !== bIndex) return aIndex - bIndex;
            return a.name.localeCompare(b.name);
        });
    }, [options, searchQuery]);

    useEffect(() => {
        setHighlightedIndex(0);
    }, [searchQuery]);

    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
            if (highlightedElement) {
                highlightedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
        }
    }, [highlightedIndex, isOpen]);

    useEffect(() => {
        if (isOpen && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const dropdownHeight = 400;

            if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                setDropdownPosition('top');
            } else {
                setDropdownPosition('bottom');
            }
        }
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!isOpen && (e.key === 'Enter' || e.key === 'ArrowDown')) {
            e.preventDefault();
            setIsOpen(true);
            return;
        }

        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightedIndex(prev => 
                    prev < filteredOptions.length - 1 ? prev + 1 : prev
                );
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightedIndex(prev => prev > 0 ? prev - 1 : 0);
                break;
            case 'Enter':
                e.preventDefault();
                if (filteredOptions[highlightedIndex]) {
                    handleSelect(filteredOptions[highlightedIndex].name);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchQuery('');
                inputRef.current?.blur();
                break;
        }
    };

    const handleSelect = (optionName: string) => {
        onChange(optionName);
        setIsOpen(false);
        setSearchQuery('');
        inputRef.current?.blur();
    };

    const highlightMatch = (text: string, query: string) => {
        if (!query.trim()) return text;
        
        const parts = text.split(new RegExp(`(${query})`, 'gi'));
        return (
            <>
                {parts.map((part, index) => 
                    part.toLowerCase() === query.toLowerCase() ? (
                        <span key={index} className={styles.highlight}>{part}</span>
                    ) : (
                        <span key={index}>{part}</span>
                    )
                )}
            </>
        );
    };

    const selectedOption = options.find(opt => opt.name === value);

    return (
        <div className={styles.container} ref={containerRef}>
            <div 
                className={`${styles.inputWrapper} ${isOpen ? styles.open : ''}`}
                onClick={() => {
                    setIsOpen(true);
                    inputRef.current?.focus();
                }}
            >
                <input
                    ref={inputRef}
                    type="text"
                    className={styles.input}
                    placeholder={selectedOption ? selectedOption.name : placeholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onFocus={() => setIsOpen(true)}
                    onKeyDown={handleKeyDown}
                />
                <svg 
                    className={`${styles.arrow} ${isOpen ? styles.arrowOpen : ''}`}
                    width="20" 
                    height="20" 
                    viewBox="0 0 20 20" 
                    fill="none"
                >
                    <path 
                        d="M5 7.5L10 12.5L15 7.5" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {isOpen && (
                <div 
                    className={`${styles.dropdown} ${dropdownPosition === 'top' ? styles.dropdownTop : styles.dropdownBottom}`} 
                    ref={dropdownRef}
                >
                    {filteredOptions.length > 0 ? (
                        <>
                            <div className={styles.resultsCount}>
                                {filteredOptions.length} {filteredOptions.length === 1 ? 'result' : 'results'}
                            </div>
                            {filteredOptions.map((option, index) => (
                                <div
                                    key={option.name}
                                    className={`${styles.option} ${
                                        index === highlightedIndex ? styles.highlighted : ''
                                    } ${option.name === value ? styles.selected : ''}`}
                                    onClick={() => handleSelect(option.name)}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    {highlightMatch(option.name, searchQuery)}
                                </div>
                            ))}
                        </>
                    ) : (
                        <div className={styles.noOptions}>{noOptionsMessage}</div>
                    )}
                </div>
            )}
        </div>
    );
};
