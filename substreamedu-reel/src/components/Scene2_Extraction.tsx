import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene2_Extraction: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Screen Studio-style smooth push-in
  const pushIn = interpolate(frame, [0, 60], [1.9, 2.7], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const driftY = interpolate(frame, [30, 90], [0, -40], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Border light sweep (left to right over 20 frames)
  const lightSweepX = interpolate(frame, [15, 35], [-100, 200], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  // Callouts staggered entrance
  const callout1Opacity = interpolate(frame, [18, 26], [0, 1], { extrapolateRight: 'clamp' });
  const callout2Opacity = interpolate(frame, [23, 31], [0, 1], { extrapolateRight: 'clamp' });
  const callout3Opacity = interpolate(frame, [28, 36], [0, 1], { extrapolateRight: 'clamp' });
  const callout4Opacity = interpolate(frame, [33, 41], [0, 1], { extrapolateRight: 'clamp' });

  // Headline mask reveal at frame 42
  const headlineSpring = spring({
    frame: frame - 42,
    fps,
    config: { stiffness: 170, damping: 24, mass: 1 },
  });
  const headlineY = interpolate(headlineSpring, [0, 1], [30, 0]);
  const headlineOpacity = interpolate(frame, [42, 52], [0, 1], { extrapolateRight: 'clamp' });

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
      {/* Zoom / Push-in Stage */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${pushIn}) translateY(${driftY}px)`,
          transformOrigin: '540px 800px',
        }}
      >
        {/* Translation Card Container */}
        <div
          style={{
            position: 'relative',
            width: 540,
            borderRadius: 16,
            backgroundColor: '#141312',
            border: '1px solid #282522',
            padding: '24px 28px',
            boxShadow: '0 30px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.04)',
            overflow: 'hidden',
          }}
        >
          {/* Border light sweep gradient */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: `${lightSweepX}%`,
              width: 140,
              height: '100%',
              background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)',
              pointerEvents: 'none',
              transform: 'skewX(-20deg)',
            }}
          />

          {/* Word Header & IPA */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginBottom: 12 }}>
            <span
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 34,
                fontWeight: 700,
                color: '#ede8e0',
                letterSpacing: '-0.02em',
              }}
            >
              sparrow
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 20,
                fontWeight: 500,
                color: '#9e988f',
              }}
            >
              [/ˈspær.oʊ/]
            </span>
          </div>

          {/* Contextual Translation & Tags */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 600,
                color: '#ede8e0',
                backgroundColor: 'rgba(0, 69, 230, 0.25)',
                border: '1px solid rgba(0, 69, 230, 0.5)',
                padding: '4px 10px',
                borderRadius: 9999,
                letterSpacing: '0.04em',
              }}
            >
              NOUN
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 600,
                color: '#9e988f',
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid #282522',
                padding: '4px 10px',
                borderRadius: 9999,
              }}
            >
              NATURAL CONTEXT
            </span>
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                fontWeight: 600,
                color: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.12)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                padding: '4px 10px',
                borderRadius: 9999,
              }}
            >
              A2
            </span>
          </div>

          {/* Definition */}
          <div
            style={{
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontSize: 18,
              lineHeight: 1.45,
              color: '#ede8e0',
              marginBottom: 16,
            }}
          >
            A small brownish-grey songbird, common in both rural areas and cities.
          </div>

          {/* Scene Context Sentence */}
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(26, 25, 23, 0.8)',
              borderRadius: 8,
              borderLeft: '3px solid #0045e6',
            }}
          >
            <div
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 11,
                color: 'rgba(237,232,224,0.45)',
                marginBottom: 4,
                letterSpacing: '0.06em',
              }}
            >
              SCENE TIMECODE: 00:41:07
            </div>
            <div
              style={{
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                fontSize: 14,
                color: '#9e988f',
                fontStyle: 'italic',
              }}
            >
              “You got the whole scene except one <span style={{ color: '#ede8e0', fontWeight: 600 }}>sparrow</span>.”
            </div>
          </div>
        </div>

        {/* Leader-line Callouts */}
        {/* Callout 1: IPA */}
        <div
          style={{
            position: 'absolute',
            top: 590,
            right: 170,
            opacity: callout1Opacity,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#ede8e0' }} />
          <div style={{ width: 40, height: 1, backgroundColor: 'rgba(237,232,224,0.3)' }} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              letterSpacing: '0.1em',
              color: 'rgba(237,232,224,0.7)',
            }}
          >
            IPA
          </span>
        </div>

        {/* Callout 2: PART OF SPEECH */}
        <div
          style={{
            position: 'absolute',
            top: 650,
            left: 170,
            opacity: callout2Opacity,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              letterSpacing: '0.1em',
              color: 'rgba(237,232,224,0.7)',
            }}
          >
            PART OF SPEECH
          </span>
          <div style={{ width: 36, height: 1, backgroundColor: 'rgba(237,232,224,0.3)' }} />
          <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#ede8e0' }} />
        </div>

        {/* Callout 3: CONTEXT */}
        <div
          style={{
            position: 'absolute',
            top: 770,
            right: 140,
            opacity: callout3Opacity,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#0045e6' }} />
          <div style={{ width: 48, height: 1, backgroundColor: '#0045e6' }} />
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              letterSpacing: '0.1em',
              color: '#0045e6',
              fontWeight: 600,
            }}
          >
            LIVE CONTEXT
          </span>
        </div>

        {/* Callout 4: REGISTER */}
        <div
          style={{
            position: 'absolute',
            top: 720,
            left: 170,
            opacity: callout4Opacity,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              letterSpacing: '0.1em',
              color: 'rgba(237,232,224,0.7)',
            }}
          >
            REGISTER: COMMON
          </span>
          <div style={{ width: 36, height: 1, backgroundColor: 'rgba(237,232,224,0.3)' }} />
          <div style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: '#ede8e0' }} />
        </div>
      </div>

      {/* Headline Text: "From this scene. Not a dictionary." */}
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
            fontSize: 76,
            fontWeight: 400,
            color: '#ede8e0',
            letterSpacing: '-0.025em',
            lineHeight: 1.12,
          }}
        >
          From this scene.
          <br />
          <span style={{ color: '#9e988f', fontWeight: 300 }}>Not a dictionary.</span>
        </div>
      </div>
    </div>
  );
};
