// Shared paper panel with a hand-drawn double border and soft shadow.

import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {handdrawnV1} from '../visual-profiles/handdrawn-v1';

const {colors, layout} = handdrawnV1;

interface PaperPanelProps {
  children: React.ReactNode;
  delay?: number;
  enterFrom?: number;
  style?: React.CSSProperties;
  shade?: boolean;
}

export const PaperPanel: React.FC<PaperPanelProps> = ({
  children,
  delay = 0,
  enterFrom = 36,
  style,
  shade = false,
}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const entrance = spring({
    frame: frame - delay,
    fps,
    config: {damping: 200, stiffness: 110, mass: 0.9},
  });
  const visible = frame >= delay;
  return (
    <div
      style={{
        position: 'relative',
        opacity: visible ? interpolate(entrance, [0, 1], [0, 1]) : 0,
        transform: `translateY(${visible ? interpolate(entrance, [0, 1], [enterFrom, 0]) : enterFrom}px)`,
        background: shade ? colors.paperShade : colors.card,
        borderRadius: layout.radius,
        border: `${layout.strokeWidth}px solid ${colors.ink}`,
        boxShadow: `6px 8px 0 rgba(27, 74, 122, 0.14)`,
        padding: 36,
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 8,
          borderRadius: layout.radius - 6,
          border: `1.5px solid ${colors.line}`,
          pointerEvents: 'none',
        }}
      />
      {children}
    </div>
  );
};
