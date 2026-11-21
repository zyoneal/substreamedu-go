import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import styles from './FocusModeToggle.module.css';

export interface FocusModeToggleProps {
  active: boolean;
  onToggle: () => void;
  activeLabel?: string;
  inactiveLabel?: string;
  className?: string;
}

export const FocusModeToggle: React.FC<FocusModeToggleProps> = ({
  active,
  onToggle,
  activeLabel = 'Exit focus',
  inactiveLabel = 'Focus',
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={active}
      aria-label={active ? activeLabel : inactiveLabel}
      title={active ? `${activeLabel} (Esc)` : inactiveLabel}
      data-focus-mode={active ? 'true' : 'false'}
      className={cn(styles.button, active && styles.active, className)}
    >
      <span className={styles.iconSlot} aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          {active ? (
            <motion.span
              key="exit"
              className={styles.iconInner}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.65, rotate: -15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.65, rotate: 15 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 420, damping: 24 }
              }
            >
              <Minimize2 size={14} strokeWidth={2.2} />
            </motion.span>
          ) : (
            <motion.span
              key="enter"
              className={styles.iconInner}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.65, rotate: 15 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.65, rotate: -15 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 420, damping: 24 }
              }
            >
              <Maximize2 size={14} strokeWidth={2.2} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      <span className={styles.label}>{active ? activeLabel : inactiveLabel}</span>
    </button>
  );
};

export default FocusModeToggle;
