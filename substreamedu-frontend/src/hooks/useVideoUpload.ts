import { useState, useCallback } from 'react';
import { validateYouTubeUrl, YouTubeValidationResult } from '../utils/youtubeValidation';
import { RecentVideo } from './useRecentVideos';
import { YouTubeService } from '../services/YouTubeService';
import { getVideoMimeTypeFromFile } from '../utils/videoMimeTypes';
import { GoogleDriveService } from '../services/GoogleDriveService';
import { debugLog } from '../utils/debug';
import { SubtitleService } from '../services/SubtitleService';
import { CURATED_DEMO_VIDEOS } from '../components/VideoPage/components/QuickStartVideoPicks';

export interface VideoUploadState {
  videoUrl: string | null;
  youtubeUrlInput: string;
  isYoutubeLoading: boolean;
  error: string;
  uploadStatus: string | null;
  showInfoBlock: boolean;
  mimeType: string | null;
  youtubeValidation: YouTubeValidationResult | null;
  isExtractingSubtitles: boolean;
}

export interface VideoUploadActions {
  setYoutubeUrlInput: (url: string) => void;
  handleYoutubeUrlLoad: (url: string, initialTitle?: string, initialThumb?: string) => void;
  handleVideoUpload: (file: File) => void;
  handleGoogleDriveLoad: (fileId: string, fileName: string) => void;
  handleSelectAnotherVideo: () => void;
  clearError: () => void;
  validateYoutubeInput: (url: string) => YouTubeValidationResult;
}

export const useVideoUpload = (
  onVideoLoad: (video: RecentVideo) => void
): [VideoUploadState, VideoUploadActions] => {
  const [videoUrl, setVideoUrl] = useState<string | null>(
    sessionStorage.getItem('videoUrl') || null
  );
  const [youtubeUrlInput, setYoutubeUrlInput] = useState<string>('');
  const [isYoutubeLoading, setIsYoutubeLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [showInfoBlock, setShowInfoBlock] = useState<boolean>(!videoUrl);
  const [mimeType, setMimeType] = useState<string | null>(
    sessionStorage.getItem('videoMimeType') || null
  );
  const [youtubeValidation, setYoutubeValidation] = useState<YouTubeValidationResult | null>(null);
  const [isExtractingSubtitles, setIsExtractingSubtitles] = useState<boolean>(false);

  const validateYoutubeInput = useCallback((url: string): YouTubeValidationResult => {
    const validation = validateYouTubeUrl(url);
    setYoutubeValidation(validation);
    return validation;
  }, []);

  const handleYoutubeUrlInputChange = useCallback((url: string) => {
    setYoutubeUrlInput(url);
    setError('');

    if (url.trim()) {
      validateYoutubeInput(url.trim());
    } else {
      setYoutubeValidation(null);
    }
  }, [validateYoutubeInput]);

  const handleYoutubeUrlLoad = useCallback(async (url: string, initialTitle?: string, initialThumb?: string) => {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
      setError('Please enter a YouTube URL');
      return;
    }

    const validation = validateYouTubeUrl(trimmedUrl);

    if (!validation.isValid) {
      setError(validation.error || 'Invalid YouTube URL');
      return;
    }

    // Determine title & thumbnail immediately (from props, curated picks, or videoId fallback)
    const curatedMatch = CURATED_DEMO_VIDEOS.find(
      v => v.url === trimmedUrl || (validation.videoId && v.url.includes(validation.videoId))
    );
    const effectiveTitle = initialTitle || curatedMatch?.title || (validation.videoId ? `YouTube (${validation.videoId})` : 'YouTube Video');
    const effectiveThumb = initialThumb || curatedMatch?.thumbnailUrl || (validation.videoId ? `https://i.ytimg.com/vi/${validation.videoId}/mqdefault.jpg` : undefined);

    // 1. INSTANT TRANSITION: Mount player immediately with zero waiting
    setVideoUrl(trimmedUrl);
    sessionStorage.setItem('videoUrl', trimmedUrl);
    sessionStorage.removeItem('videoCurrentTime');
    sessionStorage.removeItem('videoMimeType');
    setShowInfoBlock(false);
    setYoutubeUrlInput('');
    setYoutubeValidation(null);
    setError('');

    const initialVideo: RecentVideo = {
      id: new Date().toISOString(),
      name: effectiveTitle,
      date: new Date().toLocaleString(),
      videoUrl: trimmedUrl,
      thumbnailUrl: effectiveThumb,
    };
    onVideoLoad(initialVideo);

    // 2. If title wasn't predefined (i.e. custom user URL), fetch metadata in background to update RecentVideo
    if (!curatedMatch && !initialTitle && validation.videoId) {
      setIsYoutubeLoading(true);
      try {
        const videoInfo = await YouTubeService.getVideoInfo(validation.videoId);
        if (videoInfo?.title) {
          onVideoLoad({
            ...initialVideo,
            name: videoInfo.title,
            thumbnailUrl: videoInfo.thumbnailUrl || initialVideo.thumbnailUrl,
          });
        }
      } catch (err) {
        debugLog('Background YouTube info fetch non-fatal:', err);
      } finally {
        setIsYoutubeLoading(false);
      }
    }
  }, [onVideoLoad]);

  const handleVideoUpload = useCallback((file: File) => {
    if (!file) return;

    const mimeType = getVideoMimeTypeFromFile(file);
    const isMkv = file.name.toLowerCase().endsWith('.mkv');

    if (!file.type.startsWith('video/') && !isMkv && mimeType === 'video/mp4') {
      
      
      setError('Please select a valid video file');
      return;
    }

    setMimeType(mimeType);

    try {
      const url = URL.createObjectURL(file);

      setVideoUrl(url);
      sessionStorage.setItem('videoUrl', url);
      sessionStorage.setItem('videoFileName', file.name);
      sessionStorage.setItem('videoMimeType', mimeType);
      sessionStorage.removeItem('videoCurrentTime');
      sessionStorage.removeItem('videoSubtitles'); 
      sessionStorage.removeItem('availableSubtitleTracks'); 
      setShowInfoBlock(false);
      setError('');
      setUploadStatus(`Video "${file.name}" uploaded successfully`);

      if (isMkv) {
        setUploadStatus(`Extracting subtitles from "${file.name}"...`);
        setIsExtractingSubtitles(true);
        import('../utils/mkvSubtitleExtractor').then(({ extractSubtitlesFromMkv }) => {
          extractSubtitlesFromMkv(file).then(result => {
            const { subtitles, files, warnings, info } = result;

            if (warnings.length > 0) {
              debugLog('MKV Extraction Warnings:', warnings);
            }
            if (info.length > 0) {
              debugLog('MKV Extraction Info:', info);
            }

            if (subtitles.length > 0) {
              sessionStorage.setItem('availableSubtitleTracks', JSON.stringify(subtitles));
              
              window.dispatchEvent(new CustomEvent('localSubtitlesLoaded', { detail: subtitles }));
              setUploadStatus(`Found ${subtitles.length} embedded subtitles.`);
              debugLog('Extracted subtitles:', subtitles);

              
              if (files && files.length > 0) {
                Promise.all(files.map(async (file) => {
                  try {
                    const formData = new FormData();
                    formData.append('file', file);
                    await SubtitleService.uploadSubtitles(formData);
                    debugLog(`Uploaded extracted subtitle: ${file.name}`);
                  } catch (err) {
                    console.error(`Failed to upload extracted subtitle ${file.name}:`, err);
                  }
                })).then(() => {
                  debugLog('Finished uploading extracted subtitles');
                });
              }
            } else {
              
              const unsupported = warnings.some(w => w.includes('unsupported'));
              if (unsupported) {
                setUploadStatus('Found unsupported subtitle tracks (PGS/VobSub).');
                
              } else {
                setUploadStatus('No supported embedded text subtitles found.');
              }
            }
            
            
            setTimeout(() => setUploadStatus(null), 4000);
            setIsExtractingSubtitles(false);
          }).catch(err => {
            console.error('Subtitle extraction failed:', err);
            setUploadStatus('Failed to extract subtitles.');
            setTimeout(() => setUploadStatus(null), 3000);
            setIsExtractingSubtitles(false);
          });
        });
      } else {
        setTimeout(() => {
          setUploadStatus(null);
        }, 3000);
      }

      
      
      debugLog('Local video uploaded (not added to recent videos):', file.name);
    } catch {
      setError('Failed to upload video file');
    }
  }, []);

  const handleGoogleDriveLoad = useCallback((fileId: string, fileName: string) => {
    try {
      const streamingUrl = GoogleDriveService.getStreamingUrl(fileId);

      setVideoUrl(streamingUrl);
      sessionStorage.setItem('videoUrl', streamingUrl);
      sessionStorage.setItem('videoFileName', fileName);
      sessionStorage.setItem('videoSource', 'googledrive');
      sessionStorage.setItem('googleDriveFileId', fileId);
      sessionStorage.removeItem('videoCurrentTime');
      setMimeType('video/mp4'); 
      sessionStorage.setItem('videoMimeType', 'video/mp4');
      setShowInfoBlock(false);
      setError('');
      setUploadStatus(`Video "${fileName}" loaded from Google Drive`);

      setTimeout(() => {
        setUploadStatus(null);
      }, 3000);

      debugLog('Google Drive video loaded:', fileName, fileId);
    } catch {
      setError('Failed to load video from Google Drive');
    }
  }, []);

  const handleSelectAnotherVideo = useCallback(() => {
    if (videoUrl && videoUrl.startsWith('blob:')) {
      URL.revokeObjectURL(videoUrl);
    }

    sessionStorage.removeItem('videoUrl');
    sessionStorage.removeItem('videoFileName');
    sessionStorage.removeItem('videoMimeType');
    sessionStorage.removeItem('subtitleName');
    sessionStorage.removeItem('videoSubtitles');
    sessionStorage.removeItem('videoCurrentTime');

    setVideoUrl(null);
    setMimeType(null);
    setShowInfoBlock(true);
    setYoutubeUrlInput('');
    setIsYoutubeLoading(false);
    setError('');
    setUploadStatus(null);
    setYoutubeValidation(null);

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [videoUrl]);

  const clearError = useCallback(() => {
    setError('');
  }, []);

  const state: VideoUploadState = {
    videoUrl,
    youtubeUrlInput,
    isYoutubeLoading,
    error,
    uploadStatus,
    showInfoBlock,
    mimeType,
    youtubeValidation,
    isExtractingSubtitles
  };

  const actions: VideoUploadActions = {
    setYoutubeUrlInput: handleYoutubeUrlInputChange,
    handleYoutubeUrlLoad,
    handleVideoUpload,
    handleGoogleDriveLoad,
    handleSelectAnotherVideo,
    clearError,
    validateYoutubeInput
  };

  return [state, actions];
};