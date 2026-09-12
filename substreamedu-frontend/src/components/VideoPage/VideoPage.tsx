import React, { useEffect, useState, useRef } from 'react';
import { SubtitleService } from '../../services/SubtitleService';
import VideoPlayer from './VideoPlayer';
import { useIntl, FormattedMessage } from 'react-intl';
import { useVideoUpload } from '../../hooks/useVideoUpload';
import { YouTubeUrlInput } from './components/YouTubeUrlInput';
import { VideoUpload } from './components/VideoUpload';
import { GoogleDriveButton } from './components/GoogleDriveButton';
import { StatusNotification } from './components/StatusNotification';
import { RecommendedChannels } from './components/RecommendedChannels';
import { QuickStartVideoPicks } from './components/QuickStartVideoPicks';
import styles from './css/VideoPage.module.css';
import ErrorBoundary from '../ErrorBoundary/ErrorBoundary';
import { motion } from 'framer-motion';

import Youtube from 'lucide-react/dist/esm/icons/youtube';
import Upload from 'lucide-react/dist/esm/icons/upload';
import Cloud from 'lucide-react/dist/esm/icons/cloud';
import Trash2 from 'lucide-react/dist/esm/icons/trash-2';
import Play from 'lucide-react/dist/esm/icons/play';

import { useRecentVideos, RecentVideo } from '../../hooks/useRecentVideos';

type VideoSource = 'youtube' | 'upload' | 'googledrive';

interface SubtitleDto {
  id: number;
  name: string;
  fileUrl: string;
}

const getYouTubeThumbnail = (videoUrl: string, existingThumbnail?: string): string | null => {
  if (existingThumbnail) return existingThumbnail;
  if (!videoUrl) return null;
  const match = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match && match[1]) {
    return `https://i.ytimg.com/vi/${match[1]}/mqdefault.jpg`;
  }
  return null;
};

interface VideoPageProps {
  hideGoogleDrive?: boolean;
}

const VideoPage: React.FC<VideoPageProps> = ({ hideGoogleDrive = false }) => {
  const intl = useIntl();
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const [recentVideos, addRecentVideo, deleteRecentVideo] = useRecentVideos();
  const [videoState, videoActions] = useVideoUpload(addRecentVideo);
  const [activeTab, setActiveTab] = useState<VideoSource>('youtube');

  const [subtitles, setSubtitles] = useState<SubtitleDto[]>([]);
  const [subtitleUploadStatus, setSubtitleUploadStatus] = useState<string | null>(null);

  const handleVideoClick = (video: RecentVideo) => {
    if (!video.videoUrl) return;
    videoActions.handleYoutubeUrlLoad(video.videoUrl);
  };

  const handleDeleteVideo = (videoId: string) => {
    deleteRecentVideo(videoId);
  };

  useEffect(() => {
    const checkStorage = () => {
      const storedVideoUrl = sessionStorage.getItem('videoUrl');
      if (!storedVideoUrl) {
        sessionStorage.removeItem('subtitleName');
        sessionStorage.removeItem('videoSubtitles');
        return;
      }
    };

    checkStorage();
    fetchSubtitles();

    window.addEventListener('storage', checkStorage);
    return () => window.removeEventListener('storage', checkStorage);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('videoUrl');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  useEffect(() => {
    if (videoState.videoUrl && videoContainerRef.current) {
      setTimeout(() => {
        const headerOffset = 76;
        const element = videoContainerRef.current;
        if (element) {
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          window.scrollTo({
            top: Math.max(0, offsetPosition),
            behavior: 'smooth'
          });
        }
      }, 300);
    }
  }, [videoState.videoUrl]);

  const fetchSubtitles = async () => {
    try {
      const subtitles = await SubtitleService.fetchAllSubtitles();
      setSubtitles(subtitles);
    } catch (err) {
      console.error('Failed to fetch subtitles:', err);
    }
  };

  const validateFileName = (fileName: string): string => {
    const validNameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!validNameRegex.test(fileName)) {
      return intl.formatMessage({ id: 'validation.invalidFileName', defaultMessage: 'Invalid file name. Use only letters, numbers, dots, underscores, and hyphens.' });
    }
    if (fileName.length > 50) {
      return intl.formatMessage({ id: 'validation.fileNameTooLong', defaultMessage: 'File name is too long. Maximum 50 characters.' });
    }
    return '';
  };

  const handleSubtitleUpload = async (file: File) => {
    const fileNameValidationError = validateFileName(file.name);
    if (fileNameValidationError) {
      videoActions.clearError();
      setSubtitleUploadStatus(`Error: ${fileNameValidationError}`);
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await SubtitleService.uploadSubtitles(formData);
      setSubtitleUploadStatus(intl.formatMessage({ id: 'videoPage.subtitleUploaded' }, { fileName: file.name }));
      fetchSubtitles();

      setTimeout(() => {
        setSubtitleUploadStatus(null);
      }, 3000);
    } catch {
      setSubtitleUploadStatus(intl.formatMessage({ id: 'videoPage.subtitleUploadError' }));
      setTimeout(() => {
        setSubtitleUploadStatus(null);
      }, 5000);
    }
  };

  const parseDoTags = (message: string): (string | JSX.Element)[] => {
    const parts = message.split(/(<do>.*?<\/do>)/g);
    return parts.map((part: string, index: number) => {
      if (part.startsWith('<do>') && part.endsWith('</do>')) {
        const content = part.replace(/<\/?do>/g, '');
        return <span key={index} className={styles.accent}>{content}</span>;
      }
      return part;
    }).filter((part: string | JSX.Element) => part !== '');
  };

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      if (activeTab === 'youtube') setActiveTab('upload');
      else if (activeTab === 'upload' && !hideGoogleDrive) setActiveTab('googledrive');
    } else if (isRightSwipe) {
      if (activeTab === 'googledrive') setActiveTab('upload');
      else if (activeTab === 'upload') setActiveTab('youtube');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
    }
  };

  return (
    <motion.div
      className={`${styles.dashboardContainer} ${!videoState.showInfoBlock ? styles.playerMode : ''} min-h-full flex flex-col`}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      <div className={styles.ambientGlow} />
      <div className={`${styles.ambientGlow} ${styles.ambientGlowSecond}`} />
      {videoState.showInfoBlock && (
        <motion.div className={styles.headerGroup} variants={itemVariants}>
          <span className={styles.eyebrow}>03 // VIDEO PLAYER</span>
          <h1 className={styles.pageTitle}>
            {parseDoTags(intl.formatMessage({
              id: 'videoPage.uploadContent',
              defaultMessage: 'Learn with <do>video</do>'
            }))}
          </h1>
        </motion.div>
      )}

      <div className="relative z-10">
        {videoState.showInfoBlock && (
          <motion.div
            className={styles.contentWrapper}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            variants={itemVariants}
          >
            {/* 1. Balanced Tabs */}
            <motion.nav className={styles.tabNav} role="tablist" variants={itemVariants}>
              <button
                onClick={() => setActiveTab('youtube')}
                className={`${styles.tab} ${activeTab === 'youtube' ? styles.tabActive : ''}`}
                role="tab"
                aria-selected={activeTab === 'youtube'}
              >
                <Youtube size={16} strokeWidth={2} />
                <span>YouTube</span>
              </button>

              <button
                onClick={() => setActiveTab('upload')}
                className={`${styles.tab} ${activeTab === 'upload' ? styles.tabActive : ''}`}
                role="tab"
                aria-selected={activeTab === 'upload'}
              >
                <Upload size={16} strokeWidth={2} />
                <span>
                  <FormattedMessage id="videoPage.upload" defaultMessage="Upload" />
                </span>
              </button>

              {!hideGoogleDrive && (
                <button
                  onClick={() => setActiveTab('googledrive')}
                  className={`${styles.tab} ${activeTab === 'googledrive' ? styles.tabActive : ''}`}
                  role="tab"
                  aria-selected={activeTab === 'googledrive'}
                >
                  <Cloud size={16} strokeWidth={2} />
                  <span>Google Drive</span>
                </button>
              )}
            </motion.nav>

            <div className={styles.tabContent}>
              {activeTab === 'youtube' && (
                <div className={styles.youtubeTab}>
                  <YouTubeUrlInput
                    value={videoState.youtubeUrlInput}
                    onChange={videoActions.setYoutubeUrlInput}
                    onSubmit={() => videoActions.handleYoutubeUrlLoad(videoState.youtubeUrlInput)}
                    validation={videoState.youtubeValidation}
                    isLoading={videoState.isYoutubeLoading}
                  />

                  <QuickStartVideoPicks
                    onSelectVideo={videoActions.handleYoutubeUrlLoad}
                    disabled={videoState.isYoutubeLoading}
                  />

                  {/* 3. Thumbnails for Recognition & 4. Clear Data Grouping */}
                  {recentVideos.length > 0 && (
                    <motion.section className={styles.recentSection} variants={itemVariants}>
                      <h2 className={styles.sectionTitle}>
                        <FormattedMessage id="videoPage.recentlyWatched" defaultMessage="Recently watched" />
                      </h2>
                      <div className={styles.videoGrid}>
                        {recentVideos.map((video: RecentVideo) => {
                          const thumbnail = getYouTubeThumbnail(video.videoUrl, video.thumbnailUrl);

                          return (
                            <motion.div 
                              key={video.id} 
                              className={styles.videoCardWrapper}
                              whileHover={{ y: -2 }}
                            >
                              <button
                                className={styles.videoCard}
                                onClick={() => handleVideoClick(video)}
                                aria-label={intl.formatMessage({ id: 'videoPage.viewButton', defaultMessage: 'View video' })}
                              >
                                <div className={styles.videoThumbnailWrapper}>
                                  {thumbnail ? (
                                    <img
                                      src={thumbnail}
                                      alt={video.name}
                                      className={styles.videoThumbnail}
                                      onError={(e) => {
                                        (e.currentTarget as HTMLElement).style.display = 'none';
                                      }}
                                    />
                                  ) : null}
                                  <div className={styles.videoPlayOverlay}>
                                    <Play size={16} fill="currentColor" />
                                  </div>
                                </div>
                                <div className={styles.videoTextGroup}>
                                  <h3 className={styles.videoTitle}>{video.name}</h3>
                                  <time className={styles.videoDate}>{video.date}</time>
                                </div>
                              </button>
                              <button
                                className={styles.deleteButton}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteVideo(video.id);
                                }}
                                title={intl.formatMessage({ id: 'videoPage.deleteButton', defaultMessage: 'Delete video' })}
                                aria-label={intl.formatMessage({ id: 'videoPage.deleteButton', defaultMessage: 'Delete video' })}
                              >
                                <Trash2 size={15} strokeWidth={2} />
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.section>
                  )}

                  {/* 5. Channel Avatars & 6. Spacing/Hierarchy */}
                  <RecommendedChannels />
                </div>
              )}

              {activeTab === 'upload' && (
                <div className={styles.uploadTab}>
                  <VideoUpload
                    onVideoUpload={videoActions.handleVideoUpload}
                    isLoading={videoState.isYoutubeLoading}
                  />
                </div>
              )}

              {activeTab === 'googledrive' && !hideGoogleDrive && (
                <div className={styles.driveTab}>
                  <GoogleDriveButton
                    onFileSelected={videoActions.handleGoogleDriveLoad}
                    disabled={videoState.isYoutubeLoading}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}

        {(videoState.uploadStatus || subtitleUploadStatus || videoState.error) && (
          <div className={styles.notifications}>
            {videoState.uploadStatus && (
              <StatusNotification
                type="success"
                message={videoState.uploadStatus}
                onClose={() => { }}
              />
            )}

            {subtitleUploadStatus && (
              <StatusNotification
                type={subtitleUploadStatus.startsWith('Error:') ? 'error' : 'success'}
                message={subtitleUploadStatus}
                onClose={() => setSubtitleUploadStatus(null)}
              />
            )}

            {videoState.error && (
              <StatusNotification
                type="error"
                message={videoState.error}
                onClose={videoActions.clearError}
              />
            )}
          </div>
        )}

        {videoState.videoUrl && (
          <motion.div 
            className={styles.videoSection}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            <div ref={videoContainerRef} className={styles.videoPlayerWrapper}>
              <ErrorBoundary>
                <VideoPlayer
                  videoUrl={videoState.videoUrl}
                  mimeType={videoState.mimeType || 'video/mp4'}
                  subtitles={subtitles}
                  onSubtitleSelect={() => { }}
                  fetchSubtitles={fetchSubtitles}
                  onSubtitleUpload={handleSubtitleUpload}
                  isExtractingSubtitles={videoState.isExtractingSubtitles}
                  onSelectAnotherVideo={videoActions.handleSelectAnotherVideo}
                />
              </ErrorBoundary>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

export default VideoPage;