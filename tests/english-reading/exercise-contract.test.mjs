import test from 'node:test';
import assert from 'node:assert/strict';
import {validateExerciseContract, assertExerciseContract, getExerciseContext, buildExerciseSummary, PRESENTATION_CAPABILITIES, ExerciseContractError} from '../../src/english-reading/model/exercise-contract.mjs';
import {choiceLesson, matchingLesson, mixedLesson, clone} from './fixtures.mjs';

const codes = (result) => result.errors.map((error) => error.code);
const fails = (input, code) => {
  const result = validateExerciseContract(input);
  assert.equal(result.ok, false, JSON.stringify(result));
  assert.equal(result.value, null);
  assert.ok(codes(result).includes(code), JSON.stringify(result.errors));
};

test('three-option source questions are not forced into four options', () => {
  const result = validateExerciseContract(choiceLesson());
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.value.exercises[0].answerOptionId, 'B');
});
test('five-option single choice remains a single-choice contract', () => {
  const lesson = choiceLesson();
  lesson.source.questions[0].options.push({label: 'D', text: 'School'}, {label: 'E', text: 'Shop'});
  lesson.exerciseLessons[0].answer = 'E';
  assert.equal(validateExerciseContract(lesson).ok, true);
});
test('explicit true-false is accepted without relabelling it fill-blank', () => {
  const lesson = choiceLesson();
  lesson.source.questions[0].type = 'true-false';
  lesson.source.questions[0].options = [{label: 'True', text: 'True'}, {label: 'False', text: 'False'}];
  lesson.exerciseLessons[0].answer = 'True';
  assert.equal(validateExerciseContract(lesson).ok, true);
});
test('legacy default preserves source type and emits an explicit warning', () => {
  const lesson = choiceLesson();
  lesson.source.questions[0].type = 'fill-blank';
  delete lesson.exerciseLessons[0].presentationMode;
  const result = validateExerciseContract(lesson);
  assert.equal(result.ok, true);
  assert.equal(result.value.exercises[0].question.type, 'fill-blank');
  assert.ok(result.warnings.some((issue) => issue.code === 'LEGACY_DEFAULT_PRESENTATION'));
});
test('legacy short-answer disguised as fill-blank requires its explicit mode', () => {
  const lesson = choiceLesson();
  lesson.source.questions[0].type = 'fill-blank';
  lesson.source.questions[0].options = [];
  lesson.exerciseLessons[0].answer = 'Lina reads in the library.';
  lesson.exerciseLessons[0].presentationMode = 'short-answer';
  assert.equal(validateExerciseContract(lesson).ok, true);
  delete lesson.exerciseLessons[0].presentationMode;
  fails(lesson, 'PRESENTATION_REQUIRED');
});
test('new semantic types require explicit presentation rather than legacy defaults', () => {
  const lesson = choiceLesson(); lesson.source.questions[0].type = 'single-choice';
  delete lesson.exerciseLessons[0].presentationMode;
  fails(lesson, 'PRESENTATION_REQUIRED');
});
test('source-phase validation permits unanswered drafts', () => {
  const lesson = choiceLesson(); lesson.exerciseLessons[0].answer = '';
  assert.equal(validateExerciseContract(lesson, {requireAnswers: false}).ok, true);
  fails(lesson, 'ANSWER_REQUIRED');
});

for (const [name, mutate, code] of [
  ['unknown mode', (l) => { l.exerciseLessons[0].presentationMode = 'inline-cloze'; }, 'UNSUPPORTED_PRESENTATION'],
  ['prototype key is not a mode', (l) => { l.exerciseLessons[0].presentationMode = '__proto__'; }, 'UNSUPPORTED_PRESENTATION'],
  ['constructor is not a mode', (l) => { l.exerciseLessons[0].presentationMode = 'constructor'; }, 'UNSUPPORTED_PRESENTATION'],
  ['unknown semantic type', (l) => { l.source.questions[0].type = 'sequence-sort'; }, 'INCOMPATIBLE_PRESENTATION'],
  ['one option', (l) => { l.source.questions[0].options = l.source.questions[0].options.slice(0, 1); }, 'TOO_FEW_OPTIONS'],
  ['unknown answer', (l) => { l.exerciseLessons[0].answer = 'Z'; }, 'UNKNOWN_ANSWER_OPTION'],
  ['duplicate option label', (l) => { l.source.questions[0].options[1].label = 'A'; }, 'DUPLICATE_OPTION_LABEL'],
  ['duplicate option id', (l) => { l.source.questions[0].options[0].id = 'shared'; l.source.questions[0].options[1].id = 'shared'; }, 'DUPLICATE_OPTION_ID'],
  ['ambiguous label and id', (l) => { l.source.questions[0].options[0].id = 'B'; }, 'AMBIGUOUS_OPTION_REFERENCE'],
  ['empty prompt', (l) => { l.source.questions[0].prompt = ''; }, 'INVALID_PROMPT'],
  ['duplicate question id', (l) => { l.source.questions.push(clone(l.source.questions[0])); }, 'DUPLICATE_QUESTION_ID'],
  ['duplicate exercise', (l) => { l.exerciseLessons.push(clone(l.exerciseLessons[0])); }, 'DUPLICATE_EXERCISE'],
  ['missing exercise', (l) => { l.exerciseLessons = []; }, 'MISSING_EXERCISE'],
  ['unknown exercise reference', (l) => { l.exerciseLessons[0].questionId = 'Q99'; }, 'MISSING_QUESTION'],
  ['options are not an array', (l) => { l.source.questions[0].options = 'A B'; }, 'INVALID_OPTIONS'],
  ['short answer cannot hide printed choices', (l) => { l.source.questions[0].type = 'short-answer'; l.exerciseLessons[0].presentationMode = 'short-answer'; }, 'UNEXPECTED_OPTIONS'],
  ['three-valued true false is not silently supported', (l) => { l.source.questions[0].type = 'true-false'; }, 'INVALID_TRUE_FALSE_OPTIONS'],
  ['missing evidence paragraph', (l) => { l.exerciseLessons[0].evidenceParagraphId = 'P99'; }, 'MISSING_EVIDENCE_PARAGRAPH'],
  ['nonexact evidence', (l) => { l.exerciseLessons[0].evidenceHighlights = ['a made-up quote']; }, 'EVIDENCE_NOT_EXACT'],
  ['empty evidence', (l) => { l.exerciseLessons[0].evidenceHighlights = []; }, 'MISSING_EVIDENCE_HIGHLIGHT'],
  ['malformed highlights', (l) => { l.exerciseLessons[0].evidenceHighlights = 'quote'; }, 'INVALID_EVIDENCE'],
  ['unknown contract version', (l) => { l.version = 2; }, 'UNSUPPORTED_VERSION'],
]) {
  test(`rejects ${name}`, () => { const lesson = choiceLesson(); mutate(lesson); fails(lesson, code); });
}

for (const value of [null, [], 'lesson', 42, {}, {source: {}, exerciseLessons: []}, {source: {questions: [null]}, exerciseLessons: [null]}]) {
  test(`malformed JSON structure returns issues instead of crashing: ${JSON.stringify(value)}`, () => {
    assert.doesNotThrow(() => { assert.equal(validateExerciseContract(value).ok, false); });
  });
}

test('uniform, all-matching legacy lesson resolves one group with a warning', () => {
  const result = validateExerciseContract(matchingLesson());
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.value.groups.length, 1);
  assert.equal(result.value.groups[0].legacy, true);
  assert.ok(result.warnings.some((issue) => issue.code === 'LEGACY_MATCHING_GROUP'));
});
test('differing legacy option sets cannot silently use the first question', () => {
  const lesson = matchingLesson(); lesson.source.questions[1].options[0].text = 'Different material';
  fails(lesson, 'EXPLICIT_GROUP_REQUIRED');
});
test('mixed legacy matching requires explicit groups', () => {
  const lesson = matchingLesson();
  const choice = choiceLesson();
  lesson.source.questions.push(choice.source.questions[0]); lesson.exerciseLessons.push(choice.exerciseLessons[0]);
  fails(lesson, 'EXPLICIT_GROUP_REQUIRED');
});
test('two explicit groups remain isolated despite identical A/B labels', () => {
  const prepared = assertExerciseContract(mixedLesson());
  assert.equal(getExerciseContext(prepared, 'M01').group.options[1].text, 'Library');
  assert.equal(getExerciseContext(prepared, 'N01').group.options[1].text, 'Soup');
  assert.equal(getExerciseContext(prepared, 'Q01').group, null);
});
test('reordering exercise records does not change identity, groups, or summaries', () => {
  const lesson = mixedLesson(); const before = assertExerciseContract(lesson);
  lesson.exerciseLessons.reverse(); const after = assertExerciseContract(lesson);
  assert.deepEqual(after, before);
  assert.deepEqual(buildExerciseSummary(after).map((row) => row.mode), ['option-cards', 'left-right-connect', 'left-right-connect', 'left-right-connect', 'left-right-connect', 'short-answer']);
  assert.equal(buildExerciseSummary(after).at(-1).answer, 'I prefer reading in a quiet place.');
});
test('unknown context fails rather than displaying a placeholder', () => {
  assert.throws(() => getExerciseContext(assertExerciseContract(choiceLesson()), 'missing'), ExerciseContractError);
});
for (const [name, mutate, code] of [
  ['unknown group', (l) => { l.exerciseLessons[1].groupId = 'absent'; }, 'GROUP_REFERENCE_MISMATCH'],
  ['duplicate group id', (l) => { l.exerciseGroups[1].id = l.exerciseGroups[0].id; }, 'DUPLICATE_GROUP_ID'],
  ['question assigned to two groups', (l) => { l.exerciseGroups[1].questionIds.push('M01'); }, 'DUPLICATE_GROUP_MEMBER'],
  ['unknown group member', (l) => { l.exerciseGroups[0].questionIds.push('missing'); }, 'UNKNOWN_GROUP_MEMBER'],
  ['choice in matching group', (l) => { l.exerciseGroups[0].questionIds.push('Q01'); }, 'NON_MATCHING_GROUP_MEMBER'],
  ['inconsistent per-question options', (l) => { l.source.questions[1].options = [{label: 'Z', text: 'Wrong board'}]; }, 'CONFLICTING_GROUP_OPTIONS'],
  ['mapping to another group', (l) => { l.exerciseLessons[1].mapping.right = 'meals-0'; }, 'UNKNOWN_MATCH_TARGET'],
  ['mapping and answer disagree', (l) => { l.exerciseLessons[1].answer = 'A'; }, 'ANSWER_MAPPING_MISMATCH'],
  ['missing mapping', (l) => { delete l.exerciseLessons[1].mapping; }, 'MAPPING_REQUIRED'],
  ['illegal target reuse', (l) => { l.exerciseLessons[2].mapping.right = 'places-1'; l.exerciseLessons[2].answer = 'B'; }, 'MATCH_TARGET_REUSED'],
]) {
  test(`rejects ${name}`, () => { const lesson = mixedLesson(); mutate(lesson); fails(lesson, code); });
}
test('target reuse is supported only when explicitly enabled for that group', () => {
  const lesson = mixedLesson(); lesson.exerciseGroups[0].allowReuse = true;
  lesson.exerciseLessons[2].mapping.right = 'places-1'; lesson.exerciseLessons[2].answer = 'B';
  assert.equal(validateExerciseContract(lesson).ok, true);
});
test('duplicate evidence text is reported without rewriting a legacy lesson', () => {
  const lesson = choiceLesson(); lesson.source.articleParagraphs[0].text += ' Lina reads in the library.';
  const result = validateExerciseContract(lesson);
  assert.equal(result.ok, true);
  assert.ok(result.warnings.some((issue) => issue.code === 'AMBIGUOUS_LEGACY_EVIDENCE'));
});
test('normalization and summaries do not mutate source packages', () => {
  const lesson = mixedLesson(); const before = clone(lesson);
  buildExerciseSummary(assertExerciseContract(lesson));
  assert.deepEqual(lesson, before);
});
for (const field of ['theme', 'explanation', 'evidenceParagraphId']) {
  test(`optional ${field} is type-checked when supplied`, () => {
    const lesson = choiceLesson(); lesson.exerciseLessons[0][field] = 42;
    fails(lesson, 'INVALID_EXERCISE_FIELD');
  });
}
test('source drafts still require a string answer field', () => {
  const lesson = choiceLesson(); delete lesson.exerciseLessons[0].answer;
  assert.equal(validateExerciseContract(lesson, {requireAnswers: false}).ok, false);
});
test('explicit null option id cannot silently become a legacy label', () => {
  const lesson = choiceLesson(); lesson.source.questions[0].options[0].id = null;
  fails(lesson, 'INVALID_OPTION_ID');
});
test('group title is validated before typed summary consumers receive it', () => {
  const lesson = mixedLesson(); lesson.exerciseGroups[0].title = {};
  fails(lesson, 'INVALID_GROUP_TITLE');
});
test('capability descriptors and nested arrays are immutable', () => {
  assert.throws(() => PRESENTATION_CAPABILITIES['inline-cloze'] = {}, TypeError);
  assert.throws(() => PRESENTATION_CAPABILITIES['option-cards'].questionTypes.push('sorting'), TypeError);
});
