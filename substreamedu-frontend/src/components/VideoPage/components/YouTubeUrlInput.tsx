import React from 'react';
import { useIntl } from 'react-intl';
import { YouTubeValidationResult } from '../../../utils/youtubeValidation';

import Check from 'lucide-react/dist/esm/icons/check';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Clipboard from 'lucide-react/dist/esm/icons/clipboard';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import styles from './YouTubeUrlInput.module.css';

interface YouTubeUrlInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    validation: YouTubeValidationResult | null;
    isLoading: boolean;
    disabled?: boolean;
}

export const YouTubeUrlInput: React.FC<YouTubeUrlInputProps> = ({
    value,
    onChange,
    onSubmit,
    validation,
    isLoading,
    disabled = false
}) => {
    const intl = useIntl();

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !disabled && !isLoading && value.trim()) {
            onSubmit();
        }
    };

    const handlePasteFromClipboard = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text && text.trim()) {
                    onChange(text.trim());
                }
            } else {
                alert('Clipboard API not supported. Please paste manually.');
            }
        } catch (error) {
            console.warn('Failed to read from clipboard:', error);
        }
    };

    const handleClearInput = () => {
        onChange('');
    };

    return (
        <div className={styles.container}>
            <div className={styles.textSection}>
                <p className={styles.description}>
                    {intl.formatMessage({
                        id: 'videoPage.youtubeDescription',
                        defaultMessage: 'Paste the URL of any YouTube video, and we will automatically download the subtitles.'
                    })}
                </p>
            </div>

            <div className={`${styles.inputContainer} ${validation?.isValid ? styles.valid :
                (validation?.error || (value && validation?.isValid === false)) ? styles.invalid : ''
                }`}>
                <div className={styles.youtubeIconContainer}>
                    <svg
                        className={styles.youtubeIcon}
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                    >
                        <path
                            d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
                            fill="#FD2D2D"
                        />
                    </svg>
                </div>

                <input
                    type="url"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={disabled || isLoading}
                    placeholder="e.g. https://youtu.be/dQw4w9WgxcQ"
                    className={styles.input}
                    autoComplete="off"
                    spellCheck="false"
                />

                <div className={styles.rightIcons}>
                    {validation?.isValid ? (
                        <Check size={18} className={styles.checkIcon} />
                    ) : null}
                    {value ? (
                        <button
                            type="button"
                            onClick={handleClearInput}
                            disabled={disabled || isLoading}
                            className={styles.clearButton}
                            title="Clear input"
                            aria-label="Clear input"
                        >
                            <Trash2 size={16} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handlePasteFromClipboard}
                            disabled={disabled || isLoading}
                            className={styles.pasteButton}
                            title="Paste from clipboard"
                            aria-label="Paste YouTube URL from clipboard"
                        >
                            <Clipboard size={16} />
                        </button>
                    )}
                </div>
            </div>

            {validation?.error && (
                <div
                    id="youtube-url-error"
                    className={styles.errorAlert}
                    role="alert"
                    aria-live="polite"
                >
                    <AlertTriangle size={16} className={`${styles.errorAlertIcon} shrink-0 text-red-400 inline mr-1`} />
                    <span>{validation.error}</span>
                </div>
            )}

            <div className={styles.buttonSection}>
                <button
                    onClick={onSubmit}
                    disabled={disabled || isLoading || !value.trim() || validation?.isValid === false}
                    className={styles.loadButton}
                >
                    <span className={styles.buttonText}>
                        {isLoading ? 'LOADING...' : intl.formatMessage({
                            id: 'videoPage.watch',
                            defaultMessage: 'WATCH'
                        })}
                    </span>
                </button>

                <p className={styles.hint}>
                    {intl.formatMessage({
                        id: 'videoPage.youtubeRecommended',
                        defaultMessage: 'We recommend choosing videos with English subtitles (not auto-generated) - such subtitles are processed more accurately.'
                    })}
                </p>
            </div>
        </div>
    );
};