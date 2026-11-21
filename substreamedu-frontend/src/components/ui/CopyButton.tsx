import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Copy, Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import styles from './CopyButton.module.css';

export interface CopyButtonProps {
  text: string;
  label?: string;
  copiedLabel?: string;
  ariaLabel?: string;
  variant?: 'light' | 'dark' | 'ghost';
  size?: 'sm' | 'md';
  resetAfterMs?: number;
  className?: string;
  onCopied?: (text: string) => void;
}

async function writeToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to legacy textarea copy
    }
  }
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

export const CopyButton: React.FC<CopyButtonProps> = ({
  text,
  label,
  copiedLabel = 'Copied',
  ariaLabel,
  variant = 'light',
  size = 'md',
  resetAfterMs = 1800,
  className,
  onCopied,
}) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleCopy = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement>) => {
      e.stopPropagation();
      if (!text) return;
      const ok = await writeToClipboard(text);
      if (!ok) return;

      setCopied(true);
      onCopied?.(text);

      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        setCopied(false);
        timerRef.current = null;
      }, resetAfterMs);
    },
    [onCopied, resetAfterMs, text]
  );

  const iconSize = size === 'sm' ? 14 : 15;
  const resolvedAriaLabel = copied
    ? copiedLabel
    : ariaLabel || (label ? label : 'Copy to clipboard');

  return (
    <button
      type="button"
      onClick={handleCopy}
      aria-label={resolvedAriaLabel}
      title={resolvedAriaLabel}
      data-copied={copied ? 'true' : 'false'}
      className={cn(
        styles.button,
        styles[variant],
        styles[size],
        copied && styles.copied,
        !label && styles.iconOnly,
        className
      )}
    >
      <span className={styles.iconSlot} aria-hidden="true">
        <AnimatePresence mode="popLayout" initial={false}>
          {copied ? (
            <motion.span
              key="check"
              className={styles.iconInner}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.55 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 460, damping: 24 }
              }
            >
              <Check size={iconSize} strokeWidth={2.5} />
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              className={styles.iconInner}
              initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.55 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, scale: 0.55 }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 460, damping: 24 }
              }
            >
              <Copy size={iconSize} strokeWidth={2} />
            </motion.span>
          )}
        </AnimatePresence>
      </span>
      {label && (
        <span className={styles.label} aria-live="polite">
          {copied ? copiedLabel : label}
        </span>
      )}
    </button>
  );
};

export default CopyButton;
