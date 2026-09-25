import React from 'react';
import { SubtitleSearchModal } from './SubtitleSearchModal';
import { FilmSelectionModal } from './FilmSelectionModal';
import { ReelGeneratorModal } from './ReelGeneratorModal';
import { GrammarSpotlightModal } from './GrammarSpotlightModal';
import { VideoGrammarIndexModal } from './VideoGrammarIndexModal';
import { LessonStudioModal } from './LessonStudioModal';
import { SubtitleWithScore, SubDLSearchResult } from '../../../services/SubtitleService';
import { DetectedGrammarPoint, VideoGrammarMatch } from '../../../utils/grammarDetector';

export interface ReelModalData {
    word: string;
    translation: string;
    transcription?: string;
    sentence: string;
    startSec: number;
    endSec: number;
}

export interface VideoPlayerModalsProps {
    // Subtitle Search Modal
    showSubtitleSearchModal: boolean;
    availableSubtitles: SubtitleWithScore[];
    isSearchingSubtitles: boolean;
    onCloseSubtitleSearch: () => void;
    onSelectSubtitleFromSearch: (subtitle: SubtitleWithScore) => void;
    onQuickTest: (subtitle: SubtitleWithScore) => void;
    onSearchDifferentTitle: () => void;

    // Film Selection Modal
    showFilmSelection: boolean;
    availableFilms: SubDLSearchResult[];
    searchQueryForFilms?: string;
    onCloseFilmSelection: () => void;
    onSelectFilm: (film: SubDLSearchResult) => void;
    onSearchAgain?: (query: string) => void;

    // Reel Generator Modal
    isReelModalOpen: boolean;
    reelModalData: ReelModalData | null;
    videoSource: string | null;
    youtubeVideoId: string | null;
    movieTitle?: string;
    onCloseReelModal: () => void;

    // Grammar Spotlight Modal
    isGrammarModalOpen: boolean;
    selectedGrammarPoint: DetectedGrammarPoint | null;
    selectedGrammarSentence: string;
    learningLanguage?: string;
    fluentLanguage?: string;
    onCloseGrammarModal: () => void;

    // Video Grammar Index Modal
    isGrammarIndexOpen: boolean;
    videoGrammarMatches: VideoGrammarMatch[];
    onCloseGrammarIndex: () => void;
    onSelectGrammarCue: (match: VideoGrammarMatch) => void;

    // Lesson Studio Modal
    isLessonStudioOpen: boolean;
    isMobile: boolean;
    videoTitle: string;
    mediaSource?: string;
    youtubeId?: string;
    lessonSubtitles?: Array<{ start: number; end: number; text: string }>;
    onCloseLessonStudio: () => void;
    onSeekToTime?: (timeSec: number) => void;
}

export const VideoPlayerModals: React.FC<VideoPlayerModalsProps> = ({
    showSubtitleSearchModal,
    availableSubtitles,
    isSearchingSubtitles,
    onCloseSubtitleSearch,
    onSelectSubtitleFromSearch,
    onQuickTest,
    onSearchDifferentTitle,

    showFilmSelection,
    availableFilms,
    searchQueryForFilms,
    onCloseFilmSelection,
    onSelectFilm,
    onSearchAgain,

    isReelModalOpen,
    reelModalData,
    videoSource,
    youtubeVideoId,
    movieTitle,
    onCloseReelModal,

    isGrammarModalOpen,
    selectedGrammarPoint,
    selectedGrammarSentence,
    learningLanguage,
    fluentLanguage,
    onCloseGrammarModal,

    isGrammarIndexOpen,
    videoGrammarMatches,
    onCloseGrammarIndex,
    onSelectGrammarCue,

    isLessonStudioOpen,
    isMobile,
    videoTitle,
    mediaSource = 'youtube',
    youtubeId = '',
    lessonSubtitles = [],
    onCloseLessonStudio,
    onSeekToTime,
}) => {
    return (
        <>
            <SubtitleSearchModal
                isOpen={showSubtitleSearchModal}
                onClose={onCloseSubtitleSearch}
                subtitles={availableSubtitles}
                onSelectSubtitle={onSelectSubtitleFromSearch}
                onQuickTest={onQuickTest}
                isLoading={isSearchingSubtitles}
                onSearchDifferentTitle={onSearchDifferentTitle}
            />

            <FilmSelectionModal
                isOpen={showFilmSelection}
                onClose={onCloseFilmSelection}
                films={availableFilms}
                onSelectFilm={onSelectFilm}
                isLoading={isSearchingSubtitles}
                searchQuery={searchQueryForFilms}
                onSearchAgain={onSearchAgain}
            />

            {isReelModalOpen && reelModalData && (
                <ReelGeneratorModal
                    isOpen={isReelModalOpen}
                    onClose={onCloseReelModal}
                    word={reelModalData.word}
                    translation={reelModalData.translation}
                    transcription={reelModalData.transcription}
                    sentence={reelModalData.sentence}
                    startSec={reelModalData.startSec}
                    endSec={reelModalData.endSec}
                    videoSource={videoSource}
                    youtubeVideoId={youtubeVideoId}
                    movieTitle={movieTitle}
                />
            )}

            <GrammarSpotlightModal
                isOpen={isGrammarModalOpen}
                onClose={onCloseGrammarModal}
                grammarPoint={selectedGrammarPoint}
                fullSentence={selectedGrammarSentence}
                learningLanguage={learningLanguage}
                fluentLanguage={fluentLanguage}
            />

            <VideoGrammarIndexModal
                isOpen={isGrammarIndexOpen}
                onClose={onCloseGrammarIndex}
                grammarMatches={videoGrammarMatches}
                onSelectGrammarCue={onSelectGrammarCue}
            />

            {!isMobile && (
                <LessonStudioModal
                    isOpen={isLessonStudioOpen}
                    onClose={onCloseLessonStudio}
                    videoTitle={videoTitle}
                    mediaSource={mediaSource}
                    youtubeId={youtubeId}
                    subtitles={lessonSubtitles}
                    learningLanguage={learningLanguage}
                    onSeekToTime={onSeekToTime}
                />
            )}
        </>
    );
};
