import React, { useEffect, useState } from 'react';
import styles from './pixzen.module.css';

interface TypingHeadlineProps {
  phrases: readonly string[];
  typeMs?: number;
  deleteMs?: number;
  holdMs?: number;
}

const TypingHeadline: React.FC<TypingHeadlineProps> = ({
  phrases,
  typeMs = 85,
  deleteMs = 45,
  holdMs = 1800,
}) => {
  const reduced =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [length, setLength] = useState(reduced ? phrases[0].length : 0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (reduced) return undefined;
    const phrase = phrases[phraseIndex];
    let delay = deleting ? deleteMs : typeMs;
    if (!deleting && length === phrase.length) delay = holdMs;

    const timer = window.setTimeout(() => {
      if (!deleting && length === phrase.length) {
        setDeleting(true);
      } else if (deleting && length === 0) {
        setDeleting(false);
        setPhraseIndex((i) => (i + 1) % phrases.length);
      } else {
        setLength((l) => l + (deleting ? -1 : 1));
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [reduced, phrases, phraseIndex, length, deleting, typeMs, deleteMs, holdMs]);

  return (
    <span className={styles.typing}>
      <span aria-hidden="true">{phrases[phraseIndex].slice(0, length)}</span>
      <span className={styles.cursor} aria-hidden="true" />
    </span>
  );
};

export default TypingHeadline;
