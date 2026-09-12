import React, { useState } from 'react';
import { useIntl } from 'react-intl';

import Cloud from 'lucide-react/dist/esm/icons/cloud';
import Check from 'lucide-react/dist/esm/icons/check';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
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

    const handleSelectFile = async () => {
        setIsLoading(true);
        setError('');

        try {
            const file = await GoogleDriveService.selectVideoFile();

            if (file) {
                setSelectedFile(file);
                onFileSelected(file.id, file.name);
            }
        } catch (err) {
            console.error('Error selecting Google Drive file:', err);
            setError(
                intl.formatMessage({
                    id: 'videoPage.googleDriveError',
                    defaultMessage: 'Failed to access Google Drive. Please try again.',
                })
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {}
            <div className="flex flex-col items-center gap-4 w-full">
                <button
                    onClick={handleSelectFile}
                    disabled={disabled || isLoading}
                    className={styles.googleDriveButton}
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

                {}
                <div className={styles.noticeContainer}>
                    <div className={styles.noticeRow}>
                        <span className="text-lg">ℹ️</span>
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
