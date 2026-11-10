# Remotion renderer contract

The renderer is lesson-agnostic. It accepts one generated `remotion-props.json` file and must not import a task-specific `lesson.json` directly or hardcode visible lesson text.

## Props shape

```json
{
  "version": 1,
  "slug": "sample-reading",
  "title": "Sample Reading",
  "fps": 30,
  "width": 1920,
  "height": 1080,
  "durationInFrames": 3600,
  "visualProfile": {"id": "english-reading-handdrawn-v1"},
  "lesson": {},
  "timeline": {
    "segments": [
      {
        "id": "01",
        "kind": "reading-paragraph",
        "startFrame": 0,
        "endFrame": 1800,
        "durationFrames": 1800,
        "durationMs": 60000,
        "audioSrc": "audio/english-reading/sample-reading/01.wav",
        "cues": []
      }
    ]
  }
}
```

`startFrame` is inclusive and `endFrame` is exclusive. Cue `startFrame` values are segment-local. Segment ranges must be contiguous and their final `endFrame` must equal `durationInFrames`.

## Required renderer modules

Keep a shared implementation under `src/english-reading/`:

- `types.ts`: props, lesson, segment, and cue types;
- `EnglishReadingLesson.tsx`: composition-level sequencing and audio placement;
- `SegmentScene.tsx`: routes by segment kind;
- `scenes/`: title, sentence teaching, question, and evidence states;
- `visual-profiles/handdrawn-v1.ts`: palette, spacing, typography, and motion tokens.

Register one generic `EnglishReadingLesson` composition in `src/Root.tsx`. Pass task data with the Remotion CLI `--props` option instead of registering one composition per lesson.

## Sequencing invariants

- Use `Series` or explicit contiguous `Sequence` ranges; premount sequences by roughly one second.
- Render one audio element and one visual scene for each segment over the same local duration.
- Reference public audio with `staticFile(segment.audioSrc)`.
- Inside a segment, `useCurrentFrame()` is local. Compare it directly with the cue's local `startFrame`; do not add the global segment offset.
- Use `calculateMetadata` to return the props-derived duration, dimensions, FPS, and a collision-safe output name.
- Animate only from `useCurrentFrame()`, `interpolate()`, and `spring()`. Do not use CSS transitions or wall-clock timing.

## Scene state selection

Build a stable cue index by `id`, `kind`, and `refId`. At a given local frame, choose the latest cue at or before that frame. Bind sentences and exercises by their stable ids from `lesson.json`.

For exercises, preserve three observable states while honoring each `exerciseLessons[].presentationMode`:

1. `question`: exact stem and all printed source items in the approved layout, all neutral;
2. `answer` or `answer-reveal`: the same source items with only the correct selection, connection, order, or classification revealed and its explanation visible;
3. `evidence-dialog`: compact question/answer strip plus the complete source paragraph and exact evidence highlights.

Never derive the primary question mapping from blank-marker regexes.

Implement presentation modes as reusable, lesson-agnostic scene variants selected from props. For `left-right-connect`, use stable two-column item positions and data-driven SVG connections; do not hardcode lesson text or pair coordinates. An unknown approved mode must fail package or visual validation rather than silently falling back to an incorrect option-card layout.

### Optional closing state

`summary-card` is an optional end-of-lesson cue. When the narration includes a
closing recap segment, place one `summary-card` cue in a `reading-questions`
segment after the last `evidence-dialog` cue of the final exercise. Its
`refId` is `lesson` (it binds to the whole lesson, not one exercise), and its
scene renders a data-driven answer recap (one row per `exerciseLessons` entry)
plus generic thanks chrome. The renderer treats it as a distinct state: it
must never leak into the `question`/`answer`/`evidence` state machine, and
exercise cue pools must filter it out explicitly. Packages without a closing
recap simply omit the cue; the state is dormant, not required.

## Text and fonts

- Load all fonts before measurement or rendering. Prefer bundled local Chinese fonts and deterministic package-provided Latin fonts.
- Use a text-measurement utility or a deterministic fit algorithm for long stems, options, matching items, labels, translations, and evidence paragraphs.
- Set minimum readable font sizes. If content still does not fit, fail the visual gate and revise layout; do not shorten source text.
- Avoid clipping through hidden overflow unless the hidden region has been explicitly verified empty.

## Manifest mapping

Record renderer-native fields instead of editor ids:

```json
{
  "remotion": {
    "compositionId": "EnglishReadingLesson",
    "entryPoint": "src/index.ts",
    "props": "remotion-props.json",
    "rendererRevision": "git commit or working-tree marker",
    "resolution": {"width": 1920, "height": 1080, "fps": 30}
  }
}
```

For each segment, record its id, range, audio path, duration, and cue count. Keep `created`, `verified`, and `exported` independent.
