# Teaching-plan and narration review gates

The two review gates make creative and pedagogical decisions visible before expensive audio and renderer work begins. They apply to native Markdown input and to image input after it has been normalized to `source.md`.

Use text as the decision record and add a self-contained local HTML preview when it materially improves review. The HTML is a disposable review aid, not the canonical lesson contract and not a substitute for the later Remotion implementation.

## Gate 1: teaching plan

Create `teaching-plan.md` from `assets/teaching-plan.template.md`. It is a concise decision record, not a narration draft. It must cover:

- the learner level, lesson goal, estimated depth, and overall teaching sequence;
- which sentences need grammar, phrases, vocabulary, or translation emphasis;
- where exercises appear relative to article teaching;
- every question's solving idea, presentation mode, answer-reveal behavior, and evidence behavior;
- any uncertain source text, answer, evidence, or visual choice that needs a user decision.

Choose presentation mode from what the learner must do:

| Exercise behavior | Recommended presentation | Reveal behavior |
|---|---|---|
| Match two sets | `left-right-connect` | Show two neutral columns, then draw or highlight one connection at a time |
| Fill a blank in the article | `inline-cloze` | Keep the full sentence visible, preserve the blank, then fill or highlight it |
| Choose one answer | `option-cards` | Show every option neutrally, then highlight only the correct one |
| Put items in order | `sequence-sort` | Show movable-looking items, then animate into the correct order |
| Classify items | `category-board` | Show target groups and move or connect each item to its group |
| Locate proof in the article | `evidence-dialog` | Keep a compact question visible and highlight the exact span in the complete paragraph |

These are defaults, not a closed list. A worksheet can combine modes, such as an option-card question followed by an evidence dialog. Explain a different choice when it better matches the source.

Show the user a compact plan summary and the per-question choices. Ask only about decisions that affect pedagogy, ordering, or visual behavior. Set the plan status to `approved` only after an explicit confirmation. If the user supplied a complete plan and explicitly asked to proceed, verify it covers the required decisions and record that approval instead of asking the same questions again.

### Optional HTML presentation preview

Create `tmp/english-reading/<slug>/teaching-plan-preview.html` when layout is part of the decision. Prefer it for matching, sorting, classification, multi-column, or otherwise nonstandard exercises. The preview should:

- be a single self-contained HTML file with inline CSS and JavaScript and no CDN or network dependency;
- show representative neutral-question, answer-reveal, and evidence states using the exact worksheet text;
- provide simple controls or tabs when the user needs to compare states or alternative layouts;
- label alternatives clearly if a choice is still open;
- remain a lightweight prototype rather than duplicating production Remotion code.

Summarize the recommendation in chat and provide the HTML preview for visual inspection. Approval applies to the plan recorded in `teaching-plan.md`; keep the Markdown and HTML consistent.

Stop after presenting the plan. Before Gate 1 approval, do not:

- write the full narration;
- generate TTS or ASR;
- change lesson-specific or generic renderer behavior;
- build Remotion props, render, or export.

## Gate 2: narration script

After Gate 1 approval, create `narration-script.md` from `assets/narration-script.template.md` and populate the working `lesson.json`. The review file must let the user judge the actual lesson without reading JSON.

For every segment include:

- stable segment id and purpose;
- exact spoken text in its final spoken order;
- on-screen source text or state changes;
- stable cue ids placed at the phrases that will later be matched by ASR;
- question, answer, and evidence transitions where applicable.

The script must include all spoken English, Chinese teaching, translations, question explanations, answer reasoning, distractor analysis, source evidence, transitions, and closing lines. Its spoken text must exactly match the intended TTS input. Keep implementation notes outside the spoken-text block.

Run draft validation before presenting the script so missing evidence and cue-order problems are fixed first. Give the user the complete script, not a summary, and stop for explicit approval. If it is too long for a useful chat message, provide the task-package file plus a concise section index, but do not omit any section from the file.

### Optional HTML script preview

Create `tmp/english-reading/<slug>/narration-script-preview.html` when the script is long or when cue and reveal order need visual review. It should:

- be self-contained and work locally without network access;
- offer segment navigation and clearly separate spoken text from non-spoken screen notes;
- show cue ids in order beside the exact spoken phrases they will match;
- let the user inspect question, answer, and evidence stages without implying that timing or production visuals are final;
- reproduce the complete script rather than a shortened demo.

`narration-script.md` remains canonical. Update the HTML whenever approved wording, cue order, or presentation notes change.

Before Gate 2 approval, do not generate TTS or ASR, implement or modify Remotion scenes, build props, render, or export.

## Approval and invalidation

Record each approved artifact's status and approval date in its file.

- A source-text, answer, or evidence change invalidates both gates.
- A teaching-order or presentation-mode change invalidates Gate 1 and Gate 2.
- Any change to spoken narration after Gate 2 approval invalidates Gate 2, because the reviewed text must remain identical to TTS input.
- A cosmetic-only HTML preview change does not invalidate approval when the canonical Markdown and approved behavior are unchanged.
- Timing-only corrections that do not change spoken text do not invalidate either gate.
- Pure renderer bug fixes that preserve the approved visual behavior and script do not invalidate either gate.

When a gate is invalidated, update its status to `proposed`, revise the affected artifacts, and stop again at the earliest invalidated gate. Do not treat silence or approval of a different artifact as approval.
