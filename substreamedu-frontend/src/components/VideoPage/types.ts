
import { YouTubePlayer } from 'react-youtube';
import { SubtitleWithScore, SubDLSearchResult } from '../../services/SubtitleService';





export interface Subtitle {
    id: number;
    name: string;
    startTimeMs: number;
    endTimeMs: number;
    text: string;
}

export interface SubtitleListItem {
    name: string;
}





export interface DictionaryItem {
    id: number;
    resourceName: string;
    highlightedText: string;
    translatedText: string;
    context: string;
    definition: string;
}





export interface TranslationData {
    translation: string | null;
    definition: string | null;
    imageUrl: string | null;
    showImage: boolean;
    transcription: string | null;
    hint: string | null;
    examples: string[] | null;
    synonyms: string[] | null;
    style: string | null;
    partOfSpeech: string | null;
    otherMeanings: string[] | null;
    collocations: string[] | null;
    recommendedSelections: string[] | null;
    minimalUnit: string | null;
    // Contextual explanation fields (v3.0)
    register: string | null;
    usageNote: string | null;
    alternatives: Array<{ text: string; register?: string; usageNote?: string }> | null;
    chunks: string[] | null;
    typicalContexts: string[] | null;
}

export const INITIAL_TRANSLATION_DATA: TranslationData = {
    translation: null,
    definition: null,
    imageUrl: null,
    showImage: true,
    transcription: null,
    hint: null,
    examples: null,
    synonyms: null,
    style: null,
    partOfSpeech: null,
    otherMeanings: null,
    collocations: null,
    recommendedSelections: null,
    minimalUnit: null,
    register: null,
    usageNote: null,
    alternatives: null,
    chunks: null,
    typicalContexts: null,
};

export interface ReverseTranslation {
    translation: string;
    definition: string | null;
    transcription: string | null;
    examples: string[];
    allTranslations: string[];
}

export interface TranslationExample {
    source: string;
    target: string;
}





export interface SelectionPosition {
    x: number;
    y: number;
    showBelow?: boolean; 
    isConstrained?: boolean; 
    maxHeight?: number; 
}

export interface TooltipState {
    text: string;
    x: number;
    y: number;
}

export interface ErrorResponse {
    status: number;
    message: string;
    localDateTime: string;
}





export interface VideoPlayerProps {
    videoUrl: string;
    subtitles: SubtitleListItem[];
    name?: string;
    onSubtitleSelect?: () => void;
    fetchSubtitles: () => void;
    onSubtitleUpload: (file: File) => void;
}

export interface VideoControlsProps {
    isPlaying: boolean;
    isMuted: boolean;
    volume: number;
    progress: number;
    currentTime: number;
    duration: number;
    isFullscreen: boolean;
    showSubtitles: boolean;
    delay: number;
    onPlayPause: () => void;
    onSeek: (e: React.MouseEvent<HTMLDivElement>) => void;
    onSeekRelative: (seconds: number) => void;
    onVolumeChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onToggleMute: () => void;
    onToggleFullscreen: () => void;
    onToggleSubtitles: () => void;
    onDelayChange: (delay: number) => void;
    formatTime: (seconds: number) => string;
}

export interface SubtitleDisplayProps {
    currentSubtitle: string | null;
    highlightedWords: DictionaryItem[];
    onTextSelection: () => void;
    renderHighlightedText: (text: string) => JSX.Element;
}

export interface TranslationPopoverProps {
    isOpen: boolean;
    isLoading: boolean;
    selectedText: string | null;
    translationData: TranslationData;
    reverseTranslation: ReverseTranslation | null;
    isReverseLoading: boolean;
    selectedTranslationType: 'original' | 'reverse';
    position: SelectionPosition | null;
    note: string;
    showSubmitButton: boolean;
    showSubscribeButton: boolean;
    onClose: () => void;
    onSave: () => void;
    onNoteChange: (note: string) => void;
    onTranslationTypeChange: (type: 'original' | 'reverse') => void;
}





export interface UseVideoPlayerReturn {
    
    isPlaying: boolean;
    volume: number;
    isMuted: boolean;
    progress: number;
    duration: number;
    currentTime: number;
    isFullscreen: boolean;
    showControls: boolean;

    
    videoRef: React.RefObject<HTMLVideoElement>;
    videoContainerRef: React.RefObject<HTMLDivElement>;
    youtubePlayerRef: React.MutableRefObject<YouTubePlayer | null>;

    
    togglePlayPause: () => void;
    pauseVideo: () => void;
    playVideo: () => void;
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
    setShowControls: (show: boolean) => void;
    setDuration: (duration: number) => void;
    setCurrentTime: (time: number) => void;
    setProgress: (progress: number) => void;
    setIsPlaying: (playing: boolean) => void;
}

export interface UseSubtitlesReturn {
    
    subtitlesForVideo: Subtitle[] | null;
    currentSubtitle: string | null;
    selectedSubtitle: string | null;
    fileName: string;
    videoFileName: string;
    delay: number;
    showSubtitles: boolean;
    isSearchingSubtitles: boolean;
    isYoutubeSubsLoading: boolean;
    isTemporarySubtitles: boolean;
    temporarySubtitleInfo: SubtitleWithScore | null;
    availableSubtitles: SubtitleWithScore[];
    availableFilms: SubDLSearchResult[];
    showSubtitleSearchModal: boolean;
    showFilmSelection: boolean;

    
    setSubtitlesForVideo: (subs: Subtitle[] | null) => void;
    setCurrentSubtitle: (subtitle: string | null) => void;
    setShowSubtitles: (show: boolean) => void;
    setDelay: (delay: number) => void;
    handleSubtitleClick: (name: string) => Promise<void>;
    searchSubtitlesForVideo: () => Promise<void>;
    fetchYoutubeSubtitles: (videoId: string) => Promise<void>;
    handleSelectSubtitleFromSearch: (subtitle: SubtitleWithScore) => Promise<void>;
    handleQuickTest: (subtitle: SubtitleWithScore) => Promise<void>;
    handleKeepTemporarySubtitles: () => Promise<void>;
    handleDiscardTemporarySubtitles: () => void;
    handleSelectFilmForSubtitles: (film: SubDLSearchResult) => Promise<void>;
    setShowSubtitleSearchModal: (show: boolean) => void;
    setShowFilmSelection: (show: boolean) => void;
}

export interface UseTranslationReturn {
    
    selectedText: string | null;
    selectedSentence: string | null;
    translationData: TranslationData;
    reverseTranslation: ReverseTranslation | null;
    isLoading: boolean;
    isReverseLoading: boolean;
    selectedTranslationType: 'original' | 'reverse';
    isPopoverOpen: boolean;
    selectionPosition: SelectionPosition | null;
    note: string;
    showSubmitButton: boolean;
    showSubscribeButton: boolean;
    spinnerPosition: { x: number; y: number } | null;

    
    setSelectedText: (text: string | null) => void;
    setNote: (note: string) => void;
    setSelectedTranslationType: (type: 'original' | 'reverse') => void;
    fetchTranslation: (text: string, sentence: string, isSingleWord: boolean, extended?: string) => Promise<void>;
    saveToDict: () => Promise<void>;
    handleTextSelection: () => void;
    processSelection: (text: string, range: Range) => void;
    resetPopoverState: () => void;
}

export interface UseTextHighlightingReturn {
    
    highlightedWords: DictionaryItem[];
    tooltipState: TooltipState | null;

    
    setHighlightedWords: (items: DictionaryItem[]) => void;
    renderHighlightedText: (text: string) => JSX.Element;
    handleMouseOver: (e: MouseEvent) => void;
    handleMouseOut: (e: MouseEvent) => void;
    handleMouseMove: (e: MouseEvent) => void;
}
