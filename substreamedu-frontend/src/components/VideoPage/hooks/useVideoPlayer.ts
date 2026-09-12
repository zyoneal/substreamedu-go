
import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { YouTubePlayer } from 'react-youtube';
import { debugError } from '../../../utils/debug';


const getYoutubeVideoId = (url: string): string | null => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

export interface UseVideoPlayerOptions {
    videoUrl: string;
    isPopoverOpen?: boolean;
}

export interface UseVideoPlayerReturn {
    
    videoId: string | null;

    
    isPlaying: boolean;
    volume: number;
    isMuted: boolean;
    progress: number;
    duration: number;
    currentTime: number;
    isFullscreen: boolean;
    showControls: boolean;
    showVolumeSlider: boolean;
    playbackError: string | null;

    
    videoRef: React.RefObject<HTMLVideoElement>;
    videoContainerRef: React.RefObject<HTMLDivElement>;
    videoWrapperRef: React.RefObject<HTMLDivElement>;
    youtubePlayerRef: React.MutableRefObject<YouTubePlayer | null>;

    
    togglePlayPause: () => void;
    pauseVideo: () => void;
    playVideo: () => void;
    pauseVideoFromClick: () => void;
    playVideoFromClick: () => void;
    seek: (time: number) => void;
    seekTo: (time: number) => void;
    handleSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
    handleSeekRelative: (seconds: number) => void;
    handleVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    toggleMute: () => void;
    toggleFullscreen: () => void;
    enterFullscreen: () => void;
    exitFullscreen: () => void;
    formatTime: (seconds: number) => string;
    handlePlayerReady: (event: { target: YouTubePlayer }) => void;
    handleVideoMetadata: () => void;
    handleVideoError: () => void;
    handleVideoClick: () => void;

    
    setShowControls: (show: boolean) => void;
    setShowVolumeSlider: (show: boolean) => void;
    setDuration: (duration: number) => void;
    setCurrentTime: (time: number) => void;
    setProgress: (progress: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setVolume: (volume: number) => void;
    setIsMuted: (muted: boolean) => void;
    setIsFullscreen: (fullscreen: boolean) => void;
}

export const useVideoPlayer = (options: UseVideoPlayerOptions): UseVideoPlayerReturn => {
    const { videoUrl, isPopoverOpen = false } = options;

    
    const videoId = useMemo(() => getYoutubeVideoId(videoUrl), [videoUrl]);

    
    const [isPlaying, setIsPlaying] = useState(true);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState<boolean>(
        !!(document.fullscreenElement || (document as any).webkitFullscreenElement || (document as any).webkitCurrentFullScreenElement)
    );
    const [showControls, setShowControls] = useState(false);
    const [showVolumeSlider, setShowVolumeSlider] = useState(false);
    const [playbackError, setPlaybackError] = useState<string | null>(null);

    
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const videoWrapperRef = useRef<HTMLDivElement>(null);
    const youtubePlayerRef = useRef<YouTubePlayer | null>(null);

    
    const pauseVideo = useCallback(() => {
        if (videoId && youtubePlayerRef.current) {
            youtubePlayerRef.current.pauseVideo();
        } else if (videoRef.current) {
            videoRef.current.pause();
        }
        setIsPlaying(false);
    }, [videoId]);

    const playVideo = useCallback(() => {
        if (isPopoverOpen) return;
        if (videoId && youtubePlayerRef.current) {
            youtubePlayerRef.current.playVideo();
        } else if (videoRef.current) {
            videoRef.current.play().catch(debugError);
        }
        setIsPlaying(true);
    }, [videoId, isPopoverOpen]);

    const pauseVideoFromClick = useCallback(() => {
        pauseVideo();
        setShowControls(true);
    }, [pauseVideo]);

    const playVideoFromClick = useCallback(() => {
        playVideo();
        setShowControls(false);
    }, [playVideo]);

    const togglePlayPause = useCallback(() => {
        if (isPlaying) {
            pauseVideo();
        } else {
            playVideo();
        }
    }, [isPlaying, pauseVideo, playVideo]);

    
    const seek = useCallback((time: number) => {
        if (videoId && youtubePlayerRef.current) {
            const currentTime = youtubePlayerRef.current.getCurrentTime();
            youtubePlayerRef.current.seekTo(currentTime + time, true);
        } else if (videoRef.current) {
            videoRef.current.currentTime += time;
        }
    }, [videoId]);

    const seekTo = useCallback((time: number) => {
        if (videoId && youtubePlayerRef.current) {
            youtubePlayerRef.current.seekTo(time, true);
        } else if (videoRef.current) {
            videoRef.current.currentTime = time;
        }
        setProgress((time / duration) * 100);
    }, [videoId, duration]);

    const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const seekBar = e.currentTarget;
        const rect = seekBar.getBoundingClientRect();
        const pos = (e.clientX - rect.left) / rect.width;
        seekTo(pos * duration);
    }, [seekTo, duration]);

    const handleSeekRelative = useCallback((seconds: number) => {
        const newTime = Math.max(0, Math.min(duration, currentTime + seconds));
        seekTo(newTime);
    }, [duration, currentTime, seekTo]);

    
    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        setIsMuted(newVolume === 0);
        if (videoId && youtubePlayerRef.current) {
            youtubePlayerRef.current.setVolume(newVolume * 100);
        }
        if (videoRef.current) {
            videoRef.current.volume = newVolume;
        }
    }, [videoId]);

    const toggleMute = useCallback(() => {
        const newMuted = !isMuted;
        setIsMuted(newMuted);
        if (videoId && youtubePlayerRef.current) {
            if (newMuted) {
                youtubePlayerRef.current.mute();
            } else {
                youtubePlayerRef.current.unMute();
            }
        }
        if (videoRef.current) {
            videoRef.current.muted = newMuted;
        }
    }, [videoId, isMuted]);

    
    const enterFullscreen = useCallback(() => {
        if (videoContainerRef.current) {
            const container = videoContainerRef.current;
            if (container.requestFullscreen) {
                container.requestFullscreen();
            } else if ((container as any).webkitRequestFullscreen) {
                (container as any).webkitRequestFullscreen();
            } else if ((container as any).webkitEnterFullscreen) {
                (container as any).webkitEnterFullscreen();
            } else if ((container as any).msRequestFullscreen) {
                (container as any).msRequestFullscreen();
            } else if ((container as any).mozRequestFullScreen) {
                (container as any).mozRequestFullScreen();
            }
        }
    }, []);

    const exitFullscreen = useCallback(() => {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        } else if ((document as any).webkitCancelFullScreen) {
            (document as any).webkitCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
            (document as any).mozCancelFullScreen();
        }
    }, []);

    const toggleFullscreen = useCallback(() => {
        const isCurrentlyFullscreen = document.fullscreenElement ||
            (document as any).webkitFullscreenElement ||
            (document as any).webkitCurrentFullScreenElement;

        if (isCurrentlyFullscreen) {
            exitFullscreen();
        } else {
            enterFullscreen();
        }
    }, [enterFullscreen, exitFullscreen]);

    
    useEffect(() => {
        const handleFullscreenChange = () => {
            const isCurrentlyFullscreen = !!(document.fullscreenElement ||
                (document as any).webkitFullscreenElement ||
                (document as any).webkitCurrentFullScreenElement);
            setIsFullscreen(isCurrentlyFullscreen);
        };

        document.addEventListener('fullscreenchange', handleFullscreenChange);
        document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
        document.addEventListener('mozfullscreenchange', handleFullscreenChange);
        document.addEventListener('MSFullscreenChange', handleFullscreenChange);

        return () => {
            document.removeEventListener('fullscreenchange', handleFullscreenChange);
            document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
            document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
            document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
        };
    }, []);

    
    const formatTime = useCallback((timeInSeconds: number): string => {
        if (isNaN(timeInSeconds) || timeInSeconds < 0) {
            timeInSeconds = 0;
        }
        const hours = Math.floor(timeInSeconds / 3600);
        const minutes = Math.floor((timeInSeconds % 3600) / 60);
        const seconds = Math.floor(timeInSeconds % 60);

        const formattedHours = String(hours).padStart(2, '0');
        const formattedMinutes = String(minutes).padStart(2, '0');
        const formattedSeconds = String(seconds).padStart(2, '0');

        if (hours > 0) {
            return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
        } else {
            return `${formattedMinutes}:${formattedSeconds}`;
        }
    }, []);

    
    const handlePlayerReady = useCallback((event: { target: YouTubePlayer }) => {
        youtubePlayerRef.current = event.target;
        
        
        try {
            if (event.target && typeof event.target.unloadModule === 'function') {
                event.target.unloadModule("captions");
            }
        } catch {
            
        }

        setDuration(event.target.getDuration());

        const storedTime = sessionStorage.getItem('videoCurrentTime');
        const storedVideoUrl = sessionStorage.getItem('videoUrl');

        if (storedTime && storedVideoUrl === videoUrl) {
            const time = parseFloat(storedTime);
            setIsPlaying(true);
            setTimeout(() => {
                if (youtubePlayerRef.current) {
                    youtubePlayerRef.current.seekTo(time, true);
                    setCurrentTime(time);
                }
            }, 500);
        } else {
            setIsPlaying(true);
        }
    }, [videoUrl]);

    
    const handleVideoMetadata = useCallback(() => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
            
            
            if (videoRef.current.duration > 0 &&
                videoRef.current.videoWidth === 0 &&
                videoRef.current.videoHeight === 0) {
                
                setTimeout(() => {
                    if (videoRef.current &&
                        videoRef.current.videoWidth === 0 &&
                        videoRef.current.videoHeight === 0) {
                        setPlaybackError('codec_unsupported');
                    }
                }, 2000);
            }
        }
    }, []);

    
    const handleVideoError = useCallback(() => {
        if (videoRef.current && videoRef.current.error) {
            const error = videoRef.current.error;
            debugError("Video Playback Error:", error);
            if (error.code === 3 || error.code === 4) { 
                setPlaybackError('codec_unsupported');
            } else {
                setPlaybackError('generic_error');
            }
        }
    }, []);

    
    const handleVideoClick = useCallback(() => {
        if (isPlaying) {
            pauseVideoFromClick();
        } else {
            playVideoFromClick();
        }
    }, [isPlaying, pauseVideoFromClick, playVideoFromClick]);

    
    useEffect(() => {
        const videoElement = videoRef.current;

        const handleTimeUpdate = () => {
            if (videoElement) {
                const { currentTime, duration } = videoElement;
                setCurrentTime(currentTime);
                setProgress((currentTime / duration) * 100);
                sessionStorage.setItem('videoCurrentTime', currentTime.toString());
            }
        };

        if (videoElement) {
            videoElement.addEventListener('timeupdate', handleTimeUpdate);
            return () => {
                videoElement.removeEventListener('timeupdate', handleTimeUpdate);
            };
        }
    }, []);

    
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (videoId && youtubePlayerRef.current && isPlaying) {
            interval = setInterval(async () => {
                if (youtubePlayerRef.current) {
                    try {
                        
                        if (typeof youtubePlayerRef.current.unloadModule === 'function') {
                            youtubePlayerRef.current.unloadModule("captions");
                        }
                    } catch {
                        
                    }

                    try {
                        const currentTime = await youtubePlayerRef.current.getCurrentTime();
                        const duration = await youtubePlayerRef.current.getDuration();
                        if (duration) {
                            setCurrentTime(currentTime);
                            setProgress((currentTime / duration) * 100);
                            sessionStorage.setItem('videoCurrentTime', currentTime.toString());
                        }
                    } catch {
                        
                    }
                }
            }, 250); 
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [videoId, isPlaying]);

    return {
        
        videoId,

        
        isPlaying,
        volume,
        isMuted,
        progress,
        duration,
        currentTime,
        isFullscreen,
        showControls,
        showVolumeSlider,
        playbackError,

        
        videoRef,
        videoContainerRef,
        videoWrapperRef,
        youtubePlayerRef,

        
        togglePlayPause,
        pauseVideo,
        playVideo,
        pauseVideoFromClick,
        playVideoFromClick,
        seek,
        seekTo,
        handleSeek,
        handleSeekRelative,
        handleVolumeChange,
        toggleMute,
        toggleFullscreen,
        enterFullscreen,
        exitFullscreen,
        formatTime,
        handlePlayerReady,
        handleVideoMetadata,
        handleVideoError,
        handleVideoClick,

        
        setShowControls,
        setShowVolumeSlider,
        setDuration,
        setCurrentTime,
        setProgress,
        setIsPlaying,
        setVolume,
        setIsMuted,
        setIsFullscreen,
    };
};

export default useVideoPlayer;
