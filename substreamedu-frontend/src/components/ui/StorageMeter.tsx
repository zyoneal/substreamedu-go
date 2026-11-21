import React, { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';
import styles from './StorageMeter.module.css';

export interface StorageMeterSegment {
  id: string;
  label: string;
  value: number;
  tone: 'mastered' | 'learning' | 'new' | 'accent';
}

export interface StorageMeterProps {
  segments: readonly StorageMeterSegment[];
  total?: number;
  ariaLabel?: string;
  compact?: boolean;
  showLegend?: boolean;
  className?: string;
}

export const StorageMeter: React.FC<StorageMeterProps> = ({
  segments,
  total,
  ariaLabel = 'Vocabulary breakdown',
  compact = false,
  showLegend = true,
  className,
}) => {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const prefersReducedMotion = useReducedMotion();

  const positiveSegments = segments.filter((s) => s.value > 0);
  const sum = positiveSegments.reduce((acc, s) => acc + s.value, 0);
  const denominator = Math.max(total ?? sum, sum, 1);

  if (sum <= 0) {
    return null;
  }

  return (
    <div
      className={cn(styles.meter, compact && styles.compact, className)}
      role="group"
      aria-label={ariaLabel}
    >
      <div className={styles.track}>
        {positiveSegments.map((seg, idx) => {
          const pct = (seg.value / denominator) * 100;
          const isDimmed = hoveredId !== null && hoveredId !== seg.id;
          return (
            <motion.div
              key={seg.id}
              className={cn(styles.segment, styles[`tone_${seg.tone}`], isDimmed && styles.dimmed)}
              style={{ width: `${pct.toFixed(2)}%`, transformOrigin: 'left center' }}
              initial={prefersReducedMotion ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 260, damping: 26, delay: idx * 0.05 }
              }
              onMouseEnter={() => setHoveredId(seg.id)}
              onMouseLeave={() => setHoveredId(null)}
              title={`${seg.label}: ${seg.value.toLocaleString()} (${Math.round(pct)}%)`}
              data-segment-id={seg.id}
            />
          );
        })}
      </div>

      {showLegend && (
        <div className={styles.legend}>
          {positiveSegments.map((seg) => {
            const pct = Math.round((seg.value / denominator) * 100);
            const isHighlighted = hoveredId === seg.id;
            return (
              <div
                key={seg.id}
                className={cn(styles.legendItem, isHighlighted && styles.legendItemActive)}
                onMouseEnter={() => setHoveredId(seg.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <span className={cn(styles.dot, styles[`tone_${seg.tone}`])} aria-hidden="true" />
                <span className={styles.legendLabel}>{seg.label}</span>
                <span className={styles.legendValue}>
                  {seg.value.toLocaleString()} <span className={styles.legendPct}>({pct}%)</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StorageMeter;
