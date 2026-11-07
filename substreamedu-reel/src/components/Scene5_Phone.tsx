import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const Scene5_Phone: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Timer ring: 2.5s (75 frames) countdown
  const timerDash = interpolate(frame, [0, 75], [377, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const secondsLeft = Math.max(0, 30 - Math.floor((frame / 75) * 30));
  const secondsString = `00:${secondsLeft.toString().padStart(2, '0')}`;

  // Tap "Good" rating at frame 48
  const isRatedGood = frame >= 48;
  const goodScale =
    frame >= 48 && frame <= 54
      ? interpolate(frame, [48, 51, 54], [1.0, 0.94, 1.0], { extrapolateRight: 'clamp' })
      : 1.0;

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
      {/* Top Timer Ring Indicator */}
      <div
        style={{
          position: 'absolute',
          top: 100,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          zIndex: 40,
        }}
      >
        <div style={{ position: 'relative', width: 120, height: 120 }}>
          <svg width="120" height="120" style={{ transform: 'rotate(-90deg)' }}>
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="#282522"
              strokeWidth="3"
              fill="transparent"
            />
            <circle
              cx="60"
              cy="60"
              r="50"
              stroke="#0045e6"
              strokeWidth="3"
              fill="transparent"
              strokeDasharray="377"
              strokeDashoffset={timerDash}
              strokeLinecap="round"
            />
          </svg>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 18,
              fontWeight: 600,
              color: '#ede8e0',
            }}
          >
            {secondsString}
          </div>
        </div>
      </div>

      {/* Phone Screen Mockup (Dark Telegram Interface) */}
      <div
        style={{
          position: 'absolute',
          top: 260,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 520,
          height: 820,
          borderRadius: 40,
          backgroundColor: '#121920',
          border: '4px solid #282522',
          boxShadow: '0 30px 90px rgba(0,0,0,0.9), 0 0 0 1px rgba(255,255,255,0.06)',
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 20px',
          boxSizing: 'border-box',
          overflow: 'hidden',
        }}
      >
        {/* Telegram Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingBottom: 16,
            borderBottom: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              backgroundColor: '#0045e6',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              color: '#ffffff',
            }}
          >
            SE
          </div>
          <div>
            <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 18, fontWeight: 600, color: '#ede8e0' }}>
              SubStreamEdu Bot
            </div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: '#22c55e' }}>
              bot • daily review active
            </div>
          </div>
        </div>

        {/* Telegram Message Bubble */}
        <div
          style={{
            marginTop: 24,
            padding: '20px 22px',
            backgroundColor: '#1a2430',
            borderRadius: '16px 16px 16px 4px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'rgba(237,232,224,0.5)', marginBottom: 8 }}>
            DAILY CARD 1/1 • FSRS DUE TODAY
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 26, fontWeight: 700, color: '#ede8e0', marginBottom: 4 }}>
            sparrow
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: '#9e988f', marginBottom: 12 }}>
            [/ˈspær.oʊ/]
          </div>
          <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontSize: 15, color: '#ede8e0', lineHeight: 1.4 }}>
            “You got the whole scene except one <b style={{ color: '#0045e6' }}>sparrow</b>.”
          </div>
        </div>

        {/* Telegram Inline Rating Buttons */}
        <div style={{ marginTop: 'auto', display: 'flex', gap: 10 }}>
          <div
            style={{
              flex: 1,
              padding: '14px 8px',
              borderRadius: 10,
              backgroundColor: 'rgba(239, 68, 68, 0.12)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              color: '#ef4444',
              fontWeight: 600,
            }}
          >
            Again
          </div>
          <div
            style={{
              flex: 1,
              padding: '14px 8px',
              borderRadius: 10,
              backgroundColor: 'rgba(234, 179, 8, 0.12)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              color: '#eab308',
              fontWeight: 600,
            }}
          >
            Hard
          </div>
          <div
            style={{
              flex: 1.2,
              padding: '14px 8px',
              borderRadius: 10,
              backgroundColor: isRatedGood ? '#22c55e' : 'rgba(34, 197, 94, 0.16)',
              border: '1px solid rgba(34, 197, 94, 0.4)',
              textAlign: 'center',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              color: isRatedGood ? '#ffffff' : '#22c55e',
              fontWeight: 700,
              transform: `scale(${goodScale})`,
              boxShadow: isRatedGood ? '0 0 16px rgba(34, 197, 94, 0.6)' : 'none',
            }}
          >
            {isRatedGood ? '✓ Good (+4d)' : 'Good (+4d)'}
          </div>
        </div>
      </div>

      {/* Headline Text: "30 seconds. In Telegram." */}
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
          30 seconds a day.
          <br />
          <span style={{ color: '#0045e6', fontWeight: 600 }}>In Telegram.</span>
        </div>
      </div>
    </div>
  );
};
