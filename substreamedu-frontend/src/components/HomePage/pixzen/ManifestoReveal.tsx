import React, { useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';
import styles from './pixzen.module.css';

gsap.registerPlugin(ScrollTrigger);

interface ManifestoRevealProps {
  text: string;
}

const ManifestoReveal: React.FC<ManifestoRevealProps> = ({ text }) => {
  const rootRef = useRef<HTMLParagraphElement>(null);
  const words = text.split(/\s+/).filter(Boolean);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    const targets = root.querySelectorAll<HTMLElement>('[data-word]');

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      gsap.set(targets, { opacity: 1 });
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        targets,
        { opacity: 0.14 },
        {
          opacity: 1,
          ease: 'power4.out',
          stagger: 0.1,
          scrollTrigger: { trigger: root, start: 'top 80%', end: 'bottom 45%', scrub: 1 },
        },
      );
    }, root);
    return () => ctx.revert();
  }, [text]);

  return (
    <p ref={rootRef} className={styles.manifesto} aria-label={text}>
      {words.map((word, i) => (
        <span key={`${word}-${i}`} data-word aria-hidden="true" className={styles.manifestoWord}>
          {word}{' '}
        </span>
      ))}
    </p>
  );
};

export default ManifestoReveal;
