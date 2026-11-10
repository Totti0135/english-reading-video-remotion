// Visual tokens for the hand-drawn classroom profile (english-reading-handdrawn-v1).
// Warm paper background, ink blue primary, brick red accent, marker yellow.

export const handdrawnV1 = {
  id: 'english-reading-handdrawn-v1',
  colors: {
    paper: '#F8F4EE',
    paperShade: '#F1EAE0',
    card: '#FFFDF8',
    ink: '#1B4A7A',
    inkSoft: '#3D6A96',
    accent: '#D44830',
    marker: '#F3C95B',
    markerSoft: 'rgba(243, 201, 91, 0.38)',
    chalk: '#6B7A8C',
    line: 'rgba(27, 74, 122, 0.22)',
  },
  fonts: {
    // Bundled faces first for cross-platform determinism; system stacks only
    // as fallbacks. ERNotoSansSC covers CJK glyphs in every stack.
    display: 'ERFredoka, ERNotoSansSC, "PingFang SC", sans-serif',
    text: 'ERMontserrat, ERNotoSansSC, "PingFang SC", sans-serif',
    chinese: 'ERNotoSansSC, "PingFang SC", "Hiragino Sans GB", "Heiti SC", sans-serif',
  },
  layout: {
    width: 1920,
    height: 1080,
    margin: 72,
    radius: 18,
    strokeWidth: 3,
  },
  motion: {
    // Frames for entrance/settle animations; tuned so a QC still taken
    // `settleFrames` after a cue shows the fully settled state.
    paperInFrames: 22,
    panelInFrames: 16,
    dialogInFrames: 24,
    underlineFrames: 18,
    premountFrames: 30,
  },
} as const;

export type HanddrawnProfile = typeof handdrawnV1;
