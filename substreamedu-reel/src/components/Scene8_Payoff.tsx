import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

export const Scene8_Payoff: React.FC = () => {
  const frame = useCurrentFrame();

  // Dimming from film scene to end card at frame 25
  const endCardOpacity = interpolate(frame, [15, 32], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const filmOpacity = interpolate(frame, [15, 30], [1, 0.15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Audio wave pulse visualizer
  const waveScale = 1.0 + Math.sin(frame * 0.3) * 0.15;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        backgroundColor: '#0d0c0b',
      }}
    >
      {/* Film Audio Spotlight Scene (Fading into background) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: filmOpacity,
        }}
      >
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18,
            color: '#0045e6',
            letterSpacing: '0.1em',
            marginBottom: 20,
          }}
        >
          DAY 14 • EFFORTLESS RETENTION
        </div>
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 32,
            color: '#ede8e0',
            fontWeight: 400,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <span>“…and that</span>
          <span
            style={{
              position: 'relative',
              fontWeight: 700,
              color: '#ede8e0',
              backgroundColor: 'rgba(0, 69, 230, 0.25)',
              padding: '4px 12px',
              borderRadius: 8,
              border: '1px solid #0045e6',
              boxShadow: '0 0 20px rgba(0, 69, 230, 0.6)',
              transform: `scale(${waveScale})`,
            }}
          >
            sparrow
          </span>
          <span>landed nearby…”</span>
        </div>
      </div>

      {/* Final End Card Resolution */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: endCardOpacity,
          zIndex: 40,
        }}
      >
        {/* Logo / Brand Name */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginBottom: 20,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: '#0045e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 30px rgba(0, 69, 230, 0.8)',
            }}
          >
            <div
              style={{
                width: 0,
                height: 0,
                borderTop: '12px solid transparent',
                borderBottom: '12px solid transparent',
                borderLeft: '18px solid #ffffff',
                marginLeft: 4,
              }}
            />
          </div>
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 72,
              fontWeight: 800,
              color: '#ede8e0',
              letterSpacing: '-0.03em',
            }}
          >
            SubStreamEdu
          </span>
        </div>

        {/* Tagline */}
        <div
          style={{
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 40,
            fontWeight: 300,
            color: 'rgba(237, 232, 224, 0.85)',
            letterSpacing: '0.04em',
            marginBottom: 36,
          }}
        >
          Watch. Click. Keep.
        </div>

        {/* Call to Action Badge */}
        <div
          style={{
            padding: '12px 28px',
            borderRadius: 9999,
            backgroundColor: 'rgba(255, 255, 255, 0.05)',
            border: '1px solid #3d3934',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 20,
            color: '#0045e6',
            letterSpacing: '0.06em',
            fontWeight: 600,
          }}
        >
          substreamedu.com
        </div>

        {/* Sub-label */}
        <div
          style={{
            marginTop: 40,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 22,
            color: '#9e988f',
            fontStyle: 'italic',
          }}
        >
          “Next time, you’ll just hear it.”
        </div>
      </div>
    </div>
  );
};
