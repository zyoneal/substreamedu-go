import React, { useState } from 'react';
import { useIntl } from 'react-intl';
import Play from 'lucide-react/dist/esm/icons/play';
import Sparkles from 'lucide-react/dist/esm/icons/sparkles';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Loader2 from 'lucide-react/dist/esm/icons/loader-2';
import styles from './QuickStartVideoPicks.module.css';

export interface QuickVideoPick {
    id: string;
    title: string;
    description: string;
    category: string;
    level: string;
    url: string;
    thumbnailUrl: string;
}

export const CURATED_DEMO_VIDEOS: QuickVideoPick[] = [
    {
        id: 'comprehensible-input-english',
        title: '4+ Hours of English Comprehensible Input',
        description: 'Natural conversational English, everyday vocabulary, and clear storytelling for learners.',
        category: 'Comprehensible Input / ESL',
        level: 'A2 – B1',
        url: 'https://www.youtube.com/watch?v=hsUkTQ1YTOQ',
        thumbnailUrl: 'https://img.youtube.com/vi/hsUkTQ1YTOQ/hqdefault.jpg'
    },
    {
        id: 'bob-canadian-phrasal-verbs',
        title: '150 Phrasal Verbs! Mega English Lesson!',
        description: 'Real-life examples, clear Canadian pronunciation, and practical everyday verbs.',
        category: 'Mega Lesson / Vocabulary',
        level: 'A2 – B1',
        url: 'https://www.youtube.com/watch?v=d9gkFenaKFs',
        thumbnailUrl: 'https://img.youtube.com/vi/d9gkFenaKFs/hqdefault.jpg'
    },
    {
        id: 'vanessa-3hr-masterclass',
        title: '3 Hour Masterclass: Fluency, Pronunciation & Grammar',
        description: 'Comprehensive speaking practice, clear American enunciation, and natural dialogue.',
        category: 'Masterclass / Speaking',
        level: 'B1 – B2',
        url: 'https://www.youtube.com/watch?v=BnRub9D5Ch8',
        thumbnailUrl: 'https://img.youtube.com/vi/BnRub9D5Ch8/hqdefault.jpg'
    },
    {
        id: 'bbc-6min-lifestyle-boxset',
        title: 'BBC 6 Minute English: 1-Hour Lifestyle Mega-Class',
        description: 'Engaging British RP conversations, rich topical vocabulary, and clear explanations.',
        category: 'BBC English / Dialogue',
        level: 'B1 – B2',
        url: 'https://www.youtube.com/watch?v=b5DOQ7iOzO4',
        thumbnailUrl: 'https://img.youtube.com/vi/b5DOQ7iOzO4/hqdefault.jpg'
    }
];

interface QuickStartVideoPicksProps {
    onSelectVideo: (url: string, title?: string, thumb?: string) => void;
    disabled?: boolean;
}

export const QuickStartVideoPicks: React.FC<QuickStartVideoPicksProps> = ({
    onSelectVideo,
    disabled = false
}) => {
    const intl = useIntl();
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);

    const handleCardClick = (item: QuickVideoPick) => {
        if (!disabled) {
            setSelectedCardId(item.id);
            onSelectVideo(item.url, item.title, item.thumbnailUrl);
        }
    };

    return (
        <div className={styles.container} data-testid="quick-start-video-picks">
            <div className={styles.header}>
                <div className={styles.titleGroup}>
                    <Sparkles className={styles.sparkleIcon} size={15} />
                    <h3 className={styles.title}>
                        {intl.formatMessage({
                            id: 'videoPage.quickStartTitle',
                            defaultMessage: '1-Click Quick Start'
                        })}
                    </h3>
                </div>
                <span className={styles.subtitle}>
                    {intl.formatMessage({
                        id: 'videoPage.quickStartSubtitle',
                        defaultMessage: 'No URL needed — pick a trending clip to test interactive subtitles'
                    })}
                </span>
            </div>

            <div className={styles.grid}>
                {CURATED_DEMO_VIDEOS.map((item) => {
                    const isCardSelected = selectedCardId === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            className={`${styles.card} ${isCardSelected ? styles.cardLoading : ''}`}
                            onClick={() => handleCardClick(item)}
                            disabled={disabled}
                            aria-label={`Play ${item.title}`}
                        >
                            <div className={styles.thumbWrapper}>
                                <img
                                    src={item.thumbnailUrl}
                                    alt={item.title}
                                    className={styles.thumbImg}
                                    loading="lazy"
                                />
                                <div className={styles.playOverlay}>
                                    <div className={`${styles.playIconCircle} ${isCardSelected ? styles.playIconCircleActive : ''}`}>
                                        {isCardSelected ? (
                                            <Loader2 size={18} className={styles.spinner} />
                                        ) : (
                                            <Play size={16} fill="currentColor" />
                                        )}
                                    </div>
                                </div>
                                <span className={styles.levelBadge}>{item.level}</span>
                            </div>

                            <div className={styles.cardContent}>
                                <div className={styles.categoryRow}>
                                    <span className={styles.category}>{item.category}</span>
                                </div>
                                <h4 className={styles.cardTitle}>{item.title}</h4>
                                <p className={styles.cardDesc}>{item.description}</p>
                                <div className={styles.instantLaunch}>
                                    {isCardSelected ? (
                                        <>
                                            <Loader2 size={12} className={styles.spinner} />
                                            <span>
                                                {intl.formatMessage({
                                                    id: 'videoPage.starting',
                                                    defaultMessage: 'Starting...'
                                                })}
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <Zap size={12} fill="currentColor" />
                                            <span>
                                                {intl.formatMessage({
                                                    id: 'videoPage.tryIn1Click',
                                                    defaultMessage: 'Play & Translate'
                                                })}
                                            </span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default QuickStartVideoPicks;
