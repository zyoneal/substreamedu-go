import React, { FC, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useIntl } from 'react-intl';
import { SUPPORTED_LANGUAGES } from '../../constants/languageConfig';
import { getRecommendedLanguages, getSortedLanguages } from '../../utils/languageUtils';
import { ChevronDown, Check } from 'lucide-react';
import styles from './LanguageSelector.module.css';

interface LanguageSelectorProps {
    currentLanguage: string;
    onLanguageSelect: (code: string) => void;
    detectedRegion?: string; 
}

const LanguageSelector: FC<LanguageSelectorProps> = ({
    currentLanguage,
    onLanguageSelect,
    detectedRegion = 'US'
}) => {
    const intl = useIntl();
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const recommendedLanguages = useMemo(() =>
        getRecommendedLanguages(currentLanguage, detectedRegion),
        [currentLanguage, detectedRegion]
    );

    const allLanguages = useMemo(() =>
        getSortedLanguages(currentLanguage, detectedRegion, navigator.language),
        [currentLanguage, detectedRegion]
    );

    const currentLangConfig = SUPPORTED_LANGUAGES.find(l => l.code === currentLanguage && l.code !== 'en');
    const isLanguageSelected = Boolean(currentLangConfig);

    const handleSelect = (code: string) => {
        if (code === 'en') return;
        onLanguageSelect(code);
        setIsOpen(false);
    };

    return (
        <div className={styles.container} ref={containerRef}>
            <button
                className={styles.button}
                onClick={() => setIsOpen(!isOpen)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={intl.formatMessage({ id: 'selectLanguage', defaultMessage: 'Select language' })}
            >
                <span className={`${styles.currentLang} ${!isLanguageSelected ? styles.notSelected : ''}`}>
                    {isLanguageSelected
                        ? currentLangConfig!.label
                        : intl.formatMessage({ id: 'selectLanguage', defaultMessage: 'Select language' })}
                </span>
                <div className={styles.chevronWrapper}>
                    <ChevronDown size={16} strokeWidth={2.5} className={`${styles.chevronIcon} ${!isLanguageSelected ? styles.notSelectedChevron : ''}`} />
                </div>
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className={styles.dropdown}
                        role="listbox"
                        initial={{ opacity: 0, scale: 0.95, y: -4 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -4 }}
                        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        style={{ transformOrigin: "top right" }}
                    >
                        {recommendedLanguages.length > 0 && (
                            <>
                                <div className={styles.sectionTitle}>
                                    {intl.formatMessage({ id: 'recommended', defaultMessage: 'Recommended' })}
                                </div>
                                <ul className={styles.list}>
                                    {recommendedLanguages.map(lang => (
                                        <li
                                            key={`rec-${lang.code}`}
                                            className={styles.item}
                                            onClick={() => handleSelect(lang.code)}
                                            role="option"
                                            aria-selected={currentLanguage === lang.code}
                                            dir={lang.dir}
                                        >
                                            <span>{lang.label}</span>
                                            {currentLanguage === lang.code && (
                                                <span className={styles.checkIcon}><Check size={14} strokeWidth={2.5} /></span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                                <div className={styles.divider} />
                            </>
                        )}

                        <div className={styles.sectionTitle}>
                            {intl.formatMessage({ id: 'allLanguages', defaultMessage: 'All languages' })}
                        </div>
                        <div className={styles.scrollArea}>
                            <ul className={styles.list}>
                                {allLanguages.map(lang => (
                                    <li
                                        key={lang.code}
                                        className={styles.item}
                                        onClick={() => handleSelect(lang.code)}
                                        role="option"
                                        aria-selected={currentLanguage === lang.code}
                                        dir={lang.dir}
                                    >
                                        <span>{lang.label}</span>
                                        {currentLanguage === lang.code && (
                                            <span className={styles.checkIcon}><Check size={14} strokeWidth={2.5} /></span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default LanguageSelector;
