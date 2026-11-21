import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { cn } from '../../lib/utils';
import styles from './StreamingText.module.css';

export interface StreamingTextProps {
  text: string;
  className?: string;
  /** Duration of the streaming reveal in ms (default 320ms). */
  durationMs?: number;
}

export const StreamingText: React.FC<StreamingTextProps> = ({
  text,
  className,
  durationMs = 320,
}) => {
  const prefersReducedMotion = useReducedMotion();

  if (!text) return null;

  if (prefersReducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <motion.span
      key={text}
      className={cn(styles.container, className)}
      initial={{ opacity: 0, y: 3, clipPath: 'inset(0 100% 0 0)' }}
      animate={{ opacity: 1, y: 0, clipPath: 'inset(0 0% 0 0)' }}
      transition={{ duration: durationMs / 1000, ease: [0.16, 1, 0.3, 1] }}
    >
      {text}
    </motion.span>
  );
};

export default StreamingText;
