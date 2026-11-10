// Frame-addressable exercise state. Audio segments and teaching steps are independent.
// These opt-in helpers do not change the existing Remotion scene router.
import {validateExerciseContract, ExerciseContractError} from '../model/exercise-contract.mjs';

export const KNOWN_CUE_KINDS = Object.freeze([
  'title-card', 'task-overview', 'structure-overview', 'person-card', 'people-complete',
  'poster-board', 'question-neutral', 'sentence', 'teaching-panel', 'translation',
  'question', 'answer', 'answer-reveal', 'evidence-dialog', 'summary-card',
]);
const EXERCISE_KINDS = new Set(['question', 'answer', 'answer-reveal', 'evidence-dialog']);
const SENTENCE_KINDS = new Set(['sentence', 'teaching-panel', 'translation']);
const KNOWN_SEGMENTS = new Set(['reading-intro', 'reading-paragraph', 'reading-options', 'reading-question', 'reading-questions', 'reading-summary']);
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const validId = (value) => hasText(value) && value === value.trim();
const positiveInteger = (value) => Number.isSafeInteger(value) && value > 0;
const issue = (errors, code, path, message) => errors.push({code, path, message});
const phaseOf = (kind) => kind === 'question' ? 'question' : kind === 'evidence-dialog' ? 'evidence' : 'answer';

/** Structural and semantic preflight only; the CLI additionally checks local audio files. */
export function validateRenderContract(input, {requireCoverage = true} = {}) {
  const errors = [];
  const warnings = [];
  const finish = (value = null) => ({ok: errors.length === 0, errors, warnings, value: errors.length ? null : value});
  if (!isObject(input)) {
    issue(errors, 'INVALID_PACKAGE', 'props', 'render props must be an object');
    return finish();
  }
  const exercises = validateExerciseContract(input.lesson);
  errors.push(...exercises.errors);
  warnings.push(...exercises.warnings);
  if (input.version !== 1) issue(errors, 'UNSUPPORTED_PACKAGE_VERSION', 'version', 'only v1 render packages are supported');
  for (const key of ['fps', 'width', 'height', 'durationInFrames']) {
    if (!positiveInteger(input[key])) issue(errors, 'INVALID_VIDEO_METADATA', key, `${key} must be a positive safe integer`);
  }
  if (!validId(input.slug)) issue(errors, 'INVALID_SLUG', 'slug', 'slug is required');
  if (input.lesson?.slug !== input.slug) issue(errors, 'SLUG_MISMATCH', 'lesson.slug', 'lesson and render package slugs must match');
  if (input.visualProfile?.id !== 'english-reading-handdrawn-v1') issue(errors, 'UNSUPPORTED_VISUAL_PROFILE', 'visualProfile.id', 'only the implemented handdrawn-v1 profile is available');
  if (input.lesson?.fps !== undefined && input.lesson.fps !== input.fps) issue(errors, 'FPS_MISMATCH', 'lesson.fps', 'lesson and package FPS differ');
  if (positiveInteger(input.width) && positiveInteger(input.height) && (input.width !== 1920 || input.height !== 1080)) warnings.push({code: 'UNVERIFIED_LAYOUT', path: 'width/height', message: 'non-default dimensions require separate renderer layout verification; numeric validity is not layout support'});
  const rawSegments = input.timeline?.segments;
  if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
    issue(errors, 'INVALID_SEGMENTS', 'timeline.segments', 'segments must be a non-empty array');
    return finish();
  }
  const prepared = exercises.value;
  const byQuestion = new Map((prepared?.exercises ?? []).map((entry) => [entry.questionId, entry]));
  const rawSentences = input.lesson?.sentenceLessons ?? [];
  const sentenceIds = new Set(Array.isArray(rawSentences) ? rawSentences.filter(isObject).map((sentence) => sentence.id) : []);
  if (!Array.isArray(rawSentences)) issue(errors, 'INVALID_SENTENCES', 'lesson.sentenceLessons', 'sentenceLessons must be an array');
  const segmentIds = new Set();
  const cueIds = new Set();
  const events = [];
  const segments = [];
  let cursor = 0;
  rawSegments.forEach((segment, segmentIndex) => {
    const at = `timeline.segments[${segmentIndex}]`;
    if (!isObject(segment)) {
      issue(errors, 'INVALID_SEGMENT', at, 'segment must be an object');
      return;
    }
    if (!validId(segment.id)) issue(errors, 'INVALID_SEGMENT_ID', `${at}.id`, 'segment id is required');
    if (segmentIds.has(segment.id)) issue(errors, 'DUPLICATE_SEGMENT_ID', `${at}.id`, 'segment ids must be unique');
    segmentIds.add(segment.id);
    if (!KNOWN_SEGMENTS.has(segment.kind)) issue(errors, 'UNSUPPORTED_SEGMENT_KIND', `${at}.kind`, `unknown segment kind ${String(segment.kind)}`);
    if (segment.startFrame !== cursor) issue(errors, 'NONCONTIGUOUS_SEGMENTS', `${at}.startFrame`, `expected inclusive startFrame ${cursor}`);
    if (!positiveInteger(segment.durationFrames)) issue(errors, 'INVALID_SEGMENT_DURATION', `${at}.durationFrames`, 'durationFrames must be a positive safe integer');
    if (!Number.isSafeInteger(segment.startFrame) || segment.startFrame < 0 || !Number.isSafeInteger(segment.endFrame) || segment.endFrame !== segment.startFrame + segment.durationFrames) issue(errors, 'INVALID_SEGMENT_RANGE', at, 'endFrame must be the exclusive end of the segment');
    cursor = segment.endFrame;
    if (!hasText(segment.audioSrc) || /^[\\/]|^[A-Za-z][A-Za-z0-9+.-]*:/.test(segment.audioSrc) || segment.audioSrc.split(/[\\/]/).includes('..')) issue(errors, 'INVALID_AUDIO_PATH', `${at}.audioSrc`, 'audioSrc must be a public-relative path without traversal or a URL scheme');
    segments.push({id: segment.id, startFrame: segment.startFrame, endFrame: segment.endFrame});
    if (!Array.isArray(segment.cues)) {
      issue(errors, 'INVALID_CUES', `${at}.cues`, 'cues must be an array');
      return;
    }
    let prior = -1;
    segment.cues.forEach((cue, cueIndex) => {
      const path = `${at}.cues[${cueIndex}]`;
      if (!isObject(cue)) {
        issue(errors, 'INVALID_CUE', path, 'cue must be an object');
        return;
      }
      if (!validId(cue.id)) issue(errors, 'INVALID_CUE_ID', `${path}.id`, 'cue id is required');
      if (cueIds.has(cue.id)) issue(errors, 'DUPLICATE_CUE_ID', `${path}.id`, 'cue ids must be unique across the package');
      cueIds.add(cue.id);
      if (!KNOWN_CUE_KINDS.includes(cue.kind)) issue(errors, 'UNSUPPORTED_CUE_KIND', `${path}.kind`, `unknown cue kind ${String(cue.kind)}`);
      if (!Number.isSafeInteger(cue.startFrame) || cue.startFrame < 0 || cue.startFrame >= segment.durationFrames) issue(errors, 'CUE_OUT_OF_BOUNDS', `${path}.startFrame`, 'cue frame must be inside its segment');
      if (cue.startFrame < prior) issue(errors, 'NONMONOTONIC_CUES', `${path}.startFrame`, 'local cue frames must be monotonic');
      prior = cue.startFrame;
      if (EXERCISE_KINDS.has(cue.kind) && !byQuestion.has(cue.refId)) issue(errors, 'UNKNOWN_EXERCISE_REFERENCE', `${path}.refId`, `unknown exercise ${String(cue.refId)}`);
      if (SENTENCE_KINDS.has(cue.kind) && !sentenceIds.has(cue.refId)) issue(errors, 'UNKNOWN_SENTENCE_REFERENCE', `${path}.refId`, `unknown sentence ${String(cue.refId)}`);
      if (cue.kind === 'summary-card' && cue.refId !== 'lesson') issue(errors, 'INVALID_SUMMARY_REFERENCE', `${path}.refId`, 'summary-card must refer to lesson');
      events.push({id: cue.id, kind: cue.kind, refId: cue.refId ?? '', frame: segment.startFrame + cue.startFrame, localFrame: cue.startFrame, segmentId: segment.id, path});
    });
  });
  if (cursor !== input.durationInFrames) issue(errors, 'TOTAL_DURATION_MISMATCH', 'durationInFrames', `timeline ends at ${String(cursor)}`);
  // Do not silently sort malformed cue arrays into an apparently valid plan.
  if (errors.length) return finish();

  // Every currently supported cue changes a visible teaching state. Decorative
  // parallel tracks need an explicit future channel, not colliding scene cues.
  for (let index = 1; index < events.length; index += 1) {
    if (events[index - 1].frame === events[index].frame) issue(errors, 'SIMULTANEOUS_VISUAL_STATES', events[index].path, 'two scene-changing cues share a frame; one state would never be visible');
  }
  const progress = new Map();
  let lastExerciseEvent = null;
  let summary = null;
  for (const event of events) {
    if (summary) issue(errors, 'EVENT_AFTER_SUMMARY', event.path, 'lesson summary must be the final visual cue');
    if (event.kind === 'summary-card') {
      summary = event;
      continue;
    }
    if (!EXERCISE_KINDS.has(event.kind)) continue;
    if (lastExerciseEvent?.frame === event.frame) issue(errors, 'SIMULTANEOUS_EXERCISE_STATES', event.path, 'mutually exclusive question, answer, or evidence states cannot share a frame');
    lastExerciseEvent = event;
    const phase = phaseOf(event.kind);
    const previous = progress.get(event.refId);
    const entry = byQuestion.get(event.refId);
    if (phase === 'question') {
      if (previous?.phase === 'question') issue(errors, 'UNFINISHED_EXERCISE_CYCLE', event.path, 'question repeated before its answer');
      if (previous?.phase === 'answer' && hasText(entry.exercise.evidenceParagraphId)) issue(errors, 'MISSING_EVIDENCE_PHASE', event.path, 'previous question cycle needs evidence before restarting');
    } else if (phase === 'answer' && previous?.phase !== 'question') {
      issue(errors, 'ANSWER_BEFORE_QUESTION', event.path, 'answer must follow an unanswered question, including across audio segments');
    } else if (phase === 'evidence') {
      if (previous?.phase !== 'answer') issue(errors, 'EVIDENCE_BEFORE_ANSWER', event.path, 'evidence must follow its answer');
      if (!hasText(entry.exercise.evidenceParagraphId)) issue(errors, 'MISSING_EVIDENCE_CONTENT', event.path, 'evidence cue has no article evidence');
    }
    progress.set(event.refId, {phase, frame: event.frame});
  }
  for (const entry of prepared.exercises) {
    const current = progress.get(entry.questionId);
    const at = `exerciseLessons.${entry.questionId}`;
    if (!current) {
      if (requireCoverage) issue(errors, 'UNSCHEDULED_EXERCISE', at, 'no teaching steps reference this exercise');
      continue;
    }
    if (current.phase === 'question') issue(errors, 'MISSING_ANSWER_PHASE', at, 'scheduled question never reveals an answer');
    if (hasText(entry.exercise.evidenceParagraphId) && current.phase !== 'evidence') issue(errors, 'MISSING_EVIDENCE_PHASE', at, 'scheduled article-based exercise must show its evidence');
  }
  if (summary && lastExerciseEvent?.frame === summary.frame) issue(errors, 'SIMULTANEOUS_SUMMARY', summary.path, 'summary would replace the final exercise state on its first frame');
  return finish({prepared, events, segments, durationInFrames: input.durationInFrames});
}

export function compileExerciseTimeline(input, options) {
  const result = validateRenderContract(input, options);
  if (!result.ok) throw new ExerciseContractError(result.errors);
  return result.value;
}

/** A seek-safe pure projection: calling frame 100 before frame 10 changes nothing. */
export function exerciseStateAtFrame(plan, frame) {
  if (!Number.isSafeInteger(frame) || frame < 0 || frame >= plan.durationInFrames) throw new RangeError('frame must be inside the compiled timeline');
  const segment = plan.segments.find((item) => frame >= item.startFrame && frame < item.endFrame);
  const revealed = new Set();
  let latest = null;
  for (const event of plan.events) {
    if (event.frame > frame) break;
    if (event.kind === 'question') revealed.delete(event.refId);
    else if (event.kind === 'answer' || event.kind === 'answer-reveal') revealed.add(event.refId);
    if (event.segmentId === segment.id) latest = event;
  }
  const active = latest && EXERCISE_KINDS.has(latest.kind) ? {
    questionId: latest.refId,
    phase: phaseOf(latest.kind),
    sinceFrame: frame - latest.frame,
  } : null;
  const revealedPairs = [];
  // Derive cumulative links by real reveal events, never by question-array order.
  for (const group of plan.prepared.groups) {
    for (const questionId of group.questionIds) {
      if (!revealed.has(questionId)) continue;
      const entry = plan.prepared.exercises.find((exercise) => exercise.questionId === questionId);
      revealedPairs.push({groupId: group.id, leftQuestionId: questionId, rightOptionId: entry.answerOptionId});
    }
  }
  return {
    segmentId: segment.id,
    localFrame: frame - segment.startFrame,
    active,
    latestCue: latest ? {...latest} : null,
    revealedQuestionIds: plan.prepared.exercises.filter((entry) => revealed.has(entry.questionId)).map((entry) => entry.questionId),
    revealedPairs,
  };
}
