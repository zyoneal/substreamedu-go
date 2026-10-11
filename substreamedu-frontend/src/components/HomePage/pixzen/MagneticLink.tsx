import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';

interface MagneticLinkProps {
  to: string;
  className?: string;
  strength?: number;
  children: React.ReactNode;
}

const MagneticLink: React.FC<MagneticLinkProps> = ({ to, className, strength = 0.35, children }) => {
  const ref = useRef<HTMLAnchorElement>(null);
  const canHover = (): boolean =>
    window.matchMedia('(hover: hover)').matches &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const handleMove = (e: React.MouseEvent<HTMLAnchorElement>): void => {
    const el = ref.current;
    if (!el || !canHover()) return;
    const rect = el.getBoundingClientRect();
    const dx = e.clientX - (rect.left + rect.width / 2);
    const dy = e.clientY - (rect.top + rect.height / 2);
    gsap.to(el, { x: dx * strength, y: dy * strength, duration: 0.6, ease: 'power4.out' });
  };

  const handleLeave = (): void => {
    if (!ref.current) return;
    gsap.to(ref.current, { x: 0, y: 0, duration: 1.1, ease: 'elastic.out(1, 0.35)' });
  };

  return (
    <Link ref={ref} to={to} className={className} onMouseMove={handleMove} onMouseLeave={handleLeave}>
      {children}
    </Link>
  );
};

export default MagneticLink;
