// Cue-driven scene state selection. Cues arrive sorted by startFrame
// (enforced by validate-remotion-package.mjs).

import type {CueKind, TimedCue} from './types';

const cuesOfKinds = (cues: TimedCue[], kinds: readonly CueKind[]): TimedCue[] =>
  cues.filter((cue) => kinds.includes(cue.kind));

/** Latest cue at or before `frame`, restricted to `kinds`; null before the first. */
export const activeCueAt = (
  cues: TimedCue[],
  frame: number,
  kinds?: readonly CueKind[],
): TimedCue | null => {
  const pool = kinds ? cuesOfKinds(cues, kinds) : cues;
  let active: TimedCue | null = null;
  for (const cue of pool) {
    if (cue.startFrame <= frame) {
      active = cue;
    } else {
      break;
    }
  }
  return active;
};
