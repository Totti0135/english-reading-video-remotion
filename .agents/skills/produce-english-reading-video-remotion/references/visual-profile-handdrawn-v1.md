# English reading hand-drawn profile v1

This profile captures the accepted visual behavior of the first `Why I Don't Like Dogs` lesson. Reuse the system, not project-specific asset ids.

## Canvas and palette

- Landscape `1920×1080`, `30 FPS` by default.
- Warm paper background `#F8F4EE`.
- Ink blue primary `#1B4A7A`.
- Brick red accent `#D44830`.
- Marker yellow highlight `#F3C95B`.
- Load fonts deterministically before rendering. The established families are `Fredoka`, `Montserrat`, `Huxiaobo Nanshen Ti`, and `OPPO Sans`; bundle local font files when a family is not reliably available from a package.

## Visual language

- Hand-drawn classroom doodles, uneven outlines, underlines, arrows, and small paper marks.
- Strong hierarchy and generous margins; avoid dense dashboard cards.
- Full-frame teaching layouts are intentional because the viewer must read article text and questions.
- Entrance motion should feel like paper, marker, or dialog elements being placed by hand.
- Keep motion functional: reveal, underline, circle, highlight, or switch teaching focus.

## Sentence lesson layout

- Chapter and sentence id at the top.
- English source sentence as the largest reading object.
- Separate zones for grammar, fixed phrase/new word, and Chinese translation.
- The yellow explanation zone must include Chinese meaning.
- Use ASR cues to change focus; do not show all explanations at once when narration has not reached them.

## Question layout

Question phase:

- At the `question` cue, the complete question stem and all options become visible together.
- All options remain visually neutral until the `answer` or `answer-reveal` cue.
- At the answer cue, keep every option visible and make only the correct option visually distinct; show a concise correct-answer marker and Chinese explanation.
- Leave enough width and height for long option text; use natural wrapping.

Evidence phase:

- Keep a compact question/answer strip across the top.
- Animate a large dialog into the main reading area with opacity, upward motion, and gentle scale over roughly `0.6–0.9` seconds.
- Put the complete referenced paragraph in the dialog.
- Give each evidence highlight a marker-yellow background and a red outline.
- Long paragraphs must fit without clipping. Reduce type size or adjust line height before shortening source text.

For inline cloze lessons, these three states occur inside the relevant article segment: options, answer highlight, then evidence. They must not be postponed to a separate end-of-video exercise block.

## Batch consistency

Use the same palette, typography logic, stroke character, spacing system, and motion tone for all segments. Vary layout according to the teaching job: sentence reading, grammar focus, vocabulary, translation, fill-blank explanation, full question, or evidence dialog.
