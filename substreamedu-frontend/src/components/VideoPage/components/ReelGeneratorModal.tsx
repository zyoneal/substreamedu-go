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

// Helper: Pill Text with dark translucent backdrop box
const drawTextWithBox = (
    ctx: CanvasRenderingContext2D,
    text: string,
    centerX: number,
    centerY: number,
    font: string,
    textColor: string,
    bgColor: string = 'rgba(0, 0, 0, 0.48)',
    padX: number = 18,
    padY: number = 8,
    radius: number = 10,
    borderColor?: string
) => {
    ctx.save();
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const textMetrics = ctx.measureText(text);
    const textW = textMetrics.width;
    const textAscent = textMetrics.actualBoundingBoxAscent || 14;
    const textDescent = textMetrics.actualBoundingBoxDescent || 5;
    const boxH = textAscent + textDescent + padY * 2;
    const boxW = textW + padX * 2;
    const boxX = centerX - boxW / 2;
    const boxY = centerY - boxH / 2;

    drawRoundedRect(ctx, boxX, boxY, boxW, boxH, radius);
    ctx.fillStyle = bgColor;
    ctx.fill();

    if (borderColor) {
        ctx.lineWidth = 1;
        ctx.strokeStyle = borderColor;
        ctx.stroke();
    }

    ctx.fillStyle = textColor;
    ctx.fillText(text, centerX, centerY);
    ctx.restore();
};

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
    const [theme, setTheme] = useState<'classic-cyan' | 'cinematic-gold' | 'minimal-dark'>('classic-cyan');
    const [showTikTokGuides, setShowTikTokGuides] = useState<boolean>(false);

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



    // Main Canvas Render Frame (High-End Cinematic 9:16 Layout matching Python generator)
    const renderCanvasFrame = useCallback((includeGuides: boolean = false) => {
        const canvas = canvasRef.current;
        const video = hiddenVideoRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const W = canvas.width;  // 720
        const H = canvas.height; // 1280

        // Theme palette configurations
        const themeConfig = {
            'classic-cyan': {
                badgeColor: '#38bdf8',
                badgeBg: 'rgba(0, 0, 0, 0.48)',
                badgeBorder: 'rgba(56, 189, 248, 0.35)',
                wordColor: '#ffffff',
                transColor: '#facc15',
                transBg: 'rgba(0, 0, 0, 0.48)',
                transBorder: 'rgba(250, 204, 21, 0.28)',
                highlightColor: '#facc15',
                highlightBg: 'rgba(250, 204, 21, 0.24)',
            },
            'cinematic-gold': {
                badgeColor: '#fbbf24',
                badgeBg: 'rgba(0, 0, 0, 0.48)',
                badgeBorder: 'rgba(251, 191, 36, 0.35)',
                wordColor: '#ffffff',
                transColor: '#f59e0b',
                transBg: 'rgba(0, 0, 0, 0.48)',
                transBorder: 'rgba(245, 158, 11, 0.28)',
                highlightColor: '#fbbf24',
                highlightBg: 'rgba(251, 191, 36, 0.24)',
            },
            'minimal-dark': {
                badgeColor: '#e2e8f0',
                badgeBg: 'rgba(0, 0, 0, 0.55)',
                badgeBorder: 'rgba(255, 255, 255, 0.20)',
                wordColor: '#ffffff',
                transColor: '#38bdf8',
                transBg: 'rgba(0, 0, 0, 0.55)',
                transBorder: 'rgba(56, 189, 248, 0.28)',
                highlightColor: '#38bdf8',
                highlightBg: 'rgba(56, 189, 248, 0.20)',
            },
        }[theme] || {
            badgeColor: '#38bdf8',
            badgeBg: 'rgba(0, 0, 0, 0.48)',
            badgeBorder: 'rgba(56, 189, 248, 0.35)',
            wordColor: '#ffffff',
            transColor: '#facc15',
            transBg: 'rgba(0, 0, 0, 0.48)',
            transBorder: 'rgba(250, 204, 21, 0.28)',
            highlightColor: '#facc15',
            highlightBg: 'rgba(250, 204, 21, 0.24)',
        };

        // 1. Background: Deep Cinematic Canvas Base
        ctx.fillStyle = '#0a0b0f';
        ctx.fillRect(0, 0, W, H);

        // 2. 100% Canvas Bleed Ambient Blurred Video Backdrop
        if (video && video.readyState >= 2) {
            ctx.save();
            ctx.filter = 'blur(35px) brightness(0.38) saturate(1.25)';
            ctx.drawImage(video, -30, -30, W + 60, H + 60);
            ctx.restore();
        } else if (posterImgRef.current && posterLoaded) {
            ctx.save();
            ctx.filter = 'blur(35px) brightness(0.38) saturate(1.25)';
            ctx.drawImage(posterImgRef.current, -30, -30, W + 60, H + 60);
            ctx.restore();
        }

        // Soft dark cinematic gradient overlay to guarantee perfect contrast
        ctx.fillStyle = 'rgba(10, 11, 15, 0.42)';
        ctx.fillRect(0, 0, W, H);

        // 3. Center 16:9 Cinema Video (Edge-to-Edge, Full Width, Vertically Centered)
        // Canvas is 720x1280. For 16:9 video: width = 720, height = 720 * 9 / 16 = 405px.
        // Vertically centered: (1280 - 405) / 2 = 437.5 -> 438px.
        const videoX = 0;
        const videoW = W; // 720px edge-to-edge
        const videoH = Math.round((W * 9) / 16); // 405px
        const videoY = Math.round((H - videoH) / 2); // 438px

        ctx.save();
        if (video && video.readyState >= 2) {
            ctx.drawImage(video, videoX, videoY, videoW, videoH);
        } else if (posterImgRef.current && posterLoaded) {
            ctx.drawImage(posterImgRef.current, videoX, videoY, videoW, videoH);
            if (!videoLoaded && activeYoutubeId) {
                drawTextWithBox(
                    ctx,
                    'Preparing HD Clip...',
                    W / 2,
                    videoY + videoH / 2,
                    '600 13px -apple-system, BlinkMacSystemFont, "Inter", sans-serif',
                    '#ffffff',
                    'rgba(13, 14, 18, 0.75)',
                    18,
                    8,
                    14,
                    'rgba(255, 255, 255, 0.2)'
                );
            }
        } else {
            ctx.fillStyle = '#14151c';
            ctx.fillRect(videoX, videoY, videoW, videoH);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.font = '500 16px -apple-system, BlinkMacSystemFont, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Cinema Scene', W / 2, videoY + videoH / 2);
        }
        ctx.restore();

        // Subtle 1px dividing lines at video top and bottom boundaries
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, videoY);
        ctx.lineTo(W, videoY);
        ctx.moveTo(0, videoY + videoH);
        ctx.lineTo(W, videoY + videoH);
        ctx.stroke();
        ctx.restore();

        // 4. Top Vocabulary Stack (Positioned in Safe Zone above video, Y: 180 to 420)
        const rawTrans = (translation || '').replace(/^\(+|\)+$/g, '').trim();
        const displayTrans = rawTrans ? `(${rawTrans})` : '';

        // Category Badge: LEARN ENGLISH
        drawTextWithBox(
            ctx,
            'LEARN ENGLISH',
            W / 2,
            transcription ? 195 : 205,
            '700 18px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
            themeConfig.badgeColor,
            themeConfig.badgeBg,
            18,
            8,
            8,
            themeConfig.badgeBorder
        );

        // Target Word (Large, Crisp, Bold White)
        const wordText = cleanWord.length > 20 ? cleanWord.slice(0, 19) + '…' : cleanWord;
        drawTextWithBox(
            ctx,
            wordText,
            W / 2,
            transcription ? 262 : 276,
            '800 44px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
            themeConfig.wordColor,
            'rgba(0, 0, 0, 0.48)',
            22,
            10,
            12,
            'rgba(255, 255, 255, 0.14)'
        );

        // Optional Transcription
        if (transcription) {
            ctx.save();
            ctx.textAlign = 'center';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
            ctx.font = '500 16px monospace';
            ctx.fillText(transcription, W / 2, 310);
            ctx.restore();
        }

        // Translation Pill (Vibrant Yellow / Theme Accent)
        if (displayTrans) {
            const transText = displayTrans.length > 30 ? displayTrans.slice(0, 29) + '…)' : displayTrans;
            drawTextWithBox(
                ctx,
                transText,
                W / 2,
                transcription ? 354 : 346,
                '700 28px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
                themeConfig.transColor,
                themeConfig.transBg,
                20,
                8,
                10,
                themeConfig.transBorder
            );
        }

        // Tagline below header
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
        ctx.font = '500 14px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        (ctx as any).letterSpacing = '0.5px';
        ctx.fillText(
            'SubstreamEdu Web App  ·  Select  ·  Save  ·  Learn',
            W / 2,
            transcription ? 414 : 408
        );
        ctx.restore();

        // 5. Bottom Subtitle & Context Box (Positioned below video, Y: 875 to 1050)
        // Clean translucent glass card
        const cardX = 36;
        const cardY = 875;
        const cardW = W - 72; // 648px
        const cardH = 175;

        ctx.save();
        drawRoundedRect(ctx, cardX, cardY, cardW, cardH, 18);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.stroke();

        // Clean Context Header
        ctx.textAlign = 'left';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = '700 11px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        (ctx as any).letterSpacing = '1px';
        ctx.fillText('ORIGINAL DIALOGUE CONTEXT', cardX + 24, cardY + 28);

        // Subtitle Context Words with Highlighted Keyword
        // maxTextW is 470px so text is never covered by right-side social actions
        const words = sentence.split(/\s+/);
        let curX = cardX + 24;
        let curY = cardY + 68;
        const lineSpacing = 32;
        const maxTextW = 470;

        words.forEach((w) => {
            const stripped = w.replace(/^[^\w\u0400-\u04FF]+|[^\w\u0400-\u04FF]+$/g, '');
            const isMatch = stripped.toLowerCase() === cleanWord.toLowerCase();

            ctx.font = isMatch
                ? '700 22px -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif'
                : '400 21px -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif';

            const wordMeasure = ctx.measureText(w + ' ');

            if (curX + wordMeasure.width > cardX + 24 + maxTextW) {
                curX = cardX + 24;
                curY += lineSpacing;
            }

            if (isMatch) {
                const pillH = 30;
                const pillW = wordMeasure.width + 4;
                drawRoundedRect(ctx, curX - 2, curY - 21, pillW, pillH, 6);
                ctx.fillStyle = themeConfig.highlightBg;
                ctx.fill();

                ctx.fillStyle = themeConfig.highlightColor;
            } else {
                ctx.fillStyle = '#f8fafc';
            }

            ctx.fillText(w + ' ', curX, curY);
            curX += wordMeasure.width;
        });

        ctx.restore();

        // 6. Watermark & Branding below Context Box
        ctx.save();
        ctx.textAlign = 'center';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.font = '600 12.5px -apple-system, BlinkMacSystemFont, "Inter", sans-serif';
        (ctx as any).letterSpacing = '0.8px';
        ctx.fillText(`${cleanMovieTitle}  ·  substreamedu.com`, W / 2, cardY + cardH + 34);
        ctx.restore();

        // 7. Optional Safe Zone Overlay Guides (Disabled by default, toggleable via Eye icon)
        if (includeGuides) {
            ctx.save();
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

            ctx.fillStyle = 'rgba(239, 68, 68, 0.15)';
            ctx.fillRect(0, 1120, W, H - 1120);
            ctx.strokeRect(0, 1120, W, H - 1120);

            ctx.fillStyle = 'rgba(239, 68, 68, 0.8)';
            ctx.fillText('TikTok Author & Nav Bar Zone (Y > 1120px)', W / 2, 1180);

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
                            <p className={styles.headerSubtitle}>9:16 Cinematic Social Video (TikTok, Reels & Shorts)</p>
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
                            <span className={styles.configCardTitle}>Visual Palette</span>
                            <div className={styles.themePicker}>
                                <button
                                    className={`${styles.themeOptionBtn} ${theme === 'classic-cyan' ? styles.activeTheme : ''}`}
                                    onClick={() => setTheme('classic-cyan')}
                                >
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#38bdf8', marginRight: 6 }} /> Classic Cyan
                                </button>
                                <button
                                    className={`${styles.themeOptionBtn} ${theme === 'cinematic-gold' ? styles.activeTheme : ''}`}
                                    onClick={() => setTheme('cinematic-gold')}
                                >
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f59e0b', marginRight: 6 }} /> Cinematic Gold
                                </button>
                                <button
                                    className={`${styles.themeOptionBtn} ${theme === 'minimal-dark' ? styles.activeTheme : ''}`}
                                    onClick={() => setTheme('minimal-dark')}
                                >
                                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', backgroundColor: '#94a3b8', marginRight: 6 }} /> Minimal Slate
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
