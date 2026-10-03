import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene6_FsrsCurve: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Phase 1 (frames 0 to 42): decay from 1.0 to 0.90
  // Phase 2 (frames 42 to 90): spring reset to top and gentler decay
  const isReset = frame >= 42;

  // Dot coordinates along curve
  const dotProgress = interpolate(frame, [0, 42], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const curve1X = interpolate(dotProgress, [0, 1], [140, 520]);
  const curve1Y = interpolate(dotProgress, [0, 1], [620, 840]);

  // Reset spring jump
  const resetSpring = spring({
    frame: frame - 42,
    fps,
    config: { stiffness: 220, damping: 20, mass: 1 },
  });

  const curve2Progress = interpolate(frame, [42, 90], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const activeDotX = !isReset ? curve1X : interpolate(curve2Progress, [0, 1], [520, 920]);
  const activeDotY = !isReset
    ? curve1Y
    : interpolate(resetSpring, [0, 1], [840, 620]) + curve2Progress * 90;

  // Headline reveal
  const headlineSpring = spring({
    frame: frame - 15,
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
      }}
    >
      {/* Background Precision Grid */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage:
            'linear-gradient(to right, rgba(237, 232, 224, 0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(237, 232, 224, 0.04) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* SVG Mathematical Curve Visualizer */}
      <svg
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          overflow: 'visible',
        }}
      >
        {/* Dashed Retrievability Threshold Line (R = 0.90) */}
        <line
          x1="100"
          y1="840"
          x2="980"
          y2="840"
          stroke="#3d3934"
          strokeWidth="2"
          strokeDasharray="6 6"
        />

        {/* Curve 1: Initial Decay */}
        <path
          d="M 140 620 Q 300 700 520 840"
          fill="transparent"
          stroke="rgba(237, 232, 224, 0.35)"
          strokeWidth="3"
        />

        {/* Curve 2: Stabilized Decay After FSRS Review */}
        {isReset && (
          <path
            d="M 520 620 Q 720 660 940 730"
            fill="transparent"
            stroke="#0045e6"
            strokeWidth="4"
          />
        )}

        {/* Moving Active Recall Dot */}
        <circle
          cx={activeDotX}
          cy={activeDotY}
          r="8"
          fill="#0045e6"
          stroke="#ffffff"
          strokeWidth="3"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(0, 69, 230, 0.9))',
          }}
        />
      </svg>

      {/* Data HUD Readout anchored above curve */}
      <div
        style={{
          position: 'absolute',
          top: 500,
          left: 140,
          display: 'flex',
          gap: 32,
          zIndex: 30,
        }}
      >
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(237,232,224,0.45)', letterSpacing: '0.08em' }}>
            RETRIEVABILITY
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: '#ede8e0' }}>
            R = 0.90
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(237,232,224,0.45)', letterSpacing: '0.08em' }}>
            NEXT REVIEW
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: isReset ? '#22c55e' : '#0045e6' }}>
            {isReset ? '+11 DAYS' : '+4 DAYS'}
          </div>
        </div>
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(237,232,224,0.45)', letterSpacing: '0.08em' }}>
            ENGINE
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, fontWeight: 700, color: '#ede8e0' }}>
            FSRS v4
          </div>
        </div>
      </div>

      {/* Headline Text: "At the edge of forgetting." */}
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
          Brought back
          <br />
          <span style={{ color: '#0045e6', fontWeight: 600 }}>the day before you forget.</span>
        </div>
      </div>
    </div>
  );
};
