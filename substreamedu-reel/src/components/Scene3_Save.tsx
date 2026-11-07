import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene3_Save: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Click lands at frame 24 (0.80s)
  const isClicked = frame >= 24;

  // Button compression (frames 24-28)
  const buttonScale =
    frame >= 24 && frame <= 28
      ? interpolate(frame, [24, 26, 28], [1.0, 0.94, 1.0], { extrapolateRight: 'clamp' })
      : 1.0;

  // Expanding cobalt ripple
  const rippleRadius = interpolate(frame, [24, 42], [0, 180], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const rippleOpacity = interpolate(frame, [24, 38, 42], [0.9, 0.4, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Vertical digit roll for "00" -> "02" (frames 26-40)
  const digitRollProgress = interpolate(frame, [26, 38], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Headline mask reveal at frame 34
  const headlineSpring = spring({
    frame: frame - 34,
    fps,
    config: { stiffness: 180, damping: 24, mass: 1 },
  });
  const headlineY = interpolate(headlineSpring, [0, 1], [30, 0]);
  const headlineOpacity = interpolate(frame, [34, 44], [0, 1], { extrapolateRight: 'clamp' });

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
      {/* Top-Right Counter Chip */}
      <div
        style={{
          position: 'absolute',
          top: 80,
          right: 72,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-end',
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 26,
              fontWeight: 500,
              color: 'rgba(237,232,224,0.6)',
              letterSpacing: '0.08em',
            }}
          >
            CARDS
          </span>
          <div
            style={{
              height: 34,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 28,
              fontWeight: 700,
              color: isClicked ? '#0045e6' : '#ede8e0',
              textShadow: isClicked ? '0 0 12px rgba(0,69,230,0.8)' : 'none',
              transform: `translateY(-${digitRollProgress * 34}px)`,
            }}
          >
            <div style={{ height: 34, display: 'flex', alignItems: 'center' }}>00</div>
            <div style={{ height: 34, display: 'flex', alignItems: 'center' }}>02</div>
          </div>
        </div>
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 16,
            color: 'rgba(237,232,224,0.4)',
            marginTop: 4,
          }}
        >
          EN → UA / UA → EN
        </span>
      </div>

      {/* Main Focus Stage: SAVE Button & Ripple */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'scale(1.3)',
        }}
      >
        <div
          style={{
            position: 'relative',
            width: 440,
            padding: '24px',
            backgroundColor: '#141312',
            borderRadius: 16,
            border: '1px solid #282522',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            boxShadow: '0 24px 60px rgba(0,0,0,0.8)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 22, fontWeight: 600, color: '#ede8e0' }}>
              Add to Active Recall
            </span>
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#22c55e' }}>
              FSRS READY
            </span>
          </div>

          {/* Big Interactive Save Button */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              height: 64,
              borderRadius: 12,
              backgroundColor: isClicked ? '#0045e6' : '#1a1917',
              border: isClicked ? '1px solid #0045e6' : '1px solid #3d3934',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `scale(${buttonScale})`,
              boxShadow: isClicked ? '0 0 24px rgba(0,69,230,0.6)' : 'none',
              cursor: 'pointer',
              overflow: 'hidden',
            }}
          >
            {/* Ripple Effect */}
            {isClicked && (
              <div
                style={{
                  position: 'absolute',
                  width: rippleRadius,
                  height: rippleRadius,
                  borderRadius: '50%',
                  border: '2px solid #ffffff',
                  opacity: rippleOpacity,
                  pointerEvents: 'none',
                }}
              />
            )}
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 600,
                fontSize: 20,
                letterSpacing: '0.06em',
                color: '#ffffff',
              }}
            >
              {isClicked ? '✓ SAVED AS 2 CARDS' : 'SAVE TO VOCABULARY'}
            </span>
          </div>
        </div>
      </div>

      {/* Headline Text: "Two cards. Both directions." */}
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
            opacity: headlineOpacity,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 78,
            fontWeight: 400,
            color: '#ede8e0',
            letterSpacing: '-0.025em',
            lineHeight: 1.1,
          }}
        >
          Two cards.
          <br />
          <span style={{ color: '#0045e6', fontWeight: 600 }}>Both directions.</span>
        </div>
      </div>
    </div>
  );
};
