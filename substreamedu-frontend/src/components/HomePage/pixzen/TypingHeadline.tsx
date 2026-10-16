import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './pixzen.module.css';

interface TypingHeadlineProps {
  phrases: readonly string[];
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
}

const TypingHeadline: React.FC<TypingHeadlineProps> = ({
  phrases,
  holdMs = 1600,
}) => {
  const reduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const [phraseIndex, setPhraseIndex] = useState(0);

  useEffect(() => {
    if (reduced || phrases.length <= 1) return undefined;
    const interval = window.setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }, holdMs);
    return () => window.clearInterval(interval);
  }, [reduced, phrases, holdMs]);

  // Initial render displays phrases[0] immediately — zero CLS, instant FCP/LCP
  return (
    <span className={styles.headlineCycler}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={phrases[phraseIndex]}
          className={styles.headlineItem}
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduced ? undefined : { opacity: 0, y: -12 }}
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        >
          {phrases[phraseIndex]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
};

export default TypingHeadline;
