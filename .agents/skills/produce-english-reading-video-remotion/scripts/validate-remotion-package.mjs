#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';
import {validateRenderContract} from '../src/english-reading/runtime/exercise-timeline.mjs';

const args = process.argv.slice(2);
const propsPath = args.find((arg) => !arg.startsWith('--'));
const publicIndex = args.indexOf('--public-dir');
const publicDirectory = path.resolve(process.cwd(), publicIndex >= 0 ? args[publicIndex + 1] : 'public');

if (!propsPath) {
  console.error('Usage: validate-remotion-package.mjs <remotion-props.json> [--public-dir public]');
  process.exit(2);
}

let props;
try {
  props = JSON.parse(await fs.readFile(propsPath, 'utf8'));
} catch (error) {
  console.log(JSON.stringify({
    ok: false,
    props: path.resolve(propsPath),
    segments: 0,
    cues: 0,
    durationInFrames: null,
    warnings: [],
    errors: [`input: ${error.message}`],
  }, null, 2));
  process.exit(1);
}
if (!props || typeof props !== 'object' || Array.isArray(props)) {
  console.log(JSON.stringify({
    ok: false,
    props: path.resolve(propsPath),
    segments: 0,
    cues: 0,
    durationInFrames: null,
    warnings: [],
    errors: ['input: props must be a JSON object'],
  }, null, 2));
  process.exit(1);
}
const errors = [];
const warnings = [];
const assert = (condition, message) => {
  if (!condition) errors.push(message);
};

// Keep the package gate aligned with the shared exercise and timeline
// contract. The checks below still verify the renderer-specific audio files.
const contract = validateRenderContract(props);
for (const issue of contract.errors) errors.push(`${issue.path}: ${issue.message}`);
for (const issue of contract.warnings) warnings.push(`${issue.path}: ${issue.message}`);

assert(props.version === 1, 'version must be 1');
assert(typeof props.slug === 'string' && props.slug.length > 0, 'slug is required');
assert(Number.isInteger(props.fps) && props.fps > 0, 'fps must be a positive integer');
assert(Number.isInteger(props.width) && props.width > 0, 'width must be a positive integer');
assert(Number.isInteger(props.height) && props.height > 0, 'height must be a positive integer');
assert(Number.isInteger(props.durationInFrames) && props.durationInFrames > 0, 'durationInFrames must be positive');
assert(props.lesson?.slug === props.slug, 'embedded lesson slug must match props slug');

const segments = props.timeline?.segments || [];
assert(Array.isArray(segments) && segments.length > 0, 'timeline.segments must be non-empty');

let cursor = 0;
const allCueIds = new Set();
const questions = new Map((props.lesson?.source?.questions || []).map((question) => [question.id, question]));
const exerciseLessons = new Map((props.lesson?.exerciseLessons || []).map((exercise) => [exercise.questionId, exercise]));
const sentenceLessons = new Map((props.lesson?.sentenceLessons || []).map((sentence) => [sentence.id, sentence]));
const knownKinds = new Set([
  'title-card', 'task-overview', 'structure-overview',
  'person-card', 'people-complete', 'poster-board', 'question-neutral',
  'sentence', 'teaching-panel', 'translation',
  'question', 'answer', 'answer-reveal', 'evidence-dialog',
  'summary-card',
]);

for (const segment of segments) {
  const label = `segment ${segment.id || '(missing)'}`;
  assert(typeof segment.id === 'string' && segment.id.length > 0, `${label}: id is required`);
  assert(segment.startFrame === cursor, `${label}: expected startFrame ${cursor}, got ${segment.startFrame}`);
  assert(Number.isInteger(segment.durationFrames) && segment.durationFrames > 0, `${label}: durationFrames must be positive`);
  assert(segment.endFrame === segment.startFrame + segment.durationFrames, `${label}: endFrame mismatch`);
  assert(typeof segment.audioSrc === 'string' && segment.audioSrc.length > 0, `${label}: audioSrc is required`);

  if (typeof segment.audioSrc === 'string') {
    assert(!path.isAbsolute(segment.audioSrc), `${label}: audioSrc must be public-relative`);
    const audioPath = path.resolve(publicDirectory, segment.audioSrc);
    const relative = path.relative(publicDirectory, audioPath);
    assert(relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative), `${label}: audioSrc escapes public directory`);
    try {
      const stat = await fs.stat(audioPath);
      assert(stat.isFile() && stat.size > 0, `${label}: audio file is empty`);
    } catch {
      errors.push(`${label}: missing audio file ${audioPath}`);
    }
  }

  const exerciseCues = new Map();
  let lastEvidenceFrame = -1;
  let summarySeen = false;
  let previousCueFrame = -1;
  for (const cue of segment.cues || []) {
    const cueLabel = `${label} cue ${cue.id || '(missing)'}`;
    assert(typeof cue.id === 'string' && cue.id.length > 0, `${cueLabel}: id is required`);
    assert(!allCueIds.has(cue.id), `${cueLabel}: duplicate cue id`);
    allCueIds.add(cue.id);
    assert(knownKinds.has(cue.kind), `${cueLabel}: unknown cue kind ${cue.kind}`);
    assert(Number.isInteger(cue.startFrame) && cue.startFrame >= 0 && cue.startFrame < segment.durationFrames, `${cueLabel}: cue frame is outside segment`);
    assert(cue.startFrame >= previousCueFrame, `${cueLabel}: cues must be monotonic`);
    previousCueFrame = cue.startFrame;

    // Once a summary-card fires, the summary scene owns the rest of the
    // segment — any later cue would be silently swallowed by the renderer.
    assert(!summarySeen, `${cueLabel}: cue follows summary-card; summary-card must be the final cue of its segment`);

    if (cue.kind === 'evidence-dialog') {
      lastEvidenceFrame = cue.startFrame;
    }

    if (cue.kind === 'summary-card') {
      assert(cue.refId === 'lesson', `${cueLabel}: summary-card refId must be 'lesson'`);
      if (exerciseCues.size > 0) {
        assert(lastEvidenceFrame >= 0, `${cueLabel}: summary-card must follow the last evidence-dialog of its segment`);
      }
      summarySeen = true;
    }

    if (['question', 'answer', 'answer-reveal', 'evidence-dialog'].includes(cue.kind)) {
      assert(typeof cue.refId === 'string' && cue.refId.length > 0, `${cueLabel}: exercise cue needs refId`);
      const list = exerciseCues.get(cue.refId) || [];
      list.push(cue);
      exerciseCues.set(cue.refId, list);
    }

    if (['sentence', 'teaching-panel', 'translation'].includes(cue.kind)) {
      assert(typeof cue.refId === 'string' && cue.refId.length > 0, `${cueLabel}: sentence cue needs refId`);
      assert(sentenceLessons.has(cue.refId), `${cueLabel}: cue refers to missing sentence lesson ${cue.refId}`);
    }
  }

  for (const [questionId, cues] of exerciseCues) {
    const question = questions.get(questionId);
    const exercise = exerciseLessons.get(questionId);
    assert(Boolean(question), `${label}: cue refers to missing source question ${questionId}`);
    assert(Boolean(exercise), `${label}: cue refers to missing exercise lesson ${questionId}`);
    assert(Array.isArray(question?.options), `${label}: question ${questionId} options must be an array`);
    const kinds = cues.map((cue) => cue.kind);
    const questionIndex = kinds.indexOf('question');
    const answerIndex = kinds.findIndex((kind) => kind === 'answer' || kind === 'answer-reveal');
    const evidenceIndex = kinds.indexOf('evidence-dialog');
    assert(questionIndex >= 0, `${label}: question ${questionId} is missing question cue`);
    assert(answerIndex > questionIndex, `${label}: question ${questionId} answer cue must follow question cue`);
    if (exercise?.evidenceParagraphId) {
      assert(evidenceIndex > answerIndex, `${label}: question ${questionId} evidence cue must follow answer cue`);
    }
  }

  cursor = segment.endFrame;
}

assert(cursor === props.durationInFrames, `timeline ends at ${cursor}, expected ${props.durationInFrames}`);

console.log(JSON.stringify({
  ok: errors.length === 0,
  props: path.resolve(propsPath),
  segments: segments.length,
  cues: allCueIds.size,
  durationInFrames: props.durationInFrames,
  warnings,
  errors,
}, null, 2));
process.exit(errors.length === 0 ? 0 : 1);
