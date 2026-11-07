import React, { useState } from 'react';
import {
  Film,
  Play,
  Pause,
  Music,
  RotateCcw,
  Volume2,
  Maximize,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react';
import styles from './HeroCinemaPlayer.module.css';

interface DemoScene {
  id: 'movies' | 'youtube' | 'music';
  label: string;
  icon: React.ReactNode;
  title: string;
  shortTitle: string;
  timestamp: string;
  duration: string;
  progressPercent: number;
  grammarLabel: string;
  cefr: string;
  spokenPrefix: string;
  highlightWord: string;
  spokenSuffix: string;
  wordType: string;
  phonetics: string;
  translation: string;
  imageSrc: string;
}

const DEMO_SCENES: readonly DemoScene[] = [
  {
    id: 'movies',
    label: 'Movies & Series',
    icon: <Film size={13} strokeWidth={2} />,
    title: 'Interstellar (2014) · English Subtitles',
    shortTitle: 'Interstellar (2014)',
    timestamp: '01:14:28',
    duration: '02:49:00',
    progressPercent: 44,
    grammarLabel: 'Idiom / Phrase',
    cefr: 'A2',
    spokenPrefix: "Hey relax, it's ",
    highlightWord: 'no problem',
    spokenSuffix: ", I'll handle everything.",
    wordType: 'phrase',
    phonetics: '/ˌnoʊ ˈprɑː.bləm/',
    translation: 'без проблем',
    imageSrc: '/assets/interstellar_cinema_scene.jpg',
  },
  {
    id: 'youtube',
    label: 'YouTube Interviews',
    icon: <Play size={13} strokeWidth={2} />,
    title: 'Suits & Style · Podcast Interview',
    shortTitle: 'Suits & Style',
    timestamp: '18:42',
    duration: '01:45:10',
    progressPercent: 22,
    grammarLabel: 'Noun / Vocabulary',
    cefr: 'A2',
    spokenPrefix: 'He walked into the studio wearing a tailored ',
    highlightWord: 'suit',
    spokenSuffix: ', ready for the broadcast.',
    wordType: 'noun',
    phonetics: '/suːt/',
    translation: 'костюм',
    imageSrc: '/assets/suits_podcast_scene.jpg',
  },
  {
    id: 'music',
    label: 'Synced Lyrics',
    icon: <Music size={13} strokeWidth={2} />,
    title: 'Ed Sheeran - Castle on the Hill',
    shortTitle: 'Castle on the Hill',
    timestamp: '01:25',
    duration: '04:46',
    progressPercent: 32,
    grammarLabel: 'Noun / Place',
    cefr: 'A2',
    spokenPrefix: 'Driving at ninety down country lanes towards the old ',
    highlightWord: 'castle',
    spokenSuffix: '.',
    wordType: 'noun',
    phonetics: '/ˈkæs.əl/',
    translation: 'замок',
    imageSrc: '/assets/castle_hill_scene.jpg',
  },
];

export const HeroCinemaPlayer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'movies' | 'youtube' | 'music'>('movies');
  const [blurSubtitles, setBlurSubtitles] = useState<boolean>(true);
  const [delayActive, setDelayActive] = useState<boolean>(true);
  const [repeatActive, setRepeatActive] = useState<boolean>(false);
  const [showGrammar, setShowGrammar] = useState<boolean>(false);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isPopoverOpen, setIsPopoverOpen] = useState<boolean>(true);

  const scene = DEMO_SCENES.find((s) => s.id === activeTab) || DEMO_SCENES[0];

  const handleTabChange = (tabId: 'movies' | 'youtube' | 'music') => {
    setActiveTab(tabId);
    setIsSaved(false);
    setIsPopoverOpen(true);
  };

  const handleSaveToggle = () => {
    setIsSaved((prev) => !prev);
  };

  const togglePlayPause = () => {
    setIsPlaying((prev) => !prev);
  };

  const toggleSubtitleBlur = () => {
    setBlurSubtitles((prev) => !prev);
    setIsPopoverOpen(true);
  };

  return (
    <div
      className={styles.playerWrapper}
      data-testid="hero-cinema-player"
      role="region"
      aria-label="SubStreamEdu VideoPlayer Interactive Preview"
    >
      <div className={styles.playerAmbientGlow} aria-hidden="true" />

      {/* Real 16:9 Cinema Container */}
      <div className={styles.videoContainer}>
        {/* Authentic Cinematic Backdrop with smooth film grading */}
        <div className={styles.sceneBackdropWrapper}>
          <img
            key={scene.id}
            src={scene.imageSrc}
            alt={scene.title}
            className={`${styles.sceneBackdropImage} ${isPlaying ? styles.sceneImagePlaying : styles.sceneImagePaused}`}
          />
          <div className={styles.videoVignette} aria-hidden="true" />
        </div>

        {/* 1. TOP CONTROLS (Identical to VideoControlsOverlay.tsx) */}
        <div className={styles.topControls}>
          <div className={styles.topControlsLeft}>
            <div className={styles.videoTitleBadge}>
              <span className={styles.videoTitleDot} aria-hidden="true" />
              <span className={styles.videoTitleText}>{scene.title}</span>
            </div>
          </div>

          <div className={styles.topControlsRight}>
            <button
              type="button"
              className={`${styles.iconControlBtn} ${showGrammar ? styles.iconControlBtnActive : ''}`}
              onClick={() => setShowGrammar((prev) => !prev)}
              title="Grammar in this Video"
              aria-label="Grammar in this Video"
              aria-pressed={showGrammar}
            >
              <Sparkles size={15} />
            </button>

            <button
              type="button"
              className={styles.iconControlBtn}
              onClick={() => setShowSubtitles((prev) => !prev)}
              title={showSubtitles ? 'Hide subtitles' : 'Show subtitles'}
              aria-label={showSubtitles ? 'Hide subtitles' : 'Show subtitles'}
              aria-pressed={!showSubtitles}
            >
              {showSubtitles ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>

            {/* Quick Pill: Blur toggle with active indicator */}
            <button
              type="button"
              className={`${styles.quickPillButton} ${blurSubtitles ? styles.activePill : ''}`}
              onClick={() => setBlurSubtitles((prev) => !prev)}
              aria-label={blurSubtitles ? 'Subtitle blurred' : 'Subtitle revealed'}
              aria-pressed={blurSubtitles}
              title={blurSubtitles ? 'Subtitles blurred (Listening practice active)' : 'Blur subtitles'}
            >
              Blur
            </button>

            {/* Quick Pill: 2s delay toggle */}
            <button
              type="button"
              className={`${styles.quickPillButton} ${delayActive ? styles.activePill : ''}`}
              onClick={() => setDelayActive((prev) => !prev)}
              title="Delay subtitles by 2s (Listening practice)"
              aria-label="Toggle subtitle delay"
              aria-pressed={delayActive}
            >
              {delayActive ? '-2s' : 'Delay'}
            </button>

            {/* Quick Pill: 3x Repeat */}
            <button
              type="button"
              className={`${styles.quickPillButton} ${repeatActive ? styles.activePill : ''}`}
              onClick={() => setRepeatActive((prev) => !prev)}
              title="Repeat current subtitle 3 times"
              aria-label="Repeat subtitle 3 times"
              aria-pressed={repeatActive}
            >
              <RotateCcw size={11} />
              <span>3x</span>
            </button>
          </div>
        </div>

        {/* 2. TRANSLATION POPOVER (Compact, floating cleanly ABOVE subtitle) */}
        {isPopoverOpen && showSubtitles && (
          <div className={styles.popover} role="dialog" aria-label="Contextual Translation Popover">
            <div className={styles.popoverArrow} aria-hidden="true" />

            <div className={styles.selectedTextRow}>
              <h3 className={styles.selectedText}>{scene.highlightWord}</h3>
              <span className={styles.transcription}>[{scene.phonetics}]</span>
            </div>

            <div className={styles.mainTranslationRow}>
              <span className={styles.mainTranslationText}>{scene.translation}</span>
              <span className={styles.posTagSm}>{scene.wordType}</span>
            </div>

            <div className={styles.popoverActions}>
              {/* The iconic SubStreamEdu SAVE button with floppy disk icon */}
              <button
                type="button"
                className={`${styles.saveButton} ${isSaved ? styles.saveButtonSaved : ''}`}
                onClick={handleSaveToggle}
                aria-label={isSaved ? 'Word saved to dictionary' : 'Add word to dictionary'}
                title={isSaved ? 'Saved to dictionary' : 'Add to dictionary'}
              >
                <span>{isSaved ? 'SAVED' : 'SAVE'}</span>
                <svg
                  width="15"
                  height="15"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                  <polyline points="17 21 17 13 7 13 7 21" />
                  <polyline points="7 3 7 8 15 8" />
                </svg>
              </button>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setIsPopoverOpen(false)}
                aria-label="Close popover"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* 3. SUBTITLES OVERLAY (Positioned at bottom, completely visible) */}
        {showSubtitles && (
          <div className={styles.subtitlesStage}>
            <div className={styles.currentSubtitleContainer}>
              {showGrammar && (
                <div className={styles.grammarBadge} role="status" aria-label="Grammar Spotlight">
                  <span className={styles.grammarBadgeIconWrapper}>
                    <Sparkles size={9} className={styles.grammarBadgeIcon} />
                  </span>
                  <span className={styles.grammarBadgeLabel}>{scene.grammarLabel}</span>
                  <span className={styles.grammarBadgeCefr}>{scene.cefr}</span>
                </div>
              )}

              {/* Subtitle text with real hover unblur, keyboard support, and signature selection cursor */}
              <p
                className={`${styles.currentSubtitle} ${blurSubtitles ? styles.isBlurred : ''}`}
                onClick={toggleSubtitleBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSubtitleBlur();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label="Toggle subtitle blur"
                title={blurSubtitles ? 'Click or hover to reveal' : ''}
              >
                <span className={styles.blurredContext}>{scene.spokenPrefix}</span>
                <span className={styles.selectionHighlight}>
                  {scene.highlightWord}
                  <svg
                    className={styles.selectionCursor}
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"
                      fill="#ffffff"
                      stroke="#000000"
                      strokeWidth="1.5"
                    />
                  </svg>
                </span>
                <span className={styles.blurredContext}>{scene.spokenSuffix}</span>
              </p>
            </div>
          </div>
        )}

        {/* 4. BOTTOM CONTROLS (Identical to VideoControlsOverlay.tsx) */}
        <div className={styles.bottomControls}>
          <button
            type="button"
            className={styles.controlButton}
            onClick={togglePlayPause}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause size={17} fill="currentColor" /> : <Play size={17} fill="currentColor" />}
          </button>

          <button type="button" className={styles.controlButton} aria-label="Volume">
            <Volume2 size={17} />
          </button>

          <div className={styles.timeCurrent}>{scene.timestamp}</div>

          <div className={styles.seekBarWrapper} role="slider" aria-label="Timeline scrubber">
            <div className={styles.seekBar}>
              <div
                className={styles.seekBarProgress}
                style={{ width: `${scene.progressPercent}%` }}
              />
            </div>
          </div>

          <div className={styles.timeDuration}>{scene.duration}</div>

          <button type="button" className={styles.controlButton} aria-label="Enter fullscreen">
            <Maximize size={17} />
          </button>
        </div>
      </div>

      {/* 5. Format Switcher Tabs (Under Player) */}
      <div className={styles.formatSwitcher} role="tablist" aria-label="Select Content Source">
        {DEMO_SCENES.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={`${styles.formatTab} ${isActive ? styles.formatTabActive : ''}`}
              onClick={() => handleTabChange(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HeroCinemaPlayer;
