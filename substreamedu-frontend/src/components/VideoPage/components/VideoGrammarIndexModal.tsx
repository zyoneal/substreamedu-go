import React, { useState, useEffect } from 'react';
import { Sparkles, X, Clock, Play, BookOpen } from 'lucide-react';
import { VideoGrammarMatch } from '../../../utils/grammarDetector';
import styles from './VideoGrammarIndexModal.module.css';

interface VideoGrammarIndexModalProps {
  isOpen: boolean;
  onClose: () => void;
  grammarMatches: VideoGrammarMatch[];
  onSelectGrammarCue: (match: VideoGrammarMatch) => void;
}

export const VideoGrammarIndexModal: React.FC<VideoGrammarIndexModalProps> = ({
  isOpen,
  onClose,
  grammarMatches,
  onSelectGrammarCue
}) => {
  const [selectedCefr, setSelectedCefr] = useState<string>('all');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const b1Count = grammarMatches.filter(m => m.grammar.cefrLevel === 'B1').length;
  const b2Count = grammarMatches.filter(m => m.grammar.cefrLevel === 'B2').length;
  const c1Count = grammarMatches.filter(m => m.grammar.cefrLevel === 'C1').length;

  const filteredMatches = selectedCefr === 'all'
    ? grammarMatches
    : grammarMatches.filter(m => m.grammar.cefrLevel === selectedCefr);

  const getCefrClass = (level: string) => {
    switch (level) {
      case 'B1': return styles.cefrB1;
      case 'B2': return styles.cefrB2;
      case 'C1': return styles.cefrC1;
      default: return styles.cefrDefault;
    }
  };

  const renderHighlightedSnippet = (text: string, matchedSegment: string) => {
    const idx = text.toLowerCase().indexOf(matchedSegment.toLowerCase());
    if (idx === -1) {
      return <span>{text}</span>;
    }
    const before = text.slice(0, idx);
    const highlighted = text.slice(idx, idx + matchedSegment.length);
    const after = text.slice(idx + matchedSegment.length);

    return (
      <>
        {before}
        <span className={styles.highlight}>{highlighted}</span>
        {after}
      </>
    );
  };

  return (
    <div className={styles.backdrop} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.titleArea}>
            <div className={styles.iconWrapper}>
              <Sparkles size={19} strokeWidth={2} />
            </div>
            <div className={styles.titleInfo}>
              <span className={styles.eyebrow}>Grammar Discovery</span>
              <h3 className={styles.title}>Grammar in this Video</h3>
              <div className={styles.subtitleCount}>
                {grammarMatches.length} authentic {grammarMatches.length === 1 ? 'pattern' : 'patterns'} detected
              </div>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose} aria-label="Close modal">
            <X size={18} strokeWidth={2} />
          </button>
        </div>

        {/* Filter bar */}
        <div className={styles.filterBar}>
          <button
            type="button"
            className={`${styles.filterButton} ${selectedCefr === 'all' ? styles.active : ''}`}
            onClick={() => setSelectedCefr('all')}
          >
            All <span className={styles.filterCount}>({grammarMatches.length})</span>
          </button>
          <button
            type="button"
            className={`${styles.filterButton} ${selectedCefr === 'B1' ? styles.active : ''}`}
            onClick={() => setSelectedCefr('B1')}
          >
            B1 <span className={styles.filterCount}>({b1Count})</span>
          </button>
          <button
            type="button"
            className={`${styles.filterButton} ${selectedCefr === 'B2' ? styles.active : ''}`}
            onClick={() => setSelectedCefr('B2')}
          >
            B2 <span className={styles.filterCount}>({b2Count})</span>
          </button>
          <button
            type="button"
            className={`${styles.filterButton} ${selectedCefr === 'C1' ? styles.active : ''}`}
            onClick={() => setSelectedCefr('C1')}
          >
            C1 <span className={styles.filterCount}>({c1Count})</span>
          </button>
        </div>

        {/* List of Grammar Matches */}
        <div className={styles.listContainer}>
          {filteredMatches.length === 0 ? (
            <div className={styles.emptyState}>
              <BookOpen size={32} strokeWidth={1.5} />
              <p>No grammar patterns match the selected filter.</p>
            </div>
          ) : (
            filteredMatches.map((item) => (
              <div
                key={item.id}
                className={styles.itemCard}
                onClick={() => {
                  onSelectGrammarCue(item);
                  onClose();
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    onSelectGrammarCue(item);
                    onClose();
                  }
                }}
              >
                <div className={styles.itemLeft}>
                  <div className={styles.itemMeta}>
                    <span className={styles.timestampPill}>
                      <Clock size={11} strokeWidth={2} />
                      {item.formattedTimestamp}
                    </span>
                    <span className={styles.ruleName}>{item.grammar.name}</span>
                    <span className={`${styles.cefrPill} ${getCefrClass(item.grammar.cefrLevel)}`}>
                      {item.grammar.cefrLevel}
                    </span>
                  </div>
                  <p className={styles.itemText}>
                    {renderHighlightedSnippet(item.text, item.grammar.matchedText)}
                  </p>
                </div>

                <div className={styles.actionButton} title="Jump to timestamp and review">
                  <Play size={13} style={{ fill: 'currentColor', marginLeft: 2 }} />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

