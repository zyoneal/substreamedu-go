import React, { useMemo } from 'react';
import { cn } from '../../lib/utils';
import styles from './ReadAlongText.module.css';

export interface ReadAlongTextProps {
  text: string;
  /** Playback progress through the sentence in [0, 1]. */
  progress: number;
  className?: string;
}

export const ReadAlongText: React.FC<ReadAlongTextProps> = ({
  text,
  progress,
  className,
}) => {
  const tokens = useMemo(() => {
    if (!text) return [];
    return text.split(/(\s+)/).filter((t) => t.length > 0);
  }, [text]);

  const wordIndices = useMemo(() => {
    const indices: number[] = [];
    tokens.forEach((tok, idx) => {
      if (!/^\s+$/.test(tok)) {
        indices.push(idx);
      }
    });
    return indices;
  }, [tokens]);

  if (!text) return null;

  const clamped = Math.min(1, Math.max(0, Number.isFinite(progress) ? progress : 0));
  const totalWords = wordIndices.length;
  const activeOrdinal = totalWords > 0 ? Math.min(totalWords - 1, Math.floor(clamped * totalWords)) : -1;

  let currentOrdinal = 0;

  return (
    <span className={cn(styles.root, className)}>
      {tokens.map((tok, idx) => {
        if (/^\s+$/.test(tok)) {
          return <React.Fragment key={`ws-${idx}`}>{tok}</React.Fragment>;
        }
        const ordinal = currentOrdinal;
        currentOrdinal += 1;
        const state =
          clamped >= 1 || ordinal < activeOrdinal
            ? 'spoken'
            : ordinal === activeOrdinal && clamped > 0
            ? 'active'
            : 'upcoming';

        return (
          <span
            key={`w-${idx}`}
            data-read-state={state}
            className={cn(
              styles.word,
              state === 'spoken' && styles.spoken,
              state === 'active' && styles.active,
              state === 'upcoming' && styles.upcoming
            )}
          >
            {tok}
          </span>
        );
      })}
    </span>
  );
};

export default ReadAlongText;
