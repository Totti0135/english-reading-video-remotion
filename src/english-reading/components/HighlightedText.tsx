// Renders a paragraph with exact-substring evidence highlights:
// marker-yellow background plus a contrasting outline on each span.

import React from 'react';
import {handdrawnV1} from '../visual-profiles/handdrawn-v1';
import {fitFontSize} from '../textFit';

const {colors, fonts} = handdrawnV1;

interface HighlightedTextProps {
  text: string;
  highlights: string[];
  maxWidth: number;
  maxHeight: number;
  minSize?: number;
  maxSize?: number;
  color?: string;
}

interface Part {
  text: string;
  highlighted: boolean;
}

const buildParts = (text: string, highlights: string[]): Part[] => {
  const ranges: {start: number; end: number}[] = [];
  for (const highlight of highlights) {
    const index = text.indexOf(highlight);
    if (index >= 0) {
      ranges.push({start: index, end: index + highlight.length});
    }
  }
  if (ranges.length === 0) {
    return [{text, highlighted: false}];
  }
  ranges.sort((a, b) => a.start - b.start);
  const parts: Part[] = [];
  let cursor = 0;
  for (const range of ranges) {
    // Overlapping/nested/duplicate highlights: the range that starts first
    // wins; anything starting inside already-emitted text is skipped so no
    // characters are duplicated on screen.
    if (range.start < cursor) {
      continue;
    }
    if (range.start > cursor) {
      parts.push({text: text.slice(cursor, range.start), highlighted: false});
    }
    parts.push({text: text.slice(range.start, range.end), highlighted: true});
    cursor = range.end;
  }
  if (cursor < text.length) {
    parts.push({text: text.slice(cursor), highlighted: false});
  }
  return parts;
};

export const HighlightedText: React.FC<HighlightedTextProps> = ({
  text,
  highlights,
  maxWidth,
  maxHeight,
  minSize = 24,
  maxSize = 40,
  color = colors.ink,
}) => {
  const fontSize = fitFontSize({
    text,
    fontFamily: fonts.text,
    fontWeight: 500,
    maxWidth,
    maxHeight,
    minSize,
    maxSize,
    // Highlight spans carry padding+margin+border (~30px each) that plain
    // text measurement does not see; reserve width so lines never overflow.
    extraWidth: Math.min(90, 30 * highlights.filter((h) => text.includes(h)).length),
  });
  return (
    <div
      style={{
        fontFamily: fonts.text,
        fontSize,
        fontWeight: 500,
        lineHeight: 1.6,
        color,
      }}
    >
      {buildParts(text, highlights).map((part, index) =>
        part.highlighted ? (
          <span
            key={index}
            style={{
              background: colors.markerSoft,
              border: `2.5px solid ${colors.accent}`,
              borderRadius: 8,
              padding: '2px 8px',
              margin: '0 2px',
              boxShadow: `0 0 0 4px ${colors.markerSoft}`,
              fontWeight: 700,
            }}
          >
            {part.text}
          </span>
        ) : (
          <span key={index}>{part.text}</span>
        ),
      )}
    </div>
  );
};
