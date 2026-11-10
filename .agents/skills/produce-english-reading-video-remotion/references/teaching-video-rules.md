# Teaching and narration rules

## Sentence-by-sentence lesson

For every article sentence, use this spoken order:

1. Read the complete English sentence slowly and naturally.
2. Explain only grammar that is useful at junior-high level.
3. Explain fixed phrases and important new words in context.
4. Give a complete natural Chinese translation.

Do not turn every common word into vocabulary. Prefer sentence structure, tense, clause relationships, non-literal phrases, collocations, and words that block comprehension.

The visual must follow the same order. The main English sentence remains prominent. A yellow explanation area must contain the Chinese explanation or translation, not English labels alone.

## Inline cloze and fill-blank questions

When a blank belongs to the article sentence currently being explained:

1. Introduce the sentence and, at the question cue, show the complete stem plus every printed option.
2. Keep all options neutral until narration reaches the answer cue.
3. Highlight the correct option, then explain the grammar/vocabulary distinction and the main distractors.
4. At the evidence cue, show the complete article paragraph and highlight the exact sentence or phrase containing the blank.
5. Continue with the next article sentence. Do not postpone these questions to a final answer section or teach them twice unless the user asks for a recap.

The narration must read or clearly identify every option before the answer is revealed. Never reconstruct option text from handwritten marks or from a blank-number regex when exact source options are available.

## Exercise lesson

For each question:

1. Show the complete question and every source item in the confirmed presentation mode before revealing the answer or article evidence.
2. State the question type or solving theme when useful.
3. Reveal the correct selection, connection, order, or classification and explain the answer and main distractor trap.
4. When narration reaches the article evidence cue, animate in a dialog containing the complete source paragraph.
5. Keep a compact version of the question and correct answer visible above the dialog.
6. Highlight the exact supporting sentence or phrase inside the paragraph with a yellow background and contrasting outline.

For `left-right-connect`, keep the left and right columns visible in fixed positions, show no connection before the answer cue, and reveal the approved lines one at a time as they are explained. Avoid crossing lines when item order can be adjusted without changing source content. Do not convert a matching task into unrelated multiple-choice cards merely because the current renderer already supports them.

Never replace the evidence paragraph with only “原文第几句”. Sentence numbers may be mentioned in narration, but they are not the visual evidence.

## Evidence rules

- Copy the complete paragraph from `source.articleParagraphs` without rewriting it.
- `evidenceHighlights` must be exact source substrings.
- Highlight only the minimum span that proves the answer, except a main-idea question whose evidence is the whole conclusion paragraph.
- If evidence depends on two adjacent sentences, highlight both.
- Do not use a later consequence as the location where an earlier event occurred.

## Timing rules

- Article explanation default speed: `0.88`.
- Exercise explanation default speed: `0.84`.
- User choices override defaults.
- Generate TTS by lesson segment and use actual audio duration.
- Use ASR word timestamps for sentence changes, explanation panels, question starts, and evidence-dialog starts.
- Use separate ASR-derived cues for question/options, answer reveal, and evidence dialog. Preserve that order.
- A visual transition may begin on a short silence immediately before the spoken cue, but it must not settle before the meaning is introduced.
- Never distribute slide changes evenly across an audio duration.

## Accuracy rules

- Solve questions from the normalized source, not handwritten marks in the photograph.
- Verify every answer against article evidence or the exercise's language rule.
- Preserve uncertainty when OCR text is unresolved.
- Do not invent pronunciation, grammar labels, answer-key data, or paragraph text.
