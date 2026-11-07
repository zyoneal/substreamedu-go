import React from 'react';
import { useIntl } from 'react-intl';
import { SearchableSelect } from '../../shared/SearchableSelect';
import styles from '../css/VideoPlayerPopover.module.css';

export interface SubtitleSelectionBarProps {
    subtitles?: { name: string }[];
    fileName?: string;
    isSearchingSubtitles: boolean;
    subtitleInputRef: React.RefObject<HTMLInputElement>;
    onSelectSubtitle: (value: string) => void;
    onSearchSubtitles: () => void;
    onUploadSubtitles: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SubtitleSelectionBar: React.FC<SubtitleSelectionBarProps> = ({
    subtitles,
    fileName,
    isSearchingSubtitles,
    subtitleInputRef,
    onSelectSubtitle,
    onSearchSubtitles,
    onUploadSubtitles,
}) => {
    const intl = useIntl();
    const hasSubtitles = Boolean(subtitles && subtitles.length > 0);

    return (
        <div className={styles.subtitleContainer}>
            <div className={styles.innerSubtitlesContainer}>
                <div className={styles.subtitleSelectionRow}>
                    {hasSubtitles && (
                        <div style={{ flexShrink: 0, minWidth: '250px', maxWidth: '350px', width: '100%' }}>
                            <SearchableSelect
                                options={subtitles || []}
                                value={fileName || ''}
                                onChange={onSelectSubtitle}
                                placeholder={intl.formatMessage({ id: 'videoPlayer.selectSubtitles' })}
                                noOptionsMessage={intl.formatMessage({ id: 'noSubtitlesFound', defaultMessage: 'No subtitles found' })}
                            />
                        </div>
                    )}
                    <p className={styles.subtitleSectionDescription}>
                        {hasSubtitles
                            ? "If you haven't selected subtitles for this video yet, you can search for suitable ones or upload your own."
                            : "Automatic subtitle search available! Click 'Search Subtitles' or upload your own .srt file."
                        }
                    </p>
                    <button
                        type="button"
                        onClick={onSearchSubtitles}
                        className={styles.minimalistButton}
                        disabled={isSearchingSubtitles}
                        aria-label={isSearchingSubtitles ? 'Searching subtitles' : 'Search Subtitles'}
                    >
                        {isSearchingSubtitles ? 'Searching...' : 'Search Subtitles'}
                    </button>
                    <label htmlFor="subtitle-upload-player" className={styles.minimalistButton}>
                        Upload Subtitles
                    </label>
                    <input
                        id="subtitle-upload-player"
                        ref={subtitleInputRef}
                        type="file"
                        accept=".srt,.vtt"
                        onChange={onUploadSubtitles}
                        className="sr-only"
                    />
                </div>
            </div>
        </div>
    );
};
