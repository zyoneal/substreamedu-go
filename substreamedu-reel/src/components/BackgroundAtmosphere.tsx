import React from 'react';
import { useCurrentFrame } from 'remotion';

export const BackgroundAtmosphere: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();

  // Subtle breathing pulse on the ambient projector light
  const ambientPulse = 0.85 + Math.sin(frame * 0.04) * 0.05;

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#0d0c0b',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Subtle warm projector overhead glow */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '10%',
          width: '80%',
          height: '50%',
          background: 'radial-gradient(ellipse at center, rgba(160, 120, 70, 0.08) 0%, rgba(13, 12, 11, 0) 70%)',
          pointerEvents: 'none',
          opacity: ambientPulse,
          filter: 'blur(60px)',
        }}
      />

      {/* Electric cobalt accent falloff in lower-right */}
      <div
        style={{
          position: 'absolute',
          bottom: '-10%',
          right: '-10%',
          width: '60%',
          height: '50%',
          background: 'radial-gradient(circle at center, rgba(0, 69, 230, 0.09) 0%, rgba(13, 12, 11, 0) 70%)',
          pointerEvents: 'none',
          filter: 'blur(80px)',
        }}
      />

      {/* 35mm Vignette overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at center, transparent 45%, rgba(5, 5, 4, 0.65) 100%)',
          pointerEvents: 'none',
          zIndex: 50,
        }}
      />

      {/* Content Layer */}
      <div style={{ position: 'relative', width: '100%', height: '100%', zIndex: 10 }}>
        {children}
      </div>
    </div>
  );
};
