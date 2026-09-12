import React, { useRef } from 'react';
import { useIntl } from 'react-intl';
import styles from './VideoUpload.module.css';
import videoIcon from '../../../assets/icons/video-icon.svg';

interface VideoUploadProps {
  onVideoUpload: (file: File) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

export const VideoUpload: React.FC<VideoUploadProps> = ({
  onVideoUpload,
  isLoading = false,
  disabled = false
}) => {
  const intl = useIntl();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onVideoUpload(file);
    }
  };

  const handleOpenVideoClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp4,.mkv,.webm,video/*"
        onChange={handleFileInputChange}
        disabled={disabled || isLoading}
        className={styles.hiddenInput}
      />

      {}
      <div className={styles.textSection}>
        <h2 className={styles.title}>
          {intl.formatMessage({
            id: 'videoPage.uploadTitle',
            defaultMessage: 'Upload Your Content'
          })}
        </h2>
        <div className={styles.description}>
          <p className={styles.descriptionMain}>
            {intl.formatMessage({
              id: 'videoPage.uploadDescription',
              defaultMessage: 'Open your video in the correct format (MP4, MKV, WebM):'
            })}
          </p>
          <div className={styles.formatGroup}>
            <p className={styles.formatLine}>
              <span className={styles.formatLabel}>
                {intl.formatMessage({
                  id: 'videoPage.movieFormat',
                  defaultMessage: 'Movies: MovieName.YEAR.mp4 / .mkv'
                })}
              </span>
            </p>
            <p className={styles.exampleLine}>
              {intl.formatMessage({
                id: 'videoPage.movieExample',
                defaultMessage: 'Example: Ratatouille.2007.mp4'
              })}
            </p>
          </div>
          <div className={styles.formatGroup}>
            <p className={styles.formatLine}>
              <span className={styles.formatLabel}>
                {intl.formatMessage({
                  id: 'videoPage.seriesFormat',
                  defaultMessage: 'TV Series: SerialName.S01E01.mp4 / .mkv'
                })}
              </span>
            </p>
            <p className={styles.exampleLine}>
              {intl.formatMessage({
                id: 'videoPage.seriesExample',
                defaultMessage: 'Example: The.Summer.I.Turned.Pretty.S01E01.mkv'
              })}
            </p>
          </div>
        </div>

      </div>

      { }
      <div className={styles.buttonSection}>
        <button
          onClick={handleOpenVideoClick}
          disabled={disabled || isLoading}
          className={styles.openVideoButton}
        >
          <img src={videoIcon} alt="Video Icon" className={styles.videoIcon} />
          <span className={styles.buttonText}>
            {isLoading ? 'Loading...' : intl.formatMessage({
              id: 'upload.video',
              defaultMessage: 'Open video'
            })}
          </span>
        </button>
      </div>

      { }
      <div className={styles.bottomText}>
        <p className={styles.formatInfo}>
          {intl.formatMessage({
            id: 'videoPage.supportedFormats',
            defaultMessage: 'Upload video and subtitle files from your computer'
          })}
        </p>
      </div>
    </div>
  );
};