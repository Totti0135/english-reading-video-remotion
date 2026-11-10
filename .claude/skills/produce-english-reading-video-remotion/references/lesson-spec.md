# Lesson specification contract

`lesson.json` is the machine-readable source shared by teaching analysis, narration, ASR synchronization, Remotion rendering, and QC. Do not bury durable timing or evidence decisions only in tool calls.

## Core source objects

- `source.articleParagraphs[]`: `{id, text}` with complete source paragraphs.
- `source.wordPower[]`: `{term, partOfSpeech, meaning}`.
- `source.languageTips[]`: `{id, pattern, meaning, example}`.
- `source.questions[]`: exact prompt, type, options, and any supplied answer/evidence fields.

## Delivery mode

Set `deliveryMode` when exercise placement affects narration and visuals:

- `inline-questions`: use for cloze/fill-blank questions embedded in article sentences. Teach each question immediately when that sentence is reached.
- `questions-after-reading`: use for a separate reading-comprehension section after the article explanation.

Do not silently change modes during production. In inline mode, an exercise is not repeated at the end unless the user requests a recap.

## Sentence lessons

Create one entry for every parsed article sentence:

```json
{
  "id": "P01-S01",
  "paragraphId": "P01",
  "sourceText": "A complete source sentence.",
  "translation": "自然、准确的中文翻译。",
  "grammarPoints": ["初中阶段真正需要讲解的语法点"],
  "fixedPhrases": ["fixed phrase = 中文释义"],
  "newWords": ["word /phonetic/ pos. 中文释义"],
  "narrationText": "先慢速朗读英文，再讲语法、搭配、生词并翻译。"
}
```

`sourceText` must remain an exact substring of its paragraph. Preserve sentence ids after narration generation so later corrections do not invalidate cue references.

## Exercise lessons

Create one entry per source question:

```json
{
  "questionId": "Q01",
  "answer": "D",
  "theme": "细节理解题",
  "presentationMode": "option-cards",
  "presentationNotes": "题目阶段四个选项保持中性，答案阶段只高亮 D。",
  "explanation": "先说明定位词，再解释为什么答案成立以及干扰项为什么不成立。",
  "evidenceParagraphId": "P01",
  "evidenceHighlights": ["Exact supporting sentence copied from P01."],
  "narrationText": "完整题目讲解文案。"
}
```

`presentationMode` records the mode approved in `teaching-plan.md`, such as `option-cards`, `inline-cloze`, `left-right-connect`, `sequence-sort`, or `category-board`. Use `presentationNotes` for source-specific behavior that the generic mode needs, such as the two matching columns or reveal order. Preserve these decisions in the portable contract instead of leaving them only in chat or an HTML preview. Legacy packages without these fields may use the renderer's existing default, but new packages following the review-gate workflow must populate them.

For article-based multiple-choice questions, `evidenceParagraphId` is required and every `evidenceHighlights` value must be an exact substring of that complete paragraph. Fill-blank vocabulary exercises may omit article evidence.

## Narration segments and visual cues

Split narration into coherent assets so timing can be corrected locally:

```json
{
  "id": "06",
  "kind": "reading-questions",
  "text": "这一段实际提交给 TTS 的完整文本。",
  "speedRatio": 0.84,
  "actualDurationMs": 75768,
  "visualCues": [
    {
      "id": "Q01-question",
      "kind": "question",
      "refId": "Q01",
      "spokenCue": "第一题"
    },
    {
      "id": "Q01-answer",
      "kind": "answer",
      "refId": "Q01",
      "spokenCue": "正确答案是"
    },
    {
      "id": "Q01-evidence",
      "kind": "evidence-dialog",
      "refId": "Q01",
      "spokenCue": "原文位置",
      "asrMatchText": "原文位置"
    }
  ]
}
```

- `text` must exactly equal the submitted TTS text.
- `spokenCue` is human-readable; `asrMatchText` may override it when ASR spelling differs.
- Cue text should be distinctive inside its segment and appear in spoken order.
- Each exercise needs a `question` cue followed by `answer` or `answer-reveal`. When `evidenceParagraphId` is present, add a later `evidence-dialog` cue.
- The question state contains the exact prompt and all source items from `source.questions`; the answer state reveals the approved selection, mapping, order, or classification without replacing or rewriting the source items.
- `actualDurationMs` comes from the completed TTS asset, not an estimate.
- Do not write cue frames into `lesson.json`; `build-sync-map.mjs` derives them from normalized ASR rows.

## Validation phases

- `source`: structure, ids, paragraph/sentence containment, question option shape.
- `draft`: translations, analysis, exercise answers/evidence, narration text, and ASR-matchable cues.
- `timed`: all draft checks plus a complete monotonic sync map whose durations and cue frames fit each segment.
