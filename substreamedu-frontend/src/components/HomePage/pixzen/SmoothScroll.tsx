import { useEffect } from 'react';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** Mounts Lenis (lerp 0.05) and drives it from the GSAP ticker so ScrollTrigger stays in sync. */
const SmoothScroll: React.FC = () => {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;

    const lenis = new Lenis({ lerp: 0.05 });
    lenis.on('scroll', ScrollTrigger.update);

    const tick = (time: number): void => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
    };
  }, []);

  return null;
};

export default SmoothScroll;
