import React from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import styles from './LoadingToSuccessButton.module.css';

export type LoadingButtonState = 'idle' | 'loading' | 'success';

export interface LoadingToSuccessButtonProps {
  state: LoadingButtonState;
  idleLabel: React.ReactNode;
  loadingLabel: React.ReactNode;
  successLabel: React.ReactNode;
  idleIcon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
  ariaLabel?: string;
  className?: string;
}

export const LoadingToSuccessButton: React.FC<LoadingToSuccessButtonProps> = ({
  state,
  idleLabel,
  loadingLabel,
  successLabel,
  idleIcon,
  onClick,
  disabled = false,
  title,
  ariaLabel,
  className,
}) => {
  const prefersReducedMotion = useReducedMotion();
  const isLoading = state === 'loading';
  const isSuccess = state === 'success';

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 420, damping: 28 };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      aria-label={ariaLabel}
      title={title}
      data-state={state}
      className={cn(
        styles.button,
        isSuccess && styles.success,
        className
      )}
    >
      <AnimatePresence mode="popLayout" initial={false}>
        {isLoading ? (
          <motion.span
            key="loading"
            className={styles.content}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.92 }}
            transition={transition}
          >
            <Loader2 size={14} className={styles.spinner} aria-hidden="true" />
            <span>{loadingLabel}</span>
          </motion.span>
        ) : isSuccess ? (
          <motion.span
            key="success"
            className={styles.content}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.92 }}
            transition={transition}
          >
            <Check size={14} strokeWidth={2.75} className={styles.checkIcon} aria-hidden="true" />
            <span>{successLabel}</span>
          </motion.span>
        ) : (
          <motion.span
            key="idle"
            className={styles.content}
            initial={prefersReducedMotion ? false : { opacity: 0, y: 6, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -6, scale: 0.92 }}
            transition={transition}
          >
            {idleIcon && <span className={styles.idleIcon} aria-hidden="true">{idleIcon}</span>}
            <span>{idleLabel}</span>
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  );
};

export default LoadingToSuccessButton;
