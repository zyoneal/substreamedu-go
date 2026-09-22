import React, { useState } from 'react';
import { useIntl } from 'react-intl';

import Cloud from 'lucide-react/dist/esm/icons/cloud';
import Check from 'lucide-react/dist/esm/icons/check';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import LinkIcon from 'lucide-react/dist/esm/icons/link';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Info from 'lucide-react/dist/esm/icons/info';

import { GoogleDriveService } from '../../../services/GoogleDriveService';
import { GoogleDriveFile } from '../../../types/googleDriveTypes';
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
    const [isLoading, setIsLoading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
    const [error, setError] = useState<string>('');
    const [linkInput, setLinkInput] = useState<string>('');

    const handleSelectFile = async () => {
        setIsLoading(true);
        setError('');

        try {
            const file = await GoogleDriveService.selectVideoFile();

            if (file) {
                setSelectedFile(file);
                onFileSelected(file.id, file.name);
            }
        } catch (err: any) {
            console.error('Error selecting Google Drive file:', err);
            const rawMsg = err?.message || '';
            const isUserCancel = rawMsg.includes('cancelled') || rawMsg.includes('closed');

            if (!isUserCancel) {
                setError(
                    intl.formatMessage({
                        id: 'videoPage.googleDriveError',
                        defaultMessage: 'Failed to access Google Drive. Please try again.',
                    })
                );
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleLinkSubmit = () => {
        const trimmed = linkInput.trim();
        if (!trimmed) return;

        setError('');
        const fileId = GoogleDriveService.extractFileId(trimmed);

        if (!fileId) {
            setError(
                intl.formatMessage({
                    id: 'videoPage.googleDriveInvalidLink',
                    defaultMessage: 'Please enter a valid Google Drive video link.',
                })
            );
            return;
        }

        onFileSelected(fileId, 'Google Drive Video');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleLinkSubmit();
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.contentColumn}>
                {/* 1. Direct Link Input Form */}
                <div className={styles.directInputCard}>
                    <div className={styles.inputWrapper}>
                        <LinkIcon size={16} className={styles.inputIcon} />
                        <input
                            type="text"
                            value={linkInput}
                            onChange={(e) => setLinkInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={intl.formatMessage({
                                id: 'videoPage.googleDriveLinkPlaceholder',
                                defaultMessage: 'Paste Google Drive video link...',
                            })}
                            disabled={disabled || isLoading}
                            className={styles.linkInput}
                        />
                        <button
                            type="button"
                            onClick={handleLinkSubmit}
                            disabled={disabled || isLoading || !linkInput.trim()}
                            className={styles.loadButton}
                        >
                            <span>
                                {intl.formatMessage({
                                    id: 'videoPage.googleDriveLoad',
                                    defaultMessage: 'Load',
                                })}
                            </span>
                            <ArrowRight size={14} />
                        </button>
                    </div>
                </div>

                {/* 2. Visual Divider */}
                <div className={styles.dividerRow}>
                    <div className={styles.dividerLine} />
                    <span className={styles.dividerText}>
                        {intl.formatMessage({
                            id: 'videoPage.googleDriveOr',
                            defaultMessage: 'or',
                        })}
                    </span>
                    <div className={styles.dividerLine} />
                </div>

                {/* 3. Google Picker Trigger Button */}
                <button
                    onClick={handleSelectFile}
                    disabled={disabled || isLoading}
                    className={styles.googleDriveButton}
                    type="button"
                >
                    <div className={styles.buttonContent}>
                        {isLoading ? (
                            <>
                                <Loader2 className={`${styles.icon} animate-spin`} />
                                <span>
                                    {intl.formatMessage({
                                        id: 'videoPage.loading',
                                        defaultMessage: 'Loading...',
                                    })}
                                </span>
                            </>
                        ) : selectedFile ? (
                            <>
                                <Check className={styles.icon} />
                                <span className="truncate max-w-xs">{selectedFile.name}</span>
                            </>
                        ) : (
                            <>
                                <Cloud className={styles.icon} />
                                <span>
                                    {intl.formatMessage({
                                        id: 'videoPage.selectFromDrive',
                                        defaultMessage: 'Select from Google Drive',
                                    })}
                                </span>
                            </>
                        )}
                    </div>
                </button>

                {error && (
                    <div className={styles.errorContainer} role="alert">
                        <AlertTriangle size={18} className="text-red-400 shrink-0" />
                        <span>{error}</span>
                    </div>
                )}

                <p className={styles.hint}>
                    {intl.formatMessage({
                        id: 'videoPage.googleDriveHint',
                        defaultMessage:
                            'Your videos stay in your Google Drive. We only stream them, never store them.',
                    })}
                </p>

                {/* 4. Permissions & Sharing Notice */}
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
