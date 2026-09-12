import React, { useEffect, useRef, useState, useCallback } from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import Play from 'lucide-react/dist/esm/icons/play';
import Pause from 'lucide-react/dist/esm/icons/pause';
import RotateCcw from 'lucide-react/dist/esm/icons/rotate-cw';
import Download from 'lucide-react/dist/esm/icons/download';
import Smartphone from 'lucide-react/dist/esm/icons/smartphone';
import Eye from 'lucide-react/dist/esm/icons/eye';
import EyeOff from 'lucide-react/dist/esm/icons/eye-off';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import styles from './ReelGeneratorModal.module.css';
import { debugLog, debugError } from '../../../utils/debug';

export interface ReelGeneratorModalProps {
    isOpen: boolean;
    onClose: () => void;
    word: string;
    translation: string;
    transcription?: string;
    sentence: string;
    startSec: number;
    endSec: number;
    videoSource: string | null;
    youtubeVideoId?: string | null;
    movieTitle?: string;
}

export const ReelGeneratorModal: React.FC<ReelGeneratorModalProps> = ({
    isOpen,
    onClose,
    word,
    translation,
    transcription,
    sentence,
    startSec,
    endSec,
    videoSource,
    youtubeVideoId,
    movieTitle = 'Movie Clip',
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const hiddenVideoRef = useRef<HTMLVideoElement>(null);
    const animFrameIdRef = useRef<number | null>(null);

    // Auto calculate at least 10 seconds of video duration around the target subtitle
    const subDuration = Math.max(0.5, endSec - startSec);
    const MIN_DURATION = 10.0;
    const neededExtra = Math.max(0, MIN_DURATION - subDuration);
    
    // Balanced padding: 35% before dialogue (lead-in context) and 65% after (reaction/scene continuation)
    const leadIn = Math.max(2.0, neededExtra * 0.35);
    const effectiveStart = Math.max(0, startSec - leadIn);
    const effectiveEnd = Math.max(effectiveStart + MIN_DURATION, endSec + Math.max(2.5, neededExtra * 0.65));
    const totalDurationSec = (effectiveEnd - effectiveStart).toFixed(1);

    const [isPlaying, setIsPlaying] = useState<boolean>(true);
    const [isExporting, setIsExporting] = useState<boolean>(false);
    const [exportProgress, setExportProgress] = useState<number>(0);
    const [theme, setTheme] = useState<'airbnb-coral' | 'minimal-dark' | 'editorial-slate'>('airbnb-coral');
    const [showTikTokGuides, setShowTikTokGuides] = useState<boolean>(true);

    // YouTube clip handling and high-res poster preloading
    const activeYoutubeId = youtubeVideoId || (() => {
        if (!videoSource) return null;
        const match = videoSource.match(/(?:youtube\.com\/(?:watch\?.*v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
        return match ? match[1] : null;
    })();

    const posterImgRef = useRef<HTMLImageElement | null>(null);
    const [posterLoaded, setPosterLoaded] = useState<boolean>(false);
    const [videoLoaded, setVideoLoaded] = useState<boolean>(false);

    useEffect(() => {
        if (!isOpen) return;
        setVideoLoaded(false);
        if (!activeYoutubeId) {
            posterImgRef.current = null;
            setPosterLoaded(false);
            return;
        }

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            posterImgRef.current = img;
            setPosterLoaded(true);
        };
        img.onerror = () => {
            const fallbackImg = new Image();
            fallbackImg.crossOrigin = 'anonymous';
            fallbackImg.onload = () => {
                posterImgRef.current = fallbackImg;
                setPosterLoaded(true);
            };
            fallbackImg.src = `https://img.youtube.com/vi/${activeYoutubeId}/hqdefault.jpg`;
        };
        img.src = `https://img.youtube.com/vi/${activeYoutubeId}/maxresdefault.jpg`;
    }, [isOpen, activeYoutubeId]);

    // Construct backend clip endpoint for YouTube videos or use local videoSource
    const effectiveVideoSource = activeYoutubeId
        ? `/api/youtube/clip/${activeYoutubeId}?start=${Math.floor(effectiveStart)}&end=${Math.ceil(effectiveEnd)}`
        : (videoSource && !videoSource.includes('youtube.com') && !videoSource.includes('youtu.be') ? videoSource : null);

    const clipStart = activeYoutubeId ? 0 : effectiveStart;
    const clipEnd = activeYoutubeId ? (effectiveEnd - effectiveStart) : effectiveEnd;

    // Clean word formatting
    const cleanWord = word.replace(/^[^\w\u0400-\u04FF]+|[^\w\u0400-\u04FF]+$/g, '');

    // Clean Movie Title (strips .srt, .vtt, underscores, dots)
    const cleanMovieTitle = movieTitle
        .replace(/\.(srt|vtt|sub|ass|txt|mp4|mkv|webm|avi|mov)$/i, '')
        .replace(/[-_.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase() || 'CINEMA SCENE';

    // Helper: Rounded Rectangle
    const drawRoundedRect = (
        ctx: CanvasRenderingContext2D,
        x: number,
        y: number,
        w: number,
        h: number,
        r: number
    ) => {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.arcTo(x + w, y, x + w, y + r, r);
        ctx.lineTo(x + w, y + h - r);
        ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
        ctx.lineTo(x + r, y + h);
        ctx.arcTo(x, y + h, x, y + h - r, r);
        ctx.lineTo(x, y + r);
        ctx.arcTo(x, y, x + r, y, r);
        ctx.closePath();
    };

    // Main Canvas Render Frame (Optimized for TikTok / Reels Safe Zones)
    const renderCanvasFrame = useCallback((includeGuides: boolean = false) => {
        const canvas = canvasRef.current;
        const video = hiddenVideoRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;  // 720
        const H = canvas.height; // 1280

        // 1. Background: Clean Deep Charcoal Base
        ctx.fillStyle = '#0d0e12';
        ctx.fillRect(0, 0, W, H);

        // 2. Ambient Blurred Video Backdrop
        if (video && video.readyState >= 2) {
            ctx.save();
            ctx.filter = 'blur(45px) brightness(0.24) saturate(1.2)';
            ctx.drawImage(video, -40, -40, W + 80, H + 80);
            ctx.restore();
        } else if (posterImgRef.current && posterLoaded) {
            ctx.save();
            ctx.filter = 'blur(45px) brightness(0.24) saturate(1.2)';
            ctx.drawImage(posterImgRef.current, -40, -40, W + 80, H + 80);
            ctx.restore();
        }

        // Soft dark overlay for crisp readability
        ctx.fillStyle = 'rgba(10, 11, 15, 0.68)';
        ctx.fillRect(0, 0, W, H);

        // ----------------------------------------------------
        // SAFE ZONE LAYOUT (Y: 170px to 955px)
        // ----------------------------------------------------

        // 3. Top Hero Word Card (Y: 170 to 365, Height: 195px)
        const wordCardX = 36;
        const wordCardY = 170;
        const wordCardW = W - 72; // 648px
        const wordCardH = 195;

        ctx.save();
        // Glassmorphism Card
        drawRoundedRect(ctx, wordCardX, wordCardY, wordCardW, wordCardH, 22);
        ctx.fillStyle = 'rgba(20, 21, 28, 0.88)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
        ctx.stroke();

        // Category Tag
        ctx.textAlign = 'left';
        ctx.fillStyle = theme === 'airbnb-coral' ? '#FF385C' : '#94a3b8';
        ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        (ctx as any).letterSpacing = '1.5px';
        ctx.fillText('TARGET VOCABULARY', wordCardX + 26, wordCardY + 32);

        // Main Word
        ctx.fillStyle = '#ffffff';
        ctx.font = '700 44px "e-Ukraine", -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif';
        (ctx as any).letterSpacing = '-0.5px';
        ctx.fillText(cleanWord, wordCardX + 26, wordCardY + 82);

        // Transcription
        if (transcription) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.font = '400 17px monospace';
            ctx.fillText(transcription, wordCardX + 26, wordCardY + 116);
        }

        // Translation Pill
        const transText = translation.length > 28 ? translation.slice(0, 26) + '...' : translation;
        ctx.font = '600 15px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        const transWidth = ctx.measureText(transText).width + 30;
        const pillY = wordCardY + 136;

        drawRoundedRect(ctx, wordCardX + 26, pillY, transWidth, 34, 17);
        ctx.fillStyle = theme === 'airbnb-coral' ? 'rgba(255, 56, 92, 0.16)' : 'rgba(255, 255, 255, 0.08)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = theme === 'airbnb-coral' ? 'rgba(255, 56, 92, 0.38)' : 'rgba(255, 255, 255, 0.15)';
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillText(transText, wordCardX + 41, pillY + 22);
        ctx.restore();

        // 4. Center 16:9 Movie Video Frame (Y: 385 to 750, Height: 365px)
        const videoX = 36;
        const videoY = 385;
        const videoW = W - 72; // 648px
        const videoH = 365;

        ctx.save();
        drawRoundedRect(ctx, videoX, videoY, videoW, videoH, 20);
        ctx.clip();

        if (video && video.readyState >= 2) {
            ctx.drawImage(video, videoX, videoY, videoW, videoH);
        } else if (posterImgRef.current && posterLoaded) {
            ctx.drawImage(posterImgRef.current, videoX, videoY, videoW, videoH);
            if (!videoLoaded && activeYoutubeId) {
                const pillW = 160;
                const pillH = 32;
                const pillX = videoX + (videoW - pillW) / 2;
                const pillY = videoY + (videoH - pillH) / 2;
                drawRoundedRect(ctx, pillX, pillY, pillW, pillH, 16);
                ctx.fillStyle = 'rgba(13, 14, 18, 0.72)';
                ctx.fill();
                ctx.lineWidth = 1;
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.stroke();

                ctx.fillStyle = '#ffffff';
                ctx.font = '600 12px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('Preparing HD Clip...', videoX + videoW / 2, pillY + 20);
            }
        } else {
            ctx.fillStyle = '#1a1b22';
            ctx.fillRect(videoX, videoY, videoW, videoH);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '500 15px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Cinema Scene', videoX + videoW / 2, videoY + videoH / 2);
        }
        ctx.restore();

        // Video Frame Border
        ctx.save();
        drawRoundedRect(ctx, videoX, videoY, videoW, videoH, 20);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
        ctx.stroke();
        ctx.restore();

        // 5. Bottom Subtitle & Context Card (Y: 770 to 955, Height: 185px)
        // Positioned safely above TikTok author description / tabs (Y > 960)
        const subCardX = 36;
        const subCardY = 770;
        const subCardW = W - 72; // 648px
        const subCardH = 185;

        ctx.save();
        drawRoundedRect(ctx, subCardX, subCardY, subCardW, subCardH, 22);
        ctx.fillStyle = 'rgba(20, 21, 28, 0.88)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.09)';
        ctx.stroke();

        // Clean Movie Title (No .srt or underscores)
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = '600 11.5px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        (ctx as any).letterSpacing = '0.8px';
        ctx.fillText(`${cleanMovieTitle.slice(0, 36)}`, subCardX + 26, subCardY + 30);

        // Subtitle Context Text with Target Word Highlight
        // maxTextW is 480px so text never touches TikTok Like/Comment buttons on the right!
        const words = sentence.split(/\s+/);
        let curX = subCardX + 26;
        let curY = subCardY + 70;
        const lineSpacing = 34;
        const maxTextW = 480;

        ctx.font = '500 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif';
        (ctx as any).letterSpacing = '0px';

        words.forEach((w) => {
            const stripped = w.replace(/^[^\w\u0400-\u04FF]+|[^\w\u0400-\u04FF]+$/g, '');
            const isMatch = stripped.toLowerCase() === cleanWord.toLowerCase();

            ctx.font = isMatch
                ? '700 23px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif'
                : '400 22px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif';

            const wordMeasure = ctx.measureText(w + ' ');

            if (curX + wordMeasure.width > subCardX + 26 + maxTextW) {
                curX = subCardX + 26;
                curY += lineSpacing;
            }

            if (isMatch) {
                // Highlight pill behind target word
                const pillH = 32;
                const pillW = wordMeasure.width + 6;
                drawRoundedRect(ctx, curX - 3, curY - 23, pillW, pillH, 7);
                ctx.fillStyle = theme === 'airbnb-coral' ? 'rgba(255, 56, 92, 0.24)' : 'rgba(245, 158, 11, 0.22)';
                ctx.fill();

                ctx.fillStyle = theme === 'airbnb-coral' ? '#FF385C' : '#fbbf24';
            } else {
                ctx.fillStyle = '#f8fafc';
            }

            ctx.fillText(w + ' ', curX, curY);
            curX += wordMeasure.width;
        });

        // Bottom Brand Signature inside card
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.font = '500 12px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        (ctx as any).letterSpacing = '1px';
        ctx.fillText('substreamedu.com', W / 2, subCardY + subCardH - 16);

        ctx.restore();

        // ----------------------------------------------------
        // OPTIONAL: TIKTOK / REELS SAFE AREA OVERLAY (PREVIEW ONLY)
        // ----------------------------------------------------
        if (includeGuides) {
            ctx.save();

            // Top unsafe zone (Notch, Search, Following/For You tabs)
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.fillRect(0, 0, W, 140);
            ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.strokeRect(0, 0, W, 140);

            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.font = '600 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('TikTok Header / Search Zone (Y < 140px)', W / 2, 80);

            // Bottom unsafe zone (Author description, Sound title, Navigation bar)
            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.fillRect(0, 970, W, H - 970);
            ctx.strokeRect(0, 970, W, H - 970);

            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.fillText('TikTok Author & Nav Bar Zone (Y > 970px)', W / 2, 1060);

            // Right side action buttons zone (Like, Comment, Share, Sound disc)
            ctx.fillStyle = 'rgba(245, 158, 11, 0.12)';
            ctx.fillRect(W - 110, 480, 110, 470);
            ctx.strokeStyle = 'rgba(245, 158, 11, 0.4)';
            ctx.strokeRect(W - 110, 480, 110, 470);

            ctx.fillStyle = 'rgba(245, 158, 11, 0.8)';
            ctx.font = '600 10px sans-serif';
            ctx.fillText('TikTok Icons', W - 55, 710);

            ctx.restore();
        }
    }, [cleanWord, cleanMovieTitle, transcription, translation, sentence, theme, posterLoaded, videoLoaded, activeYoutubeId]);

    // Hidden Video Sync & Looping Loop
    useEffect(() => {
        if (!isOpen) return;

        const video = hiddenVideoRef.current;
        if (!video) return;

        video.currentTime = clipStart;

        const onTimeUpdate = () => {
            if (video.currentTime >= clipEnd) {
                video.currentTime = clipStart;
            }
        };

        const onLoadedMetadata = () => {
            video.currentTime = clipStart;
            if (isPlaying) {
                video.play().catch(() => {});
            }
        };

        const onCanPlay = () => {
            setVideoLoaded(true);
        };

        video.addEventListener('timeupdate', onTimeUpdate);
        video.addEventListener('loadedmetadata', onLoadedMetadata);
        video.addEventListener('canplay', onCanPlay);
        video.addEventListener('loadeddata', onCanPlay);

        if (isPlaying) {
            video.play().catch(() => {});
        }

        const renderLoop = () => {
            renderCanvasFrame(showTikTokGuides);
            animFrameIdRef.current = requestAnimationFrame(renderLoop);
        };

        renderLoop();

        return () => {
            video.removeEventListener('timeupdate', onTimeUpdate);
            video.removeEventListener('loadedmetadata', onLoadedMetadata);
            video.removeEventListener('canplay', onCanPlay);
            video.removeEventListener('loadeddata', onCanPlay);
            if (animFrameIdRef.current) {
                cancelAnimationFrame(animFrameIdRef.current);
            }
        };
    }, [isOpen, clipStart, clipEnd, isPlaying, showTikTokGuides, renderCanvasFrame]);

    // Play / Pause Toggle
    const handleTogglePlay = () => {
        const video = hiddenVideoRef.current;
        if (!video) return;

        if (isPlaying) {
            video.pause();
            setIsPlaying(false);
        } else {
            video.play().catch(() => {});
            setIsPlaying(true);
        }
    };

    const handleRestart = () => {
        const video = hiddenVideoRef.current;
        if (!video) return;
        video.currentTime = clipStart;
        video.play().catch(() => {});
        setIsPlaying(true);
    };

    // Client-Side Video Export (.mp4 / WebM)
    const handleExportReel = async () => {
        const canvas = canvasRef.current;
        const video = hiddenVideoRef.current;
        if (!canvas) return;

        setIsExporting(true);
        setExportProgress(0);

        try {
            // Stop preview loop
            if (animFrameIdRef.current) {
                cancelAnimationFrame(animFrameIdRef.current);
            }
            if (video) {
                video.pause();
            }

            // Set up MediaStream from Canvas (60fps) + Audio
            const canvasStream = canvas.captureStream(60);

            // Capture Audio if available
            if (video && video.readyState >= 2) {
                try {
                    // @ts-ignore
                    const audioStream = video.captureStream ? video.captureStream() : video.mozCaptureStream ? video.mozCaptureStream() : null;
                    if (audioStream && audioStream.getAudioTracks().length > 0) {
                        audioStream.getAudioTracks().forEach((track: MediaStreamTrack) => {
                            canvasStream.addTrack(track);
                        });
                    }
                } catch (e) {
                    debugLog('[ReelGenerator] Audio track capture not supported:', e);
                }
            }

            const mimeTypes = [
                'video/mp4;codecs=h264,aac',
                'video/mp4',
                'video/webm;codecs=vp9,opus',
                'video/webm;codecs=vp8,opus',
                'video/webm',
            ];

            let selectedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || 'video/webm';
            const recorder = new MediaRecorder(canvasStream, {
                mimeType: selectedMime,
                videoBitsPerSecond: 8000000, // 8 Mbps high quality
            });

            const chunks: Blob[] = [];
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            const durationSec = effectiveEnd - effectiveStart;
            if (video && video.readyState >= 2) {
                video.currentTime = clipStart;
                await new Promise((r) => setTimeout(r, 200));
                video.play().catch(() => {});
            }

            recorder.start(100);

            const startTime = Date.now();
            const exportInterval = setInterval(() => {
                const elapsed = (Date.now() - startTime) / 1000;
                const progress = Math.min(100, Math.round((elapsed / durationSec) * 100));
                setExportProgress(progress);

                // Render clean frames WITHOUT guide overlays for the final video
                renderCanvasFrame(false);

                const isVideoFinished = video && video.readyState >= 2 && video.currentTime >= clipEnd;
                if (elapsed >= durationSec || isVideoFinished) {
                    clearInterval(exportInterval);
                    if (video) {
                        video.pause();
                    }
                    recorder.stop();
                }
            }, 1000 / 60);

            recorder.onstop = () => {
                const isMp4 = selectedMime.includes('mp4');
                const blob = new Blob(chunks, { type: selectedMime });
                const url = URL.createObjectURL(blob);

                const a = document.createElement('a');
                a.href = url;
                a.download = `substream_${cleanWord}_reel.${isMp4 ? 'mp4' : 'webm'}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                setIsExporting(false);
                setExportProgress(100);

                // Resume preview loop
                if (video && video.readyState >= 2) {
                    video.currentTime = clipStart;
                    video.play().catch(() => {});
                }
                setIsPlaying(true);
            };
        } catch (err) {
            debugError('[ReelGenerator] Export failed:', err);
            alert('Failed to generate vertical video.');
            setIsExporting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.modalOverlay} onClick={onClose}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                {/* Hidden Source Video for Canvas Sampling */}
                {effectiveVideoSource && (
                    <video
                        ref={hiddenVideoRef}
                        src={effectiveVideoSource}
                        crossOrigin="anonymous"
                        playsInline
                        muted={false}
                        style={{ display: 'none' }}
                        onCanPlay={() => setVideoLoaded(true)}
                        onLoadedData={() => setVideoLoaded(true)}
                    />
                )}

                {/* Header */}
                <div className={styles.modalHeader}>
                    <div className={styles.headerTitleGroup}>
                        <div className={styles.headerLogoBadge}>
                            <Smartphone size={20} />
                        </div>
                        <div>
                            <h2 className={styles.headerTitle}>Vertical Reel Generator</h2>
                            <p className={styles.headerSubtitle}>9:16 Minimalist Airbnb Design (TikTok & Reels Safe Zones)</p>
                        </div>
                    </div>
                    <button className={styles.closeButton} onClick={onClose} aria-label="Close">
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className={styles.modalBody}>
                    {/* Left: 9:16 Phone Mockup Canvas Preview */}
                    <div className={styles.previewSection}>
                        <div className={styles.phoneFrame}>
                            <div className={styles.phoneNotch} />
                            <canvas
                                ref={canvasRef}
                                width={720}
                                height={1280}
                                className={styles.previewCanvas}
                            />
                        </div>

                        <div className={styles.previewControlsBar}>
                            <button
                                className={styles.iconControlBtn}
                                onClick={handleTogglePlay}
                                title={isPlaying ? 'Pause' : 'Play'}
                            >
                                {isPlaying ? <Pause size={15} /> : <Play size={15} />}
                            </button>
                            <button
                                className={styles.iconControlBtn}
                                onClick={handleRestart}
                                title="Replay from start"
                            >
                                <RotateCcw size={15} />
                            </button>
                            <button
                                className={`${styles.iconControlBtn} ${showTikTokGuides ? styles.activeGuideBtn : ''}`}
                                onClick={() => setShowTikTokGuides(!showTikTokGuides)}
                                title={showTikTokGuides ? 'Hide TikTok Safe Area Guides' : 'Show TikTok Safe Area Guides'}
                            >
                                {showTikTokGuides ? <Eye size={15} /> : <EyeOff size={15} />}
                            </button>
                        </div>
                    </div>

                    {/* Right: Clean Settings & Info */}
                    <div className={styles.settingsSection}>
                        {/* Word Details */}
                        <div className={styles.configCard}>
                            <span className={styles.configCardTitle}>Selected Word Card</span>
                            <div className={styles.wordPreviewHeader}>
                                <span className={styles.heroWordText}>{cleanWord}</span>
                                {transcription && (
                                    <span className={styles.heroTranscription}>{transcription}</span>
                                )}
                                <span className={styles.heroTranslationBadge}>{translation}</span>
                            </div>
                            <div className={styles.sentenceBox}>
                                "{sentence}"
                            </div>
                        </div>

                        {/* Theme Picker */}
                        <div className={styles.configCard}>
                            <span className={styles.configCardTitle}>Visual Aesthetic</span>
                            <div className={styles.themePicker}>
                                <button
                                    className={`${styles.themeOptionBtn} ${theme === 'airbnb-coral' ? styles.activeTheme : ''}`}
                                    onClick={() => setTheme('airbnb-coral')}
                                >
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#ff5a5f] mr-1.5 align-middle" /> Airbnb Coral
                                </button>
                                <button
                                    className={`${styles.themeOptionBtn} ${theme === 'minimal-dark' ? styles.activeTheme : ''}`}
                                    onClick={() => setTheme('minimal-dark')}
                                >
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#1e1e1e] border border-white/30 mr-1.5 align-middle" /> Minimal Dark
                                </button>
                                <button
                                    className={`${styles.themeOptionBtn} ${theme === 'editorial-slate' ? styles.activeTheme : ''}`}
                                    onClick={() => setTheme('editorial-slate')}
                                >
                                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-[#f8fafc] mr-1.5 align-middle" /> Slate Editorial
                                </button>
                            </div>
                        </div>

                        {/* Auto Duration Info */}
                        <div className={styles.configCard}>
                            <span className={styles.configCardTitle}>Scene Timing</span>
                            <div className={styles.autoDurationBadge}>
                                <div className={styles.durationRow}>
                                    <Sparkles size={16} className={styles.durationIcon} />
                                    <span className={styles.durationTitle}>Auto Scene Duration:</span>
                                    <strong className={styles.durationValue}>{totalDurationSec}s</strong>
                                </div>
                                <p className={styles.durationDesc}>
                                    Automatically captures lead-in dialogue context and aftermath (minimum 10 seconds, optimized for TikTok & Reels retention).
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className={styles.modalFooter}>
                    {isExporting && (
                        <div className={styles.exportProgressBox}>
                            <div className={styles.spinnerSmall} />
                            <span>Rendering 9:16 Video ({exportProgress}%)...</span>
                        </div>
                    )}

                    <button
                        className={styles.downloadButton}
                        onClick={handleExportReel}
                        disabled={isExporting || (!effectiveVideoSource && !posterLoaded)}
                    >
                        <Download size={17} />
                        <span>{isExporting ? 'Exporting Clip...' : 'Export 9:16 Video (.mp4)'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
