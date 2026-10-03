import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TimecodeChip } from './TimecodeChip';

export const Scene1_Freeze: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Click lands at frame 60 (2.00s)
  const isClicked = frame >= 60;

  // Cursor motion: arrives at frame 54 (1.80s), clicks at 60 (2.00s)
  const cursorX = interpolate(frame, [15, 54], [720, 572], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const cursorY = interpolate(frame, [15, 54], [1300, 978], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Scale punch on click (frame 60-63)
  const punchScale =
    frame >= 60 && frame <= 63
      ? interpolate(frame, [60, 61, 63], [1.0, 1.025, 1.0], { extrapolateRight: 'clamp' })
      : 1.0;

  // Camera pull-back from 280% to 190% over frames 60-78 (expo-out)
  const cameraScale = interpolate(frame, [0, 60, 78], [2.8, 2.8, 1.9], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Background blur and dim
  const blurAmount = interpolate(frame, [60, 68], [0, 14], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const exposureDim = interpolate(frame, [60, 68], [1.0, 0.65], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Underline draw under "sparrow" (8 frames from 60 to 68)
  const underlineWidth = interpolate(frame, [60, 68], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Headline mask reveal "Except one." at frame 66 (2.20s)
  const headlineSpring = spring({
    frame: frame - 66,
    fps,
    config: { stiffness: 180, damping: 24, mass: 1 },
  });
  const headlineY = interpolate(headlineSpring, [0, 1], [32, 0]);
  const headlineOpacity = interpolate(frame, [66, 74], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
      <TimecodeChip freezeFrame={60} />

      {/* Camera zoom / pull-back stage */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${cameraScale * punchScale})`,
          transformOrigin: '540px 960px',
        }}
      >
        {/* Cinematic Film Video Backdrop */}
        <div
          style={{
            position: 'relative',
            width: 760,
            height: 440,
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)',
            filter: `blur(${blurAmount}px) brightness(${exposureDim})`,
          }}
        >
          {/* Simulated 4K Cinematic Scene with deep warm tones */}
          <div
            style={{
              width: '100%',
              height: '100%',
              background: 'linear-gradient(135deg, #1f1b18 0%, #30261f 40%, #151413 100%)',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {/* Ambient cinematic lighting inside video */}
            <div
              style={{
                position: 'absolute',
                top: '20%',
                left: '25%',
                width: 280,
                height: 280,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(230, 140, 60, 0.3) 0%, transparent 70%)',
                filter: 'blur(40px)',
              }}
            />
            {/* Film frame aesthetic details */}
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                color: 'rgba(237,232,224,0.3)',
                position: 'absolute',
                top: 20,
                left: 24,
                letterSpacing: '0.1em',
              }}
            >
              REC • 24.00 FPS • 4K PRORES
            </div>
          </div>
        </div>

        {/* Subtitle Bar Overlay */}
        <div
          style={{
            position: 'absolute',
            top: 940,
            width: 640,
            padding: '16px 28px',
            borderRadius: 12,
            backgroundColor: 'rgba(20, 19, 18, 0.88)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            boxShadow: '0 16px 40px rgba(0,0,0,0.6)',
          }}
        >
          <span
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 26,
              color: '#ede8e0',
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
          >
            You got the whole scene except one
          </span>
          <span
            style={{
              position: 'relative',
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 26,
              fontWeight: 600,
              color: isClicked ? '#ede8e0' : '#ede8e0',
              backgroundColor: isClicked ? 'rgba(0, 69, 230, 0.16)' : 'rgba(255,255,255,0.06)',
              padding: '2px 8px',
              borderRadius: 6,
            }}
          >
            sparrow
            {/* 1px Electric Cobalt Underline */}
            <div
              style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                width: `${underlineWidth}%`,
                height: 2,
                backgroundColor: '#0045e6',
                boxShadow: '0 0 8px rgba(0, 69, 230, 0.8)',
              }}
            />
          </span>
        </div>

        {/* Custom High-Precision Reticle Cursor */}
        <div
          style={{
            position: 'absolute',
            left: cursorX,
            top: cursorY,
            pointerEvents: 'none',
            zIndex: 100,
            opacity: frame < 65 ? 1 : interpolate(frame, [65, 75], [1, 0]),
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
            <path
              d="M4 4L11 20L14 13L21 10L4 4Z"
              fill="#ede8e0"
              stroke="#0d0c0b"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      {/* Headline Text: "Except one." (Safe zone x: 72, y: 1180) */}
      <div
        style={{
          position: 'absolute',
          left: 72,
          bottom: 280,
          overflow: 'hidden',
          zIndex: 40,
        }}
      >
        <div
          style={{
            transform: `translateY(${headlineY}px)`,
            opacity: headlineOpacity,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 92,
            fontWeight: 300,
            color: '#ede8e0',
            letterSpacing: '-0.03em',
            lineHeight: 1.05,
          }}
        >
          Except one.
        </div>
      </div>
    </div>
  );
};
