import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene7_Proof: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Typing "sparrow" letter-by-letter between frame 6 and frame 32
  const fullWord = 'sparrow';
  const typeIndex = Math.min(
    fullWord.length,
    Math.max(0, Math.floor(interpolate(frame, [6, 32], [0, fullWord.length], { extrapolateRight: 'clamp' })))
  );
  const typedLetters = fullWord.slice(0, typeIndex);

  // Check button click at frame 38
  const isChecked = frame >= 38;

  // Headline reveal
  const headlineSpring = spring({
    frame: frame - 10,
    fps,
    config: { stiffness: 180, damping: 24, mass: 1 },
  });
  const headlineY = interpolate(headlineSpring, [0, 1], [30, 0]);

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
      {/* Exercise Card Mockup */}
      <div
        style={{
          position: 'absolute',
          top: 380,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 580,
          padding: '32px 30px',
          borderRadius: 20,
          backgroundColor: '#141312',
          border: '1px solid #282522',
          boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#0045e6', fontWeight: 600 }}>
            CONTEXTUAL CLOZE EXERCISE
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(237,232,224,0.4)' }}>
            ACTIVE PRODUCTION
          </span>
        </div>

        <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 24, color: '#ede8e0', lineHeight: 1.4 }}>
          “You got the whole scene except one{' '}
          <span
            style={{
              display: 'inline-block',
              minWidth: 120,
              padding: '2px 10px',
              borderRadius: 6,
              backgroundColor: isChecked ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)',
              borderBottom: isChecked ? '2px solid #22c55e' : '2px dashed #0045e6',
              color: isChecked ? '#22c55e' : '#ede8e0',
              fontWeight: 600,
            }}
          >
            {typedLetters}
            {!isChecked && (frame % 10 < 5) && <span style={{ color: '#0045e6' }}>|</span>}
          </span>
          .”
        </div>

        {/* Check Button */}
        <div
          style={{
            height: 52,
            borderRadius: 10,
            backgroundColor: isChecked ? '#22c55e' : '#1a1917',
            border: isChecked ? '1px solid #22c55e' : '1px solid #3d3934',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: "'JetBrains Mono', monospace",
            fontWeight: 700,
            fontSize: 16,
            color: isChecked ? '#ffffff' : '#9e988f',
            boxShadow: isChecked ? '0 0 20px rgba(34, 197, 94, 0.5)' : 'none',
          }}
        >
          {isChecked ? '✓ CORRECT • RECALL REINFORCED' : 'CHECK ANSWER'}
        </div>
      </div>

      {/* Headline Text: "Then you use it." */}
      <div
        style={{
          position: 'absolute',
          left: 72,
          bottom: 240,
          overflow: 'hidden',
          zIndex: 40,
        }}
      >
        <div
          style={{
            transform: `translateY(${headlineY}px)`,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 84,
            fontWeight: 400,
            color: '#ede8e0',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
          }}
        >
          Then you use it.
        </div>
      </div>
    </div>
  );
};
