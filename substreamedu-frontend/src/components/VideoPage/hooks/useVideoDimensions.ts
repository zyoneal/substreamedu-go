import { useState, useCallback, useEffect, RefObject, Dispatch, SetStateAction } from 'react';
import {
    calculateMaxFitWidth,
    getVideoAspectRatio,
    DEFAULT_COMPACT_WIDTH,
    DEFAULT_ASPECT_RATIO,
    DEFAULT_VERTICAL_OVERHEAD,
} from '../utils/videoDimensionUtils';

export interface UseVideoDimensionsParams {
    videoUrl: string;
    videoId: string | null;
    videoRef: RefObject<HTMLVideoElement>;
    handleVideoMetadata?: () => void;
    verticalOverhead?: number;
    defaultCompactWidth?: number;
}

export interface UseVideoDimensionsResult {
    mediaAspectRatio: number;
    setMediaAspectRatio: Dispatch<SetStateAction<number>>;
    isMaxFit: boolean;
    setIsMaxFit: Dispatch<SetStateAction<boolean>>;
    playerWidth: number;
    setPlayerWidth: Dispatch<SetStateAction<number>>;
    calculateWidth: (ratio?: number) => number;
    handleVideoMetadataWithAspect: () => void;
    toggleMaxFit: () => void;
}

/**
 * Custom hook managing video container dimensions, dynamic zero-scroll screen-fit width,
 * aspect ratio detection, and theater mode toggling.
 */
export const useVideoDimensions = ({
    videoUrl,
    videoId,
    videoRef,
    handleVideoMetadata,
    verticalOverhead = DEFAULT_VERTICAL_OVERHEAD,
    defaultCompactWidth = DEFAULT_COMPACT_WIDTH,
}: UseVideoDimensionsParams): UseVideoDimensionsResult => {
    const [mediaAspectRatio, setMediaAspectRatio] = useState<number>(DEFAULT_ASPECT_RATIO);
    const [isMaxFit, setIsMaxFit] = useState<boolean>(true); // Default to max fit no scroll!

    const calculateWidth = useCallback(
        (ratio?: number): number => {
            const validRatio =
                ratio && ratio > 0 ? ratio : mediaAspectRatio > 0 ? mediaAspectRatio : DEFAULT_ASPECT_RATIO;
            const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
            const winHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
            return calculateMaxFitWidth(validRatio, winWidth, winHeight, verticalOverhead);
        },
        [mediaAspectRatio, verticalOverhead]
    );

    const [playerWidth, setPlayerWidth] = useState<number>(() => {
        const winWidth = typeof window !== 'undefined' ? window.innerWidth : 1440;
        const winHeight = typeof window !== 'undefined' ? window.innerHeight : 900;
        return calculateMaxFitWidth(DEFAULT_ASPECT_RATIO, winWidth, winHeight, verticalOverhead);
    });

    // Recalculate max fit width whenever videoUrl or videoId changes (per video dynamic recalculation)
    useEffect(() => {
        setIsMaxFit(true);
        if (videoId) {
            setMediaAspectRatio(DEFAULT_ASPECT_RATIO);
            setPlayerWidth(calculateWidth(DEFAULT_ASPECT_RATIO));
        } else if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
            const ratio = getVideoAspectRatio(videoRef.current);
            setMediaAspectRatio(ratio);
            setPlayerWidth(calculateWidth(ratio));
        } else {
            setPlayerWidth(calculateWidth(DEFAULT_ASPECT_RATIO));
        }
    }, [videoUrl, videoId, calculateWidth, videoRef]);

    // Recalculate whenever HTML5 video metadata loads
    const handleVideoMetadataWithAspect = useCallback(() => {
        handleVideoMetadata?.();
        if (videoRef.current && videoRef.current.videoWidth && videoRef.current.videoHeight) {
            const ratio = getVideoAspectRatio(videoRef.current);
            setMediaAspectRatio(ratio);
            setIsMaxFit(true);
            setPlayerWidth(calculateWidth(ratio));
        }
    }, [handleVideoMetadata, videoRef, calculateWidth]);

    // Update on window resize
    useEffect(() => {
        const handleWindowResize = () => {
            const maxW = calculateWidth(mediaAspectRatio);
            if (isMaxFit) {
                setPlayerWidth(maxW);
            } else {
                setPlayerWidth((prev) => Math.min(prev, maxW));
            }
        };

        if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleWindowResize);
            return () => window.removeEventListener('resize', handleWindowResize);
        }
    }, [isMaxFit, mediaAspectRatio, calculateWidth]);

    const toggleMaxFit = useCallback(() => {
        const maxW = calculateWidth(mediaAspectRatio);
        if (isMaxFit) {
            setIsMaxFit(false);
            setPlayerWidth(Math.min(defaultCompactWidth, maxW));
        } else {
            setIsMaxFit(true);
            setPlayerWidth(maxW);
        }
    }, [isMaxFit, mediaAspectRatio, calculateWidth, defaultCompactWidth]);

    return {
        mediaAspectRatio,
        setMediaAspectRatio,
        isMaxFit,
        setIsMaxFit,
        playerWidth,
        setPlayerWidth,
        calculateWidth,
        handleVideoMetadataWithAspect,
        toggleMaxFit,
    };
};
