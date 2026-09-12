import React, { useEffect, useState, useRef } from 'react';
import { motion, useSpring, useMotionValue, AnimatePresence } from 'framer-motion';
import styles from './CinematicCursor.module.css';

export type CursorVariant = 'default' | 'hover' | 'stream' | 'reveal' | 'drag' | 'action';

interface CursorState {
  text: string;
  variant: CursorVariant;
  isVisible: boolean;
}

export const CinematicCursor: React.FC = () => {
  const [cursorState, setCursorState] = useState<CursorState>({
    text: '',
    variant: 'default',
    isVisible: false,
  });

  const stateRef = useRef<CursorState>({
    text: '',
    variant: 'default',
    isVisible: false,
  });

  const [isMouseDown, setIsMouseDown] = useState(false);
  const [isPointerDevice, setIsPointerDevice] = useState(false);

  const rawX = useMotionValue(-100);
  const rawY = useMotionValue(-100);

  const springX = useSpring(rawX, { damping: 28, stiffness: 350, mass: 0.35 });
  const springY = useSpring(rawY, { damping: 28, stiffness: 350, mass: 0.35 });

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
    setIsPointerDevice(mediaQuery.matches);

    const handleMediaChange = (e: MediaQueryListEvent) => {
      setIsPointerDevice(e.matches);
    };

    mediaQuery.addEventListener('change', handleMediaChange);
    return () => mediaQuery.removeEventListener('change', handleMediaChange);
  }, []);

  useEffect(() => {
    if (!isPointerDevice) return;

    const updateState = (next: CursorState) => {
      const current = stateRef.current;
      if (
        current.isVisible === next.isVisible &&
        current.variant === next.variant &&
        current.text === next.text
      ) {
        return;
      }
      stateRef.current = next;
      setCursorState(next);
    };

    const handleMouseMove = (e: MouseEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);

      const target = e.target as HTMLElement | null;
      if (!target) return;

      const cursorTarget = target.closest('[data-cursor]') as HTMLElement | null;
      if (cursorTarget) {
        const variant = (cursorTarget.getAttribute('data-cursor') || 'action') as CursorVariant;
        const text = cursorTarget.getAttribute('data-cursor-text') || '';
        updateState({ text, variant, isVisible: true });
        return;
      }

      const interactiveTarget = target.closest(
        'button, a, input, textarea, select, [role="button"], [role="checkbox"], label, summary'
      );
      if (interactiveTarget) {
        updateState({ text: '', variant: 'hover', isVisible: true });
        return;
      }

      updateState({ text: '', variant: 'default', isVisible: true });
    };

    const handleMouseDown = () => setIsMouseDown(true);
    const handleMouseUp = () => setIsMouseDown(false);

    const handleMouseLeave = () => {
      updateState({ text: '', variant: 'default', isVisible: false });
    };

    const handleMouseEnter = () => {
      updateState({ ...stateRef.current, isVisible: true });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('mousedown', handleMouseDown, { passive: true });
    window.addEventListener('mouseup', handleMouseUp, { passive: true });
    window.addEventListener('blur', handleMouseLeave);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('blur', handleMouseLeave);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [isPointerDevice, rawX, rawY]);

  if (!isPointerDevice) {
    return null;
  }

  const isPillVariant =
    cursorState.variant === 'stream' ||
    cursorState.variant === 'reveal' ||
    cursorState.variant === 'drag' ||
    cursorState.variant === 'action';

  return (
    <div className={styles.cursorContainer}>
      <AnimatePresence>
        {cursorState.isVisible && (
          <>
            <motion.div
              className={styles.microDot}
              style={{
                x: rawX,
                y: rawY,
              }}
              initial={{ opacity: 0, scale: 0 }}
              animate={{
                opacity: isPillVariant ? 0 : 1,
                scale: isMouseDown ? 0.7 : 1,
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ duration: 0.12 }}
            />

            <motion.div
              className={`${styles.trailingWrapper} ${styles[cursorState.variant] || ''}`}
              style={{
                x: springX,
                y: springY,
              }}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{
                opacity: 1,
                scale: isMouseDown ? 0.88 : 1,
              }}
              exit={{ opacity: 0, scale: 0.7 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              {isPillVariant ? (
                <motion.div
                  className={styles.cursorPill}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                >
                  {cursorState.variant === 'stream' && <span className={styles.cursorDotStream} />}
                  {cursorState.variant === 'reveal' && <span className={styles.cursorDotReveal} />}
                  {cursorState.variant === 'drag' && <span className={styles.cursorDotDrag} />}
                  {cursorState.variant === 'action' && <span className={styles.cursorDotAction} />}
                  {cursorState.text && <span className={styles.cursorText}>{cursorState.text}</span>}
                </motion.div>
              ) : (
                <motion.div
                  className={`${styles.followerRing} ${cursorState.variant === 'hover' ? styles.ringHover : ''}`}
                  animate={{
                    scale: cursorState.variant === 'hover' ? 1.5 : 1,
                  }}
                  transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CinematicCursor;
