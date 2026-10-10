import React from 'react';

import Play from 'lucide-react/dist/esm/icons/play';
import Music from 'lucide-react/dist/esm/icons/music';
import { Card, CardContent } from '../ui/card';
import { EnhancedSong } from '../../types/song.types';
import styles from './SongSearchResults.module.css';
import { motion, AnimatePresence } from 'framer-motion';
import { debugLog } from '../../utils/debug';

interface SongSearchResultsProps {
    songs: EnhancedSong[];
    onSongSelect: (song: EnhancedSong) => void;
    selectedSongId?: string;
    loading?: boolean;
}

export const SongSearchResults: React.FC<SongSearchResultsProps> = ({
    songs,
    onSongSelect,
    selectedSongId,
    loading
}) => {
    debugLog('SongSearchResults rendering:', { songsCount: songs.length, loading, selectedSongId });

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.loading}>
                    <div className={styles.spinner} />
                    <p>Searching...</p>
                </div>
            </div>
        );
    }

    if (!Array.isArray(songs) || songs.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.empty}>
                    <Music size={36} className={styles.emptyIcon} />
                    <h3>No songs found</h3>
                    <p>Try a different search term</p>
                </div>
            </div>
        );
    }

    const containerVariants = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.04
            }
        }
    };

    const cardVariants = {
        hidden: {
            opacity: 0,
            y: 12
        },
        visible: {
            opacity: 1,
            y: 0,
            transition: {
                duration: 0.3,
                ease: [0.16, 1, 0.3, 1]
            }
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.resultsHeader}>
                <h2 className={styles.resultsTitle}>Search Results</h2>
                <span className={styles.resultsCount}>
                    {songs.length} {songs.length === 1 ? 'track' : 'tracks'}
                </span>
            </div>

            <motion.div
                className={styles.grid}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <AnimatePresence mode="popLayout">
                    {songs.map((song) => {
                        const isSelected = song.id === selectedSongId;

                        return (
                            <motion.div
                                key={song.id}
                                variants={cardVariants}
                                layout
                            >
                                <Card
                                    className={`${styles.songCard} ${isSelected ? styles.selected : ''}`}
                                    onClick={() => onSongSelect(song)}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`Play ${song.title} by ${song.artist}`}
                                    onKeyDown={(e: React.KeyboardEvent) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            onSongSelect(song);
                                        }
                                    }}
                                >
                                    <CardContent className={styles.cardContent}>
                                        {song.metadata?.imageUrl ? (
                                            <div className={styles.imageContainer}>
                                                <img
                                                    src={song.metadata.imageUrl}
                                                    alt={song.title}
                                                    className={styles.albumArt}
                                                />
                                                <div className={styles.playOverlay}>
                                                    <Play size={22} fill="currentColor" />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={styles.fallbackArtwork}>
                                                <Music size={24} />
                                            </div>
                                        )}

                                        <div className={styles.songInfo}>
                                            <h4 className={styles.songTitle}>
                                                {song.title}
                                            </h4>
                                            <p className={styles.artistName}>{song.artist}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </motion.div>
        </div>
    );
};
