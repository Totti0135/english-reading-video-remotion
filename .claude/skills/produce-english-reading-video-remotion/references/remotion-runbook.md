# Remotion production runbook

Read this reference when assembling, checking, or rendering the video. Follow the repository's current Remotion conventions and load the available Remotion best-practices skill before editing renderer code.

## One-time renderer setup

1. Inspect `package.json`, `src/index.ts`, and `src/Root.tsx` before changing code.
2. Reuse compatible installed Remotion packages. Add missing packages with `npx remotion add` so their versions match the repository's Remotion version.
3. Create the generic modules defined in [remotion-renderer-contract.md](remotion-renderer-contract.md).
4. Register one `EnglishReadingLesson` composition at the default `1920×1080`, `30 FPS`; let `calculateMetadata` override duration and other props.
5. Keep content data outside the renderer and pass `remotion-props.json` with `--props`.

Do not create a new React component or composition id for every worksheet.

## Per-lesson sequence

1. Complete the source, draft, and timed gates.
2. Ensure one finished local audio file exists for every narration segment.
3. Build and validate `remotion-props.json`.
4. Open the generic composition in Remotion Studio with the intended props when interactive inspection is useful.
5. Render representative stills into `tmp/english-reading/<slug>/qc/`.
6. Inspect every exercise's question, answer, and evidence states, plus representative sentence, translation, long-text, and transition frames.
7. Update `generation-manifest.json`; do not mark the lesson exported unless a requested final render passes media verification.

## Suggested preview and QC commands

Use the current CLI syntax reported by the installed Remotion version. Typical commands are:

```bash
npx remotion studio src/index.ts --props=tmp/english-reading/<slug>/remotion-props.json

npx remotion still src/index.ts EnglishReadingLesson \
  tmp/english-reading/<slug>/qc/<label>.png \
  --frame=<frame> \
  --props=tmp/english-reading/<slug>/remotion-props.json
```

Compute a global QC frame as `segment.startFrame + cue.startFrame + settleFrames`. Choose `settleFrames` according to the actual transition duration and keep it inside the segment.

## Visual gate

For every exercise, inspect:

- a settled question frame with every source item neutral and no answer, mapping, order, or classification revealed;
- a settled answer frame with exactly the approved selection, connection, order, or classification revealed;
- a settled evidence frame with the complete paragraph and exact source highlight;
- an entrance frame when the presentation or dialog animation changed.

For matching layouts, verify both columns, every label, each connection endpoint, line readability, and the absence of unintended crossing or early lines. Also inspect the longest English stem, option or matching item, Chinese translation, and evidence paragraph. When the package contains a `summary-card` cue, also inspect one settled summary frame (all recap rows plus the closing line visible). A render command succeeding does not prove that text is visible or unclipped.

### Tiered inspection and montages

Vision-model inspection is the slowest QC step; tier it instead of sending every frame solo. Coverage does not shrink — every required frame is still inspected exactly once — but only high-risk frames get a solo full-resolution call. A typical lesson needs roughly 8–12 vision calls instead of one per frame.

Tier A (solo, one call per frame):

- all three states of the first exercise of each presentation mode;
- the longest-text instance of each state family: longest stem, option or matching item, model answer, evidence paragraph, and translation;
- the settled summary frame and any entrance frame of a new or changed animation;
- any frame whose layout the renderer edits for this lesson touched.

Tier B (montage, 2–3 frames per call): every remaining required frame — later exercises sharing an already-inspected mode, later sentence reading/teaching/translation states, intro frames beyond the first.

Stack frames vertically so each panel keeps native resolution, and state the panel order in the prompt (top to bottom). Do not label panels with `drawtext`; many ffmpeg builds ship without it and label text is redundant when the prompt names the order:

```bash
ffmpeg -y -v error -i qc/<a>.png -i qc/<b>.png -i qc/<c>.png \
  -filter_complex vstack qc/montage-<n>.png
```

For a montage, require per-panel verdicts in top-to-bottom order with the same checks as a solo call. A defect reported on a montage is provisional: re-inspect that frame solo at full resolution and cross-check the same component in another frame before treating the defect as real — montage readings of fine text are less reliable than solo ones. Conversely, when two readings of the same component disagree, believe the frames that agree and re-shoot before "fixing" anything.

Record each frame's tier in `generation-manifest.json` (`qc.frames[].tier`: `solo` or `montage-N`).

## Final render

Only render a standalone file when the user asks:

```bash
npx remotion render src/index.ts EnglishReadingLesson \
  out/english-reading/<slug>.mp4 \
  --props=tmp/english-reading/<slug>/remotion-props.json
```

Wait for a successful terminal exit. Then verify:

```bash
ffprobe -v error -show_format -show_streams \
  out/english-reading/<slug>.mp4

ffmpeg -v error -i out/english-reading/<slug>.mp4 \
  -map 0:v:0 -map 0:a:0 -f null -
```

Confirm duration against `remotion-props.json` within one frame, expected resolution/FPS, a supported video codec, and an audible audio stream. Record the exact local path and verification results in the manifest.

## Revision behavior

- A text-only correction normally rebuilds props and rerenders affected QC frames.
- A narration change invalidates that segment's audio duration, ASR rows, sync map, props, QC, and final render.
- A cue change invalidates the sync map, props, affected QC frames, and final render, but not the audio when narration text is unchanged.
- A renderer or font change invalidates visual QC for every affected lesson.
