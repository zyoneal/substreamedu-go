import React from 'react';
import { useCurrentFrame } from 'remotion';

export const TimecodeChip: React.FC<{
  freezeFrame?: number;
  label?: string;
}> = ({ freezeFrame = 60, label }) => {
  const frame = useCurrentFrame();
  const effectiveFrame = Math.min(frame, freezeFrame);

  // Generate ticking frame string
  const baseMinutes = 41;
  const baseSeconds = 7 + Math.floor(effectiveFrame / 30);
  const subFrames = (12 + (effectiveFrame % 30)) % 30;

  const pad = (n: number) => n.toString().padStart(2, '0');
  const timecode = `00:${pad(baseMinutes)}:${pad(baseSeconds)}:${pad(subFrames)}`;

  return (
    <div
      style={{
        position: 'absolute',
        top: 80,
        left: 72,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        zIndex: 40,
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: frame >= freezeFrame ? '#ef4444' : '#22c55e',
          boxShadow: frame >= freezeFrame ? '0 0 10px #ef4444' : '0 0 10px #22c55e',
          transition: 'background-color 0.2s',
        }}
      />
      <span
        style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontWeight: 500,
          fontSize: 26,
          letterSpacing: '0.08em',
          color: 'rgba(237, 232, 224, 0.55)',
        }}
      >
        {label || timecode}
      </span>
    </div>
  );
};
