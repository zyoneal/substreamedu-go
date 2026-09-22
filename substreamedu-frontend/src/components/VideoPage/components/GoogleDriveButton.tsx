import React, { useState } from 'react';
import { useIntl } from 'react-intl';

import Cloud from 'lucide-react/dist/esm/icons/cloud';
import Film from 'lucide-react/dist/esm/icons/film';
import Check from 'lucide-react/dist/esm/icons/check';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Clipboard from 'lucide-react/dist/esm/icons/clipboard';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import Info from 'lucide-react/dist/esm/icons/info';

import { GoogleDriveService } from '../../../services/GoogleDriveService';
import styles from './GoogleDriveButton.module.css';

interface GoogleDriveButtonProps {
    onFileSelected: (fileId: string, fileName: string) => void;
    disabled?: boolean;
}

export const GoogleDriveButton: React.FC<GoogleDriveButtonProps> = ({
    onFileSelected,
    disabled = false,
}) => {
    const intl = useIntl();
    const [linkInput, setLinkInput] = useState<string>('');
    const [titleInput, setTitleInput] = useState<string>('');
    const [error, setError] = useState<string>('');

    const trimmedInput = linkInput.trim();
    const fileId = trimmedInput ? GoogleDriveService.extractFileId(trimmedInput) : null;
    const isValid = trimmedInput.length > 0 ? Boolean(fileId) : null;

    const handleSubmit = () => {
        if (!trimmedInput) return;

        if (!fileId) {
            setError(
                intl.formatMessage({
                    id: 'videoPage.googleDriveInvalidLink',
                    defaultMessage: 'Please enter a valid Google Drive video link.',
                })
            );
            return;
        }

        setError('');
        const fileTitle = titleInput.trim() || 'Google Drive Video';
        onFileSelected(fileId, fileTitle);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !disabled && trimmedInput) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handlePasteFromClipboard = async () => {
        try {
            if (navigator.clipboard && navigator.clipboard.readText) {
                const text = await navigator.clipboard.readText();
                if (text && text.trim()) {
                    setLinkInput(text.trim());
                    setError('');
                }
            }
        } catch (clipErr) {
            console.warn('Failed to read from clipboard:', clipErr);
        }
    };

    const handleClearInput = () => {
        setLinkInput('');
        setError('');
    };

    return (
        <div className={styles.container}>
            <div className={styles.textSection}>
                <p className={styles.description}>
                    {intl.formatMessage({
                        id: 'videoPage.googleDriveDescription',
                        defaultMessage: 'Paste the link of any Google Drive video, and we will stream it directly.',
                    })}
                </p>
            </div>

            <div className={styles.formFields}>
                <div className={styles.fieldGroup}>
                    <div
                        className={`${styles.inputContainer} ${
                            isValid === true ? styles.valid : error || isValid === false ? styles.invalid : ''
                        }`}
                    >
                        <div className={styles.driveIconContainer}>
                            <Cloud className={styles.driveIcon} />
                        </div>

                        <input
                            type="url"
                            value={linkInput}
                            onChange={(e) => {
                                setLinkInput(e.target.value);
                                if (error) setError('');
                            }}
                            onKeyDown={handleKeyDown}
                            disabled={disabled}
                            placeholder={intl.formatMessage({
                                id: 'videoPage.googleDriveLinkPlaceholder',
                                defaultMessage: 'e.g. https://drive.google.com/file/d/1BxiMVs.../view',
                            })}
                            className={styles.input}
                            autoComplete="off"
                            spellCheck="false"
                        />

                        <div className={styles.rightIcons}>
                            {isValid === true && <Check size={18} className={styles.checkIcon} />}
                            {linkInput ? (
                                <button
                                    type="button"
                                    onClick={handleClearInput}
                                    disabled={disabled}
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
                                    disabled={disabled}
                                    className={styles.pasteButton}
                                    title="Paste from clipboard"
                                    aria-label="Paste Google Drive link from clipboard"
                                >
                                    <Clipboard size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>
                        {intl.formatMessage({
                            id: 'videoPage.googleDriveTitleLabel',
                            defaultMessage: 'Movie or series title (for subtitle search)',
                        })}
                    </label>
                    <div className={styles.titleInputContainer}>
                        <div className={styles.driveIconContainer}>
                            <Film className={styles.titleIcon} />
                        </div>

                        <input
                            type="text"
                            value={titleInput}
                            onChange={(e) => setTitleInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={disabled}
                            placeholder={intl.formatMessage({
                                id: 'videoPage.googleDriveTitlePlaceholder',
                                defaultMessage: 'e.g. Inception 2010, Friends S01E01 (optional)',
                            })}
                            className={styles.input}
                            autoComplete="off"
                            spellCheck="false"
                        />

                        {titleInput && (
                            <div className={styles.rightIcons}>
                                <button
                                    type="button"
                                    onClick={() => setTitleInput('')}
                                    disabled={disabled}
                                    className={styles.clearButton}
                                    title="Clear title"
                                    aria-label="Clear title input"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {error && (
                <div className={styles.errorAlert} role="alert" aria-live="polite">
                    <AlertTriangle size={16} className="shrink-0 text-red-400 inline mr-1" />
                    <span>{error}</span>
                </div>
            )}

            <div className={styles.buttonSection}>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={disabled || !trimmedInput || isValid === false}
                    className={styles.loadButton}
                >
                    <span className={styles.buttonText}>
                        {intl.formatMessage({
                            id: 'videoPage.googleDriveLoad',
                            defaultMessage: 'LOAD VIDEO',
                        })}
                    </span>
                </button>

                <p className={styles.hint}>
                    {intl.formatMessage({
                        id: 'videoPage.googleDriveHint',
                        defaultMessage:
                            'Your videos stay in your Google Drive. We only stream them, never store them.',
                    })}
                </p>

                <div className={styles.noticeContainer}>
                    <div className={styles.noticeRow}>
                        <Info size={18} className="text-mute shrink-0 mt-0.5" />
                        <div className={styles.noticeContent}>
                            <p className={styles.noticeTitle}>
                                {intl.formatMessage({
                                    id: 'videoPage.googleDriveSharingTitle',
                                    defaultMessage: 'Important: Video sharing settings',
                                })}
                            </p>
                            <p className={styles.noticeText}>
                                {intl.formatMessage({
                                    id: 'videoPage.googleDriveSharingMessage',
                                    defaultMessage:
                                        'The video you select must be set to "Anyone with the link can view" in Google Drive. Otherwise, the video will not play.',
                                })}
                            </p>
                            <p className={styles.noticeInstructions}>
                                {intl.formatMessage({
                                    id: 'videoPage.googleDriveSharingInstructions',
                                    defaultMessage:
                                        'Right-click the video in Google Drive → Share → Change to "Anyone with the link"',
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
