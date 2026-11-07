import { useState, useMemo, useCallback } from 'react';
import {
    detectGrammarInText,
    scanSubtitlesForGrammar,
    DetectedGrammarPoint
} from '../../../utils/grammarDetector';
import { Subtitle } from '../types';

export interface ReelModalData {
    word: string;
    translation: string;
    transcription?: string;
    sentence: string;
    startSec: number;
    endSec: number;
}

export interface UseVideoModalsStateParams {
    currentSubtitle: string | null;
    subtitlesForVideo: Subtitle[] | null;
}

export const useVideoModalsState = ({
    currentSubtitle,
    subtitlesForVideo,
}: UseVideoModalsStateParams) => {
    const [isReelModalOpen, setIsReelModalOpen] = useState(false);
    const [reelModalData, setReelModalData] = useState<ReelModalData | null>(null);

    const [selectedGrammarPoint, setSelectedGrammarPoint] = useState<DetectedGrammarPoint | null>(null);
    const [selectedGrammarSentence, setSelectedGrammarSentence] = useState<string>('');
    const [isGrammarModalOpen, setIsGrammarModalOpen] = useState(false);
    const [isGrammarIndexOpen, setIsGrammarIndexOpen] = useState(false);
    const [isLessonStudioOpen, setIsLessonStudioOpen] = useState(false);
    const [showLanguageOverlay, setShowLanguageOverlay] = useState(false);

    const activeGrammarPoint = useMemo(() => {
        return detectGrammarInText(currentSubtitle);
    }, [currentSubtitle]);

    const videoGrammarMatches = useMemo(() => {
        return scanSubtitlesForGrammar(subtitlesForVideo);
    }, [subtitlesForVideo]);

    const openReelModal = useCallback((data: ReelModalData) => {
        setReelModalData(data);
        setIsReelModalOpen(true);
    }, []);

    const closeReelModal = useCallback(() => {
        setIsReelModalOpen(false);
    }, []);

    const openGrammarModal = useCallback((point: DetectedGrammarPoint | null, sentence: string) => {
        setSelectedGrammarPoint(point);
        setSelectedGrammarSentence(sentence);
        setIsGrammarModalOpen(true);
    }, []);

    const closeGrammarModal = useCallback(() => {
        setIsGrammarModalOpen(false);
        setSelectedGrammarSentence('');
    }, []);

    const openGrammarIndex = useCallback(() => {
        setIsGrammarIndexOpen(true);
    }, []);

    const closeGrammarIndex = useCallback(() => {
        setIsGrammarIndexOpen(false);
    }, []);

    const openLessonStudio = useCallback(() => {
        setIsLessonStudioOpen(true);
    }, []);

    const closeLessonStudio = useCallback(() => {
        setIsLessonStudioOpen(false);
    }, []);

    return {
        isReelModalOpen,
        setIsReelModalOpen,
        reelModalData,
        setReelModalData,
        selectedGrammarPoint,
        setSelectedGrammarPoint,
        selectedGrammarSentence,
        setSelectedGrammarSentence,
        isGrammarModalOpen,
        setIsGrammarModalOpen,
        isGrammarIndexOpen,
        setIsGrammarIndexOpen,
        isLessonStudioOpen,
        setIsLessonStudioOpen,
        showLanguageOverlay,
        setShowLanguageOverlay,
        activeGrammarPoint,
        videoGrammarMatches,
        openReelModal,
        closeReelModal,
        openGrammarModal,
        closeGrammarModal,
        openGrammarIndex,
        closeGrammarIndex,
        openLessonStudio,
        closeLessonStudio,
    };
};
