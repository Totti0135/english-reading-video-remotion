#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const lessonPath = args.find((arg) => !arg.startsWith('--'));
const phaseIndex = args.indexOf('--phase');
const syncIndex = args.indexOf('--sync');
const phase = phaseIndex >= 0 ? args[phaseIndex + 1] : 'source';
const syncPath = syncIndex >= 0 ? args[syncIndex + 1] : null;

if (!lessonPath || !['source', 'draft', 'timed'].includes(phase)) {
  console.error('Usage: validate-lesson-spec.mjs <lesson.json> [--phase source|draft|timed] [--sync sync-map.json]');
  process.exit(2);
}

const lesson = JSON.parse(await fs.readFile(lessonPath, 'utf8'));
const errors = [];
const warnings = [];

const isString = (value) => typeof value === 'string' && value.trim().length > 0;
const requireString = (value, label) => {
  if (!isString(value)) errors.push(`${label} must be a non-empty string`);
};
const requireArray = (value, label) => {
  if (!Array.isArray(value)) errors.push(`${label} must be an array`);
};
const duplicateIds = (items) => {
  const seen = new Set();
  return items.map((item) => item?.id).filter((id) => id && (seen.has(id) || !seen.add(id)));
};

if (lesson.version !== 1) errors.push('version must be 1');
requireString(lesson.slug, 'slug');
if (isString(lesson.slug) && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(lesson.slug)) errors.push('slug must be lowercase hyphenated');
requireString(lesson.title, 'title');
requireString(lesson.grade, 'grade');
requireString(lesson.narrationLanguage, 'narrationLanguage');
if (!Number.isInteger(lesson.fps) || lesson.fps <= 0) errors.push('fps must be a positive integer');
requireString(lesson.visualProfile?.id, 'visualProfile.id');
requireString(lesson.voice?.provider, 'voice.provider');
requireString(lesson.voice?.voiceId, 'voice.voiceId');
if (lesson.deliveryMode !== undefined && !['inline-questions', 'questions-after-reading'].includes(lesson.deliveryMode)) {
  errors.push('deliveryMode must be inline-questions or questions-after-reading when present');
}

const paragraphs = lesson.source?.articleParagraphs;
const questions = lesson.source?.questions;
const sentenceLessons = lesson.sentenceLessons;
const exerciseLessons = lesson.exerciseLessons;
requireArray(paragraphs, 'source.articleParagraphs');
requireArray(questions, 'source.questions');
requireArray(sentenceLessons, 'sentenceLessons');
requireArray(exerciseLessons, 'exerciseLessons');

const paragraphMap = new Map();
for (const [index, paragraph] of (paragraphs || []).entries()) {
  requireString(paragraph?.id, `source.articleParagraphs[${index}].id`);
  requireString(paragraph?.text, `source.articleParagraphs[${index}].text`);
  if (paragraph?.id) paragraphMap.set(paragraph.id, paragraph.text);
}
if ((paragraphs || []).length === 0) errors.push('source.articleParagraphs must not be empty');
for (const id of duplicateIds(paragraphs || [])) errors.push(`duplicate paragraph id ${id}`);

const sentenceMap = new Map();
for (const [index, sentence] of (sentenceLessons || []).entries()) {
  requireString(sentence?.id, `sentenceLessons[${index}].id`);
  requireString(sentence?.paragraphId, `sentenceLessons[${index}].paragraphId`);
  requireString(sentence?.sourceText, `sentenceLessons[${index}].sourceText`);
  const paragraph = paragraphMap.get(sentence?.paragraphId);
  if (!paragraph) errors.push(`sentence ${sentence?.id || index} references missing paragraph ${sentence?.paragraphId}`);
  else if (isString(sentence?.sourceText) && !paragraph.includes(sentence.sourceText)) errors.push(`sentence ${sentence.id} sourceText is not an exact substring of ${sentence.paragraphId}`);
  if (sentence?.id) sentenceMap.set(sentence.id, sentence);
}
for (const id of duplicateIds(sentenceLessons || [])) errors.push(`duplicate sentence id ${id}`);

const questionMap = new Map();
for (const [index, question] of (questions || []).entries()) {
  requireString(question?.id, `source.questions[${index}].id`);
  requireString(question?.type, `source.questions[${index}].type`);
  requireString(question?.prompt, `source.questions[${index}].prompt`);
  if (!['fill-blank', 'multiple-choice'].includes(question?.type)) errors.push(`question ${question?.id || index} has unsupported type ${question?.type}`);
  if (!Array.isArray(question?.options)) errors.push(`question ${question?.id || index}.options must be an array`);
  for (const [optionIndex, option] of (question?.options || []).entries()) {
    requireString(option?.label, `question ${question?.id || index} option ${optionIndex} label`);
    requireString(option?.text, `question ${question?.id || index} option ${optionIndex} text`);
  }
  const labels = (question?.options || []).map((option) => option.label?.toUpperCase());
  if (labels.length > 0) {
    const expectedLabels = labels.map((_, optionIndex) => String.fromCharCode(65 + optionIndex));
    if (labels.join('') !== expectedLabels.join('')) errors.push(`question ${question.id} option labels must be consecutive from A`);
  }
  if (question?.type === 'multiple-choice') {
    if (!Array.isArray(question.options) || question.options.length !== 4) errors.push(`question ${question.id} must have exactly four options`);
  }
  if (question?.type === 'fill-blank' && (question?.options || []).length === 1) errors.push(`fill-blank question ${question.id} must not have only one option`);
  if (question?.id) questionMap.set(question.id, question);
}
for (const id of duplicateIds(questions || [])) errors.push(`duplicate question id ${id}`);

for (const [index, exercise] of (exerciseLessons || []).entries()) {
  requireString(exercise?.questionId, `exerciseLessons[${index}].questionId`);
  if (exercise?.questionId && !questionMap.has(exercise.questionId)) errors.push(`exercise references missing question ${exercise.questionId}`);
}
const exerciseQuestionIds = new Set((exerciseLessons || []).map((item) => item.questionId));
for (const question of questions || []) {
  if (!exerciseQuestionIds.has(question.id)) errors.push(`missing exerciseLessons entry for ${question.id}`);
}

if (phase === 'draft' || phase === 'timed') {
  for (const sentence of sentenceLessons || []) {
    requireString(sentence.translation, `${sentence.id}.translation`);
    requireArray(sentence.grammarPoints, `${sentence.id}.grammarPoints`);
    requireArray(sentence.fixedPhrases, `${sentence.id}.fixedPhrases`);
    requireArray(sentence.newWords, `${sentence.id}.newWords`);
    const teachingPoints = [...(sentence.grammarPoints || []), ...(sentence.fixedPhrases || []), ...(sentence.newWords || [])].filter(isString);
    if (teachingPoints.length === 0) warnings.push(`${sentence.id} has no grammar, phrase, or vocabulary teaching point`);
    requireString(sentence.narrationText, `${sentence.id}.narrationText`);
  }

  for (const exercise of exerciseLessons || []) {
    const question = questionMap.get(exercise.questionId);
    requireString(exercise.answer, `${exercise.questionId}.answer`);
    requireString(exercise.theme, `${exercise.questionId}.theme`);
    requireString(exercise.explanation, `${exercise.questionId}.explanation`);
    requireString(exercise.narrationText, `${exercise.questionId}.narrationText`);
    const labels = new Set((question?.options || []).map((option) => option.label?.toUpperCase()));
    if (labels.size > 0 && isString(exercise.answer) && !labels.has(exercise.answer.toUpperCase())) errors.push(`${exercise.questionId}.answer is not one of its option labels`);
    const hasEvidence = question?.type === 'multiple-choice'
      || isString(exercise.evidenceParagraphId)
      || (Array.isArray(exercise.evidenceHighlights) && exercise.evidenceHighlights.length > 0);
    if (hasEvidence) {
      requireString(exercise.evidenceParagraphId, `${exercise.questionId}.evidenceParagraphId`);
      const paragraph = paragraphMap.get(exercise.evidenceParagraphId);
      if (exercise.evidenceParagraphId && !paragraph) errors.push(`${exercise.questionId} references missing evidence paragraph ${exercise.evidenceParagraphId}`);
      if (!Array.isArray(exercise.evidenceHighlights) || exercise.evidenceHighlights.length === 0) errors.push(`${exercise.questionId}.evidenceHighlights must contain at least one exact source span`);
      for (const highlight of exercise.evidenceHighlights || []) {
        if (!isString(highlight)) errors.push(`${exercise.questionId} has an empty evidence highlight`);
        else if (paragraph && !paragraph.includes(highlight)) errors.push(`${exercise.questionId} highlight is not an exact substring of ${exercise.evidenceParagraphId}: ${highlight}`);
      }
    }
  }

  if (!Array.isArray(lesson.narrationSegments) || lesson.narrationSegments.length === 0) {
    errors.push('narrationSegments must not be empty in draft/timed phase');
  }
  const cueEntriesByQuestion = new Map();
  let cueOrder = 0;
  for (const [index, segment] of (lesson.narrationSegments || []).entries()) {
    requireString(segment?.id, `narrationSegments[${index}].id`);
    requireString(segment?.kind, `narrationSegments[${index}].kind`);
    requireString(segment?.text, `narrationSegments[${index}].text`);
    if (!Array.isArray(segment?.visualCues) || segment.visualCues.length === 0) errors.push(`narration segment ${segment?.id || index} must have visualCues`);
    let narrationCursor = 0;
    for (const cue of segment?.visualCues || []) {
      requireString(cue?.id, `segment ${segment.id} cue id`);
      requireString(cue?.kind, `segment ${segment.id} cue ${cue?.id} kind`);
      requireString(cue?.spokenCue, `segment ${segment.id} cue ${cue?.id} spokenCue`);
      const matchText = cue?.asrMatchText || cue?.spokenCue;
      if (isString(segment.text) && isString(matchText)) {
        const textIndex = segment.text.toLocaleLowerCase().indexOf(matchText.toLocaleLowerCase(), narrationCursor);
        if (textIndex < 0) warnings.push(`segment ${segment.id} cue ${cue.id} text is not literally present in narration; ASR matching may still work`);
        else narrationCursor = textIndex + matchText.length;
      }
      if (isString(cue?.refId) && questionMap.has(cue.refId)) {
        const entries = cueEntriesByQuestion.get(cue.refId) || [];
        entries.push({kind: cue.kind, order: cueOrder});
        cueEntriesByQuestion.set(cue.refId, entries);
      } else if (isString(cue?.refId) && /^Q\d+$/i.test(cue.refId)) {
        errors.push(`segment ${segment.id} cue ${cue.id} references missing question ${cue.refId}`);
      }
      cueOrder += 1;
    }
    for (const id of duplicateIds(segment?.visualCues || [])) errors.push(`segment ${segment.id} has duplicate cue id ${id}`);
  }
  for (const id of duplicateIds(lesson.narrationSegments || [])) errors.push(`duplicate narration segment id ${id}`);
  for (const exercise of exerciseLessons || []) {
    const entries = cueEntriesByQuestion.get(exercise.questionId) || [];
    const questionCue = entries.find((entry) => entry.kind === 'question');
    const answerCue = entries.find((entry) => ['answer', 'answer-reveal'].includes(entry.kind));
    const evidenceCue = entries.find((entry) => entry.kind === 'evidence-dialog');
    if (!questionCue) errors.push(`${exercise.questionId} must have a question visual cue`);
    if (!answerCue) errors.push(`${exercise.questionId} must have an answer or answer-reveal visual cue`);
    if (isString(exercise.evidenceParagraphId) && !evidenceCue) errors.push(`${exercise.questionId} must have an evidence-dialog visual cue`);
    if (questionCue && answerCue && questionCue.order >= answerCue.order) errors.push(`${exercise.questionId} answer cue must follow its question cue`);
    if (answerCue && evidenceCue && answerCue.order >= evidenceCue.order) errors.push(`${exercise.questionId} evidence cue must follow its answer cue`);
  }
}

if (phase === 'timed') {
  if (!syncPath) errors.push('--sync is required for timed validation');
  else {
    const sync = JSON.parse(await fs.readFile(syncPath, 'utf8'));
    if (sync.version !== 1) errors.push('sync map version must be 1');
    if (sync.fps !== lesson.fps) errors.push(`sync map fps ${sync.fps} does not match lesson fps ${lesson.fps}`);
    const syncSegments = new Map((sync.segments || []).map((segment) => [segment.id, segment]));
    for (const segment of lesson.narrationSegments || []) {
      const timed = syncSegments.get(segment.id);
      if (!timed) {
        errors.push(`sync map missing segment ${segment.id}`);
        continue;
      }
      if (!Number.isInteger(timed.durationFrames) || timed.durationFrames <= 0) errors.push(`sync segment ${segment.id} has invalid durationFrames`);
      const cueMap = new Map((timed.cues || []).map((cue) => [cue.id, cue]));
      let priorFrame = -1;
      for (const cue of segment.visualCues || []) {
        const timedCue = cueMap.get(cue.id);
        if (!timedCue) {
          errors.push(`sync segment ${segment.id} missing cue ${cue.id}`);
          continue;
        }
        if (!Number.isInteger(timedCue.startFrame) || timedCue.startFrame < 0 || timedCue.startFrame >= timed.durationFrames) errors.push(`sync cue ${segment.id}/${cue.id} is outside its segment`);
        if (timedCue.startFrame < priorFrame) errors.push(`sync cues in segment ${segment.id} are not monotonic`);
        priorFrame = timedCue.startFrame;
      }
    }
  }
}

const result = {
  ok: errors.length === 0,
  phase,
  lesson: path.resolve(lessonPath),
  counts: {
    paragraphs: paragraphs?.length || 0,
    sentences: sentenceLessons?.length || 0,
    questions: questions?.length || 0,
    narrationSegments: lesson.narrationSegments?.length || 0,
  },
  warnings,
  errors,
};
console.log(JSON.stringify(result, null, 2));
process.exit(errors.length === 0 ? 0 : 1);
