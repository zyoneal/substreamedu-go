import React from 'react';

import Play from 'lucide-react/dist/esm/icons/play';
import Music from 'lucide-react/dist/esm/icons/music';
import Calendar from 'lucide-react/dist/esm/icons/calendar';
import FileText from 'lucide-react/dist/esm/icons/file-text';
import Star from 'lucide-react/dist/esm/icons/star';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
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
                    <Music size={48} className={styles.emptyIcon} />
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
                staggerChildren: 0.05
            }
        }
    };

    const cardVariants = {
        hidden: {
            opacity: 0,
            y: 20,
            scale: 0.95
        },
        visible: {
            opacity: 1,
            y: 0,
            scale: 1,
            transition: {
                type: "spring",
                stiffness: 300,
                damping: 30
            }
        }
    };

    return (
        <div className={styles.container}>
            <motion.div
                className={styles.resultsHeader}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <h3>
                    {songs.length} {songs.length === 1 ? 'song' : 'songs'} found
                </h3>
            </motion.div>

            <motion.div
                className={styles.grid}
                variants={containerVariants}
                initial="hidden"
                animate="visible"
            >
                <AnimatePresence mode="popLayout">
                    {Array.isArray(songs) && songs.map((song) => {
                        const isSelected = song.id === selectedSongId;
                        const hasLyrics = !!song.lyrics?.text;
                        const hasAudio = !!song.audio?.spotifyEmbedUrl || !!song.audio?.youtubeUrl;

                        return (
                            <motion.div
                                key={song.id}
                                variants={cardVariants}
                                layout
                            >
                                <Card
                                    className={`${styles.songCard} ${isSelected ? styles.selected : ''}`}
                                    onClick={() => onSongSelect(song)}
                                >
                                    <CardContent className={styles.cardContent}>
                                        {song.metadata?.imageUrl && (
                                            <div className={styles.imageContainer}>
                                                <img
                                                    src={song.metadata.imageUrl}
                                                    alt={song.title}
                                                    className={styles.albumArt}
                                                />
                                                <div className={styles.playOverlay}>
                                                    <Play size={32} fill="currentColor" />
                                                </div>
                                            </div>
                                        )}

                                        <div className={styles.songInfo}>
                                            <h4 className={styles.songTitle}>
                                                {song.title}
                                                {song.metadata?.explicit && (
                                                    <Badge variant="secondary" className={styles.explicitBadge}>
                                                        E
                                                    </Badge>
                                                )}
                                            </h4>
                                            <p className={styles.artistName}>{song.artist}</p>

                                            {song.album && (
                                                <p className={styles.albumName}>{song.album}</p>
                                            )}

                                            <div className={styles.metadata}>
                                                {song.year && (
                                                    <span className={styles.metadataItem}>
                                                        <Calendar size={14} />
                                                        {song.year}
                                                    </span>
                                                )}

                                                {song.lyrics?.source && (
                                                    <span className={styles.sourceBadge}>
                                                        {song.lyrics.source}
                                                    </span>
                                                )}
                                            </div>

                                            <div className={styles.features}>
                                                {hasLyrics && (
                                                    <span className={styles.feature}>
                                                        <FileText size={12} className="inline mr-1" />Lyrics
                                                    </span>
                                                )}
                                                {hasAudio && (
                                                    <span className={styles.feature}>
                                                        <Music size={12} className="inline mr-1" />Audio
                                                    </span>
                                                )}
                                                {song.metadata?.popularity && song.metadata.popularity > 70 && (
                                                    <span className={styles.feature}>
                                                        <Star size={12} className="inline mr-1" />Popular
                                                    </span>
                                                )}
                                            </div>
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
