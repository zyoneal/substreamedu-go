import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene4_Pair: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Entrance slide from sides (frames 0 to 24)
  const slideProgress = interpolate(frame, [0, 24], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const cardAOffset = interpolate(slideProgress, [0, 1], [-400, -80]);
  const cardBOffset = interpolate(slideProgress, [0, 1], [400, 80]);

  // 3D Y-axis flip at frame 40-58
  const flipRotation = interpolate(frame, [40, 58], [0, 180], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Camera slow push-in (4%)
  const cameraScale = interpolate(frame, [0, 90], [1.0, 1.04], {
    extrapolateRight: 'clamp',
  });

  // Headline reveal
  const headlineSpring = spring({
    frame: frame - 18,
    fps,
    config: { stiffness: 170, damping: 24, mass: 1 },
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
        perspective: 1400,
      }}
    >
      {/* 3D Stage with Cards */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${cameraScale})`,
        }}
      >
        {/* Card A: RECOGNITION (Word -> Meaning) */}
        <div
          style={{
            position: 'absolute',
            width: 440,
            height: 320,
            borderRadius: 18,
            backgroundColor: '#141312',
            border: '1px solid #3d3934',
            padding: '24px 28px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
            transform: `translateX(${cardAOffset}px) translateY(-30px) rotateY(${flipRotation}deg)`,
            transformStyle: 'preserve-3d',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            zIndex: frame < 49 ? 20 : 10,
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  color: '#0045e6',
                }}
              >
                TYPE 0 • RECOGNITION
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: 'rgba(237,232,224,0.4)',
                }}
              >
                L2 → L1
              </span>
            </div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 36, fontWeight: 700, color: '#ede8e0' }}>
              sparrow
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 18, color: '#9e988f', marginTop: 4 }}>
              [/ˈspær.oʊ/]
            </div>
          </div>

          <div
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              backgroundColor: 'rgba(255,255,255,0.05)',
              border: '1px dashed rgba(255,255,255,0.15)',
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              color: 'rgba(237,232,224,0.6)',
            }}
          >
            Tap to reveal meaning
          </div>
        </div>

        {/* Card B: PRODUCTION (Meaning -> Word) */}
        <div
          style={{
            position: 'absolute',
            width: 440,
            height: 320,
            borderRadius: 18,
            backgroundColor: '#1a1917',
            border: '1px solid #282522',
            padding: '24px 28px',
            boxShadow: '0 24px 60px rgba(0,0,0,0.85)',
            transform: `translateX(${cardBOffset}px) translateY(30px) rotateY(${flipRotation}deg)`,
            transformStyle: 'preserve-3d',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            zIndex: frame < 49 ? 10 : 20,
          }}
        >
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  color: '#22c55e',
                }}
              >
                TYPE 1 • PRODUCTION
              </span>
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 13,
                  color: 'rgba(237,232,224,0.4)',
                }}
              >
                L1 → L2
              </span>
            </div>
            <div
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 22,
                lineHeight: 1.35,
                fontWeight: 500,
                color: '#ede8e0',
              }}
            >
              A small brownish-grey songbird (горобець / воробей)
            </div>
          </div>

          <div
            style={{
              padding: '10px 16px',
              borderRadius: 8,
              backgroundColor: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.25)',
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              color: '#22c55e',
              fontWeight: 600,
            }}
          >
            Recall target word
          </div>
        </div>
      </div>

      {/* Headline Text: "Both directions." */}
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
            fontSize: 78,
            fontWeight: 400,
            color: '#ede8e0',
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
          }}
        >
          Active recall.
          <br />
          <span style={{ color: '#9e988f', fontWeight: 300 }}>Both directions.</span>
        </div>
      </div>
    </div>
  );
};
