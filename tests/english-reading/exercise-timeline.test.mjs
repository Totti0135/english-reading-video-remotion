import test from 'node:test';
import assert from 'node:assert/strict';
import {compileExerciseTimeline, validateRenderContract, exerciseStateAtFrame} from '../../src/english-reading/runtime/exercise-timeline.mjs';
import {choiceLesson, matchingLesson, mixedLesson, clone, renderPackage, segment} from './fixtures.mjs';
const fails = (props, code) => {
  const result = validateRenderContract(props);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((issue) => issue.code === code), JSON.stringify(result.errors));
};

test('question, answer, evidence and summary each have an observable state', () => {
  const plan = compileExerciseTimeline(renderPackage());
  assert.equal(exerciseStateAtFrame(plan, 0).active.phase, 'question');
  assert.deepEqual(exerciseStateAtFrame(plan, 11).revealedQuestionIds, []);
  assert.equal(exerciseStateAtFrame(plan, 12).active.phase, 'answer');
  assert.equal(exerciseStateAtFrame(plan, 24).active.phase, 'evidence');
  assert.equal(exerciseStateAtFrame(plan, 36).latestCue.kind, 'summary-card');
  assert.equal(exerciseStateAtFrame(plan, 36).active, null);
});
test('cross-audio-segment question and answer are validated as one teaching sequence', () => {
  const props = renderPackage(choiceLesson(), [
    segment('q', 0, 20, [['question', 'Q01', 0]]),
    segment('a', 20, 40, [['answer', 'Q01', 5], ['evidence-dialog', 'Q01', 20]]),
  ]);
  const plan = compileExerciseTimeline(props);
  assert.equal(exerciseStateAtFrame(plan, 25).active.sinceFrame, 0);
  assert.equal(exerciseStateAtFrame(plan, 20).active, null, 'new segment has no active cue until its first local cue');
});
test('one audio segment may alternate sentence and exercise teaching steps', () => {
  const props = renderPackage(choiceLesson(), [segment('mixed', 0, 80, [
    ['sentence', 'P01-S01', 0], ['question', 'Q01', 15], ['answer', 'Q01', 30],
    ['evidence-dialog', 'Q01', 45], ['translation', 'P01-S01', 60],
  ])]);
  props.timeline.segments[0].kind = 'reading-paragraph';
  const plan = compileExerciseTimeline(props);
  assert.equal(exerciseStateAtFrame(plan, 15).active.phase, 'question');
  assert.equal(exerciseStateAtFrame(plan, 60).active, null);
});
test('matching reveal follows actual cue IDs, not question or exercise array indices', () => {
  const lesson = matchingLesson(); lesson.exerciseLessons.reverse();
  const props = renderPackage(lesson, [segment('board', 0, 70, [
    ['question', 'M02', 0], ['answer-reveal', 'M02', 10],
    ['question', 'M01', 30], ['answer-reveal', 'M01', 45],
  ])]);
  const plan = compileExerciseTimeline(props);
  assert.deepEqual(exerciseStateAtFrame(plan, 10).revealedPairs.map((pair) => pair.leftQuestionId), ['M02']);
  assert.deepEqual(exerciseStateAtFrame(plan, 30).revealedPairs.map((pair) => pair.leftQuestionId), ['M02']);
  assert.equal(exerciseStateAtFrame(plan, 45).revealedPairs.length, 2);
});
test('two matching groups never exchange revealed connections', () => {
  const plan = compileExerciseTimeline(renderPackage(mixedLesson()));
  const state = exerciseStateAtFrame(plan, plan.durationInFrames - 1);
  for (const pair of state.revealedPairs) assert.ok(pair.rightOptionId.startsWith(`${pair.groupId}-`));
  assert.equal(state.revealedPairs.length, 4);
});
test('seeking backwards and rendering frames in arbitrary order is deterministic', () => {
  const plan = compileExerciseTimeline(renderPackage(mixedLesson()));
  const before = clone(plan);
  const frames = [0, 11, 12, 30, plan.durationInFrames - 1];
  const expected = new Map(frames.map((frame) => [frame, exerciseStateAtFrame(plan, frame)]));
  for (const frame of [...frames].reverse()) assert.deepEqual(exerciseStateAtFrame(plan, frame), expected.get(frame));
  assert.deepEqual(plan, before);
});
test('returning to a question hides its answer again without hiding other groups', () => {
  const lesson = matchingLesson();
  const plan = compileExerciseTimeline(renderPackage(lesson, [segment('revisit', 0, 100, [
    ['question', 'M01', 0], ['answer', 'M01', 10], ['question', 'M02', 20], ['answer', 'M02', 30],
    ['question', 'M01', 50], ['answer', 'M01', 70],
  ])]));
  assert.deepEqual(exerciseStateAtFrame(plan, 50).revealedQuestionIds, ['M02']);
  assert.equal(exerciseStateAtFrame(plan, 70).revealedPairs.length, 2);
});
for (const [name, mutate, code] of [
  ['same-frame answer', (p) => { p.timeline.segments[0].cues[1].startFrame = 0; }, 'SIMULTANEOUS_EXERCISE_STATES'],
  ['same-frame evidence', (p) => { p.timeline.segments[0].cues[2].startFrame = 12; }, 'SIMULTANEOUS_EXERCISE_STATES'],
  ['same-frame summary', (p) => { p.timeline.segments[0].cues[3].startFrame = 24; }, 'SIMULTANEOUS_SUMMARY'],
  ['answer without question', (p) => { p.timeline.segments[0].cues.shift(); }, 'ANSWER_BEFORE_QUESTION'],
  ['evidence without answer', (p) => { p.timeline.segments[0].cues.splice(1, 1); }, 'EVIDENCE_BEFORE_ANSWER'],
  ['missing evidence state', (p) => { p.timeline.segments[0].cues.splice(2, 1); }, 'MISSING_EVIDENCE_PHASE'],
  ['unknown cue kind', (p) => { p.timeline.segments[0].cues[0].kind = 'auto-reveal-all'; }, 'UNSUPPORTED_CUE_KIND'],
  ['unknown question reference', (p) => { p.timeline.segments[0].cues[0].refId = 'Q99'; }, 'UNKNOWN_EXERCISE_REFERENCE'],
  ['unknown segment kind', (p) => { p.timeline.segments[0].kind = 'dance'; }, 'UNSUPPORTED_SEGMENT_KIND'],
  ['out-of-bounds cue', (p) => { p.timeline.segments[0].cues[3].startFrame = 999; }, 'CUE_OUT_OF_BOUNDS'],
  ['fractional cue', (p) => { p.timeline.segments[0].cues[0].startFrame = 0.5; }, 'CUE_OUT_OF_BOUNDS'],
  ['unsorted cues', (p) => { p.timeline.segments[0].cues[0].startFrame = 20; }, 'NONMONOTONIC_CUES'],
  ['duplicate cue id', (p) => { p.timeline.segments[0].cues[1].id = p.timeline.segments[0].cues[0].id; }, 'DUPLICATE_CUE_ID'],
  ['timeline gap', (p) => { p.timeline.segments[0].startFrame = 1; }, 'NONCONTIGUOUS_SEGMENTS'],
  ['total duration mismatch', (p) => { p.durationInFrames += 1; }, 'TOTAL_DURATION_MISMATCH'],
  ['unknown visual profile', (p) => { p.visualProfile.id = 'not-installed'; }, 'UNSUPPORTED_VISUAL_PROFILE'],
  ['metadata invalid', (p) => { p.fps = 0; }, 'INVALID_VIDEO_METADATA'],
  ['FPS mismatch', (p) => { p.lesson.fps = 60; }, 'FPS_MISMATCH'],
  ['slug mismatch', (p) => { p.slug = 'other'; }, 'SLUG_MISMATCH'],
  ['path traversal', (p) => { p.timeline.segments[0].audioSrc = '../secret.wav'; }, 'INVALID_AUDIO_PATH'],
  ['absolute audio', (p) => { p.timeline.segments[0].audioSrc = '/tmp/audio.wav'; }, 'INVALID_AUDIO_PATH'],
  ['remote audio URL', (p) => { p.timeline.segments[0].audioSrc = 'https://example.invalid/audio.wav'; }, 'INVALID_AUDIO_PATH'],
  ['Windows absolute audio', (p) => { p.timeline.segments[0].audioSrc = 'C:\\audio.wav'; }, 'INVALID_AUDIO_PATH'],
  ['malformed cue array', (p) => { p.timeline.segments[0].cues = {}; }, 'INVALID_CUES'],
  ['malformed segment', (p) => { p.timeline.segments[0] = null; }, 'INVALID_SEGMENT'],
]) {
  test(`timeline rejects ${name}`, () => { const props = renderPackage(); mutate(props); fails(props, code); });
}
test('events after summary are not silently swallowed', () => {
  const props = renderPackage(); props.timeline.segments[0].cues.push({id: 'late', kind: 'sentence', refId: 'P01-S01', startFrame: 45});
  fails(props, 'EVENT_AFTER_SUMMARY');
});
test('coverage can be relaxed for a targeted diagnostic, never by default', () => {
  const props = renderPackage(); props.timeline.segments[0].cues = [];
  fails(props, 'UNSCHEDULED_EXERCISE');
  assert.equal(validateRenderContract(props, {requireCoverage: false}).ok, true);
});
test('invalid package shapes produce structured errors', () => {
  for (const input of [null, 'x', [], {}, {version: 1, timeline: {segments: 'bad'}}]) {
    assert.doesNotThrow(() => assert.equal(validateRenderContract(input).ok, false));
  }
});
test('a same-frame sentence cannot silently cover the question', () => {
  const props = renderPackage();
  props.timeline.segments[0].cues.splice(1, 0, {id: 'overlapping-sentence', kind: 'sentence', refId: 'P01-S01', startFrame: 0});
  fails(props, 'SIMULTANEOUS_VISUAL_STATES');
});
test('non-default dimensions are reported as unverified, not advertised as layout support', () => {
  const props = renderPackage(); props.width = 1080; props.height = 1920;
  const result = validateRenderContract(props);
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((issue) => issue.code === 'UNVERIFIED_LAYOUT'));
});
test('frame range is enforced at both endpoints', () => {
  const plan = compileExerciseTimeline(renderPackage());
  for (const frame of [-1, 0.5, NaN, Infinity, plan.durationInFrames]) assert.throws(() => exerciseStateAtFrame(plan, frame), RangeError);
  assert.doesNotThrow(() => exerciseStateAtFrame(plan, plan.durationInFrames - 1));
});
