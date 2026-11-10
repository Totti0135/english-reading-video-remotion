// Hand-drawn SVG doodles: uneven outlines, underlines, circles, arrows.
// All animation is driven by an explicit local frame, never CSS transitions.

import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {handdrawnV1} from '../visual-profiles/handdrawn-v1';

const {colors, layout} = handdrawnV1;

/** Wavy marker underline that draws itself in over `drawFrames`. */
export const WavyUnderline: React.FC<{
  width: number;
  color?: string;
  strokeWidth?: number;
  progress?: number;
}> = ({width, color = colors.accent, strokeWidth = layout.strokeWidth, progress}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = progress ?? spring({frame, fps, config: {damping: 200, stiffness: 90}});
  const amplitude = 4;
  const segments = Math.max(4, Math.round(width / 46));
  const points: string[] = [`M0,${amplitude + 2}`];
  for (let index = 1; index <= segments; index += 1) {
    const x = (width / segments) * index;
    const y = index % 2 === 0 ? amplitude + 2 : 2;
    points.push(`Q${x - width / segments / 2},${y === 2 ? amplitude * 2 + 4 : -2} ${x},${y}`);
  }
  const path = points.join(' ');
  return (
    <svg width={width} height={16} viewBox={`0 0 ${width} 16`} style={{display: 'block', overflow: 'visible'}}>
      <path
        d={path}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={interpolate(local, [0, 1], [1, 0])}
      />
    </svg>
  );
};

/** Loose hand-drawn circle used to emphasize a word or label. */
export const ScribbleCircle: React.FC<{
  size?: number;
  color?: string;
  strokeWidth?: number;
}> = ({size = 120, color = colors.accent, strokeWidth = layout.strokeWidth}) => (
  <svg width={size} height={size * 0.72} viewBox="0 0 100 72" style={{overflow: 'visible'}}>
    <path
      d="M50 6 C 76 4, 96 20, 94 37 C 92 58, 68 68, 46 66 C 24 64, 6 52, 7 34 C 8 16, 28 5, 52 7 C 70 9, 84 18, 88 30"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
    />
  </svg>
);

/** Small hand arrow, pointing right-down by default. */
export const HandArrow: React.FC<{color?: string; flip?: boolean; length?: number}> = ({
  color = colors.inkSoft,
  flip = false,
  length = 96,
}) => (
  <svg
    width={length}
    height={length * 0.4}
    viewBox="0 0 100 40"
    style={{transform: flip ? 'scaleX(-1)' : undefined, overflow: 'visible'}}
  >
    <path
      d="M4 20 C 30 14, 62 16, 88 24 M78 12 L 90 24 L 76 32"
      fill="none"
      stroke={color}
      strokeWidth={layout.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/** Tiny asterisk/star margin mark. */
export const StarDoodle: React.FC<{size?: number; color?: string}> = ({
  size = 28,
  color = colors.marker,
}) => (
  <svg width={size} height={size} viewBox="0 0 24 24">
    <path
      d="M12 2 L14 9 L21 9 L15.5 13.5 L17.5 21 L12 16.5 L6.5 21 L8.5 13.5 L3 9 L10 9 Z"
      fill="none"
      stroke={color}
      strokeWidth={2.2}
      strokeLinejoin="round"
    />
  </svg>
);

/** Open-book doodle; the neutral title-card decor for any reading lesson. */
export const BookDoodle: React.FC<{size?: number; color?: string}> = ({
  size = 220,
  color = colors.ink,
}) => (
  <svg width={size} height={size} viewBox="0 0 120 120" style={{overflow: 'visible'}}>
    <path
      d="M60 34 C 48 24, 28 22, 14 28 L14 88 C 28 82, 48 84, 60 94"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <path
      d="M60 34 C 72 24, 92 22, 106 28 L106 88 C 92 82, 72 84, 60 94"
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    <path d="M60 34 L60 94" stroke={color} strokeWidth={3} strokeLinecap="round" />
    <path d="M24 42 C 34 39, 44 40, 52 44 M24 56 C 34 53, 44 54, 52 58 M68 44 C 76 40, 86 39, 96 42 M68 58 C 76 54, 86 53, 96 56" stroke={color} strokeWidth={2} fill="none" strokeLinecap="round" opacity={0.6} />
  </svg>
);

/** Plate + cutlery doodle; lesson-opt-in title-card decor via introPanels.decorDoodle. */
export const PlateDoodle: React.FC<{size?: number; color?: string}> = ({
  size = 220,
  color = colors.ink,
}) => (
  <svg width={size} height={size} viewBox="0 0 120 120" style={{overflow: 'visible'}}>
    <circle cx="60" cy="62" r="34" fill="none" stroke={color} strokeWidth={3} />
    <circle cx="60" cy="62" r="24" fill="none" stroke={color} strokeWidth={2} opacity={0.55} />
    <path d="M14 34 C 16 48, 16 62, 14 78 M10 34 L18 34 M10 78 L18 78" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
    <path d="M106 34 C 104 44, 104 52, 106 60 M106 60 C 102 66, 102 74, 106 78" stroke={color} strokeWidth={3} fill="none" strokeLinecap="round" />
    <path d="M46 26 q6 -8 12 0 q6 -8 12 0" stroke={color} strokeWidth={2.4} fill="none" strokeLinecap="round" />
  </svg>
);

/** Check mark badge for the correct option. */
export const CheckBadge: React.FC<{size?: number}> = ({size = 44}) => (
  <svg width={size} height={size} viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="21" fill={colors.accent} opacity={0.14} />
    <circle cx="24" cy="24" r="21" fill="none" stroke={colors.accent} strokeWidth={3} />
    <path
      d="M14 25 L21 32 L34 17"
      fill="none"
      stroke={colors.accent}
      strokeWidth={4.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
