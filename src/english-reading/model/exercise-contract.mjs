// Pure, browser-safe exercise preflight. No React, filesystem, or Node dependencies.
// This is an additive v1-compatible contract; it does not silently migrate old lessons.

export const PRESENTATION_CAPABILITIES = Object.freeze({
  'option-cards': Object.freeze({
    questionTypes: Object.freeze(['multiple-choice', 'single-choice', 'true-false', 'fill-blank']),
    phases: Object.freeze(['question', 'answer', 'evidence']),
  }),
  'left-right-connect': Object.freeze({
    questionTypes: Object.freeze(['matching', 'fill-blank']),
    phases: Object.freeze(['question', 'answer', 'evidence']),
  }),
  'short-answer': Object.freeze({
    questionTypes: Object.freeze(['short-answer', 'fill-blank']),
    phases: Object.freeze(['question', 'answer', 'evidence']),
  }),
});

const LEGACY_GROUP_ID = '__legacy_matching__';
const own = (object, key) => Object.prototype.hasOwnProperty.call(object, key);
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value) => typeof value === 'string' && value.trim().length > 0;
const id = (value) => text(value) && value === value.trim();
const issues = () => ({errors: [], warnings: []});
const add = (list, code, path, message) => list.push({code, path, message});

export class ExerciseContractError extends Error {
  constructor(errors) {
    super(errors.map((error) => `${error.path}: ${error.message}`).join('\n'));
    this.name = 'ExerciseContractError';
    this.issues = errors;
  }
}

function optionsOf(value, path, errors) {
  if (!Array.isArray(value)) {
    add(errors, 'INVALID_OPTIONS', path, 'options must be an array');
    return [];
  }
  const ids = new Set();
  const labels = new Set();
  const result = [];
  value.forEach((option, index) => {
    const at = `${path}[${index}]`;
    if (!object(option)) {
      add(errors, 'INVALID_OPTION', at, 'option must be an object');
      return;
    }
    const optionId = option.id ?? option.label;
    if (option.id !== undefined && !id(option.id)) add(errors, 'INVALID_OPTION_ID', `${at}.id`, 'an explicitly supplied option id must not be null or invalid');
    if (!id(optionId)) add(errors, 'INVALID_OPTION_ID', `${at}.id`, 'id (or legacy label) must be a non-empty, unpadded string');
    if (!id(option.label)) add(errors, 'INVALID_OPTION_LABEL', `${at}.label`, 'label must be a non-empty, unpadded string');
    if (!text(option.text)) add(errors, 'INVALID_OPTION_TEXT', `${at}.text`, 'option text is required');
    if (ids.has(optionId)) add(errors, 'DUPLICATE_OPTION_ID', at, `duplicate option id ${optionId}`);
    if (labels.has(option.label)) add(errors, 'DUPLICATE_OPTION_LABEL', at, `duplicate option label ${option.label}`);
    ids.add(optionId);
    labels.add(option.label);
    result.push({id: optionId, label: option.label, text: option.text});
  });
  // A label must not name another option's ID: legacy answer references would be ambiguous.
  for (const option of result) {
    if (result.some((other) => other !== option && other.id === option.label)) {
      add(errors, 'AMBIGUOUS_OPTION_REFERENCE', path, `label ${option.label} also identifies another option`);
    }
  }
  return result;
}

function chooseMode(question, exercise, at, result) {
  const supplied = exercise.presentationMode;
  if (supplied !== undefined) {
    if (typeof supplied !== 'string' || !own(PRESENTATION_CAPABILITIES, supplied)) {
      add(result.errors, 'UNSUPPORTED_PRESENTATION', `${at}.presentationMode`, `unsupported presentation mode: ${String(supplied)}`);
      return null;
    }
    return supplied;
  }
  // Preserve only the old, unambiguous option-card default. An empty option list
  // is NOT evidence that a legacy fill-blank is a short-answer or inline cloze.
  if (['multiple-choice', 'fill-blank'].includes(question.type) && question.options.length >= 2 && exercise.mapping === undefined) {
    add(result.warnings, 'LEGACY_DEFAULT_PRESENTATION', `${at}.presentationMode`, 'using the legacy option-cards default; specify presentationMode in new packages');
    return 'option-cards';
  }
  add(result.errors, 'PRESENTATION_REQUIRED', `${at}.presentationMode`, 'an explicit supported presentationMode is required; ambiguous legacy questions are not inferred');
  return null;
}

function resolveOption(options, reference) {
  const matches = options.filter((option) => option.id === reference || option.label === reference);
  return matches.length === 1 ? matches[0] : null;
}

function checkEvidence(exercise, paragraphs, at, result) {
  const paragraphId = exercise.evidenceParagraphId;
  const highlights = exercise.evidenceHighlights ?? [];
  if (!Array.isArray(highlights)) {
    add(result.errors, 'INVALID_EVIDENCE', `${at}.evidenceHighlights`, 'evidenceHighlights must be an array');
    return;
  }
  if (!text(paragraphId) && highlights.length === 0) return;
  if (!paragraphs.has(paragraphId)) {
    add(result.errors, 'MISSING_EVIDENCE_PARAGRAPH', `${at}.evidenceParagraphId`, `unknown evidence paragraph ${String(paragraphId)}`);
    return;
  }
  const paragraph = paragraphs.get(paragraphId);
  if (highlights.length === 0) add(result.errors, 'MISSING_EVIDENCE_HIGHLIGHT', `${at}.evidenceHighlights`, 'an evidence paragraph needs at least one exact highlight');
  highlights.forEach((highlight, index) => {
    const path = `${at}.evidenceHighlights[${index}]`;
    if (!text(highlight) || !paragraph.includes(highlight)) {
      add(result.errors, 'EVIDENCE_NOT_EXACT', path, 'highlight must be a non-empty exact substring of the complete paragraph');
    } else {
      const first = paragraph.indexOf(highlight);
      if (paragraph.indexOf(highlight, first + 1) >= 0) {
        add(result.warnings, 'AMBIGUOUS_LEGACY_EVIDENCE', path, 'highlight occurs more than once; the legacy renderer selects the first occurrence');
      }
    }
  });
}

/** Validate the exercise layer only; retain existing source/narration/media gates. */
export function validateExerciseContract(input, {requireAnswers = true} = {}) {
  const result = issues();
  const {errors, warnings} = result;
  const finish = (value = null) => ({ok: errors.length === 0, errors, warnings, value: errors.length ? null : value});
  if (!object(input)) {
    add(errors, 'INVALID_LESSON', 'lesson', 'lesson must be an object');
    return finish();
  }
  if (input.version !== undefined && input.version !== 1) add(errors, 'UNSUPPORTED_VERSION', 'lesson.version', 'this compatibility contract accepts v1 only; no automatic v2 migration');
  const rawQuestions = input.source?.questions;
  const rawExercises = input.exerciseLessons;
  if (!Array.isArray(rawQuestions)) add(errors, 'INVALID_QUESTIONS', 'source.questions', 'questions must be an array');
  if (!Array.isArray(rawExercises)) add(errors, 'INVALID_EXERCISES', 'exerciseLessons', 'exerciseLessons must be an array');
  if (errors.length) return finish();

  const questions = new Map();
  rawQuestions.forEach((question, index) => {
    const at = `source.questions[${index}]`;
    if (!object(question)) {
      add(errors, 'INVALID_QUESTION', at, 'question must be an object');
      return;
    }
    if (!id(question.id)) add(errors, 'INVALID_QUESTION_ID', `${at}.id`, 'question id must be a non-empty, unpadded string');
    if (questions.has(question.id)) add(errors, 'DUPLICATE_QUESTION_ID', `${at}.id`, `duplicate question id ${question.id}`);
    if (!text(question.type)) add(errors, 'INVALID_QUESTION_TYPE', `${at}.type`, 'question type is required');
    if (!text(question.prompt)) add(errors, 'INVALID_PROMPT', `${at}.prompt`, 'the original question prompt is required');
    questions.set(question.id, {...question, options: optionsOf(question.options, `${at}.options`, errors)});
  });

  const paragraphs = new Map();
  const rawParagraphs = input.source?.articleParagraphs ?? [];
  if (!Array.isArray(rawParagraphs)) add(errors, 'INVALID_PARAGRAPHS', 'source.articleParagraphs', 'articleParagraphs must be an array');
  else rawParagraphs.forEach((paragraph, index) => {
    if (!object(paragraph) || !id(paragraph.id) || !text(paragraph.text)) {
      add(errors, 'INVALID_PARAGRAPH', `source.articleParagraphs[${index}]`, 'paragraph requires a stable id and complete text');
      return;
    }
    if (paragraphs.has(paragraph.id)) add(errors, 'DUPLICATE_PARAGRAPH_ID', `source.articleParagraphs[${index}].id`, `duplicate paragraph id ${paragraph.id}`);
    paragraphs.set(paragraph.id, paragraph.text);
  });

  const exercises = new Map();
  rawExercises.forEach((exercise, index) => {
    const at = `exerciseLessons[${index}]`;
    if (!object(exercise)) {
      add(errors, 'INVALID_EXERCISE', at, 'exercise must be an object');
      return;
    }
    if (!id(exercise.questionId)) add(errors, 'INVALID_EXERCISE_ID', `${at}.questionId`, 'questionId is required');
    if (exercises.has(exercise.questionId)) add(errors, 'DUPLICATE_EXERCISE', at, `duplicate exercise for ${exercise.questionId}`);
    const question = questions.get(exercise.questionId);
    if (!question) {
      add(errors, 'MISSING_QUESTION', `${at}.questionId`, `unknown question ${exercise.questionId}`);
      return;
    }
    const mode = chooseMode(question, exercise, at, result);
    if (mode && !PRESENTATION_CAPABILITIES[mode].questionTypes.includes(question.type)) {
      add(errors, 'INCOMPATIBLE_PRESENTATION', at, `${question.type} is not supported by ${mode}`);
    }
    if (typeof exercise.answer !== 'string') add(errors, 'INVALID_ANSWER', `${at}.answer`, 'answer must be a string, including the empty string in source drafts');
    for (const field of ['theme', 'explanation', 'evidenceParagraphId']) {
      if (exercise[field] !== undefined && typeof exercise[field] !== 'string') add(errors, 'INVALID_EXERCISE_FIELD', `${at}.${field}`, `${field} must be a string when supplied`);
    }
    if (requireAnswers && !text(exercise.answer)) add(errors, 'ANSWER_REQUIRED', `${at}.answer`, 'answer is required');
    if (exercise.groupId !== undefined && !id(exercise.groupId)) add(errors, 'INVALID_GROUP_REFERENCE', `${at}.groupId`, 'groupId must be a non-empty, unpadded string');
    if (mode === 'option-cards') {
      if (question.options.length < 2) add(errors, 'TOO_FEW_OPTIONS', at, 'option-cards requires at least two options; no exactly-four assumption');
      if (requireAnswers && !resolveOption(question.options, exercise.answer)) add(errors, 'UNKNOWN_ANSWER_OPTION', `${at}.answer`, 'answer must identify exactly one option by id or legacy label');
      if (exercise.mapping !== undefined) add(errors, 'UNEXPECTED_MAPPING', `${at}.mapping`, 'option-cards cannot contain a matching answer');
    }
    if (mode === 'short-answer') {
      if (question.options.length !== 0) add(errors, 'UNEXPECTED_OPTIONS', at, 'short-answer must not silently hide printed options');
      if (exercise.mapping !== undefined) add(errors, 'UNEXPECTED_MAPPING', `${at}.mapping`, 'short-answer cannot contain a matching answer');
    }
    if (question.type === 'true-false' && question.options.length !== 2) add(errors, 'INVALID_TRUE_FALSE_OPTIONS', at, 'true-false requires two explicitly supplied options; not-given needs a separate future contract');
    if (mode !== 'left-right-connect' && exercise.groupId !== undefined) add(errors, 'UNEXPECTED_GROUP', `${at}.groupId`, 'this phase only supports explicit groups for matching exercises');
    if (requireAnswers) checkEvidence(exercise, paragraphs, at, result);
    exercises.set(exercise.questionId, {questionId: exercise.questionId, question, exercise: {...exercise}, mode, groupId: null, answerOptionId: null});
  });
  for (const questionId of questions.keys()) {
    if (!exercises.has(questionId)) add(errors, 'MISSING_EXERCISE', 'exerciseLessons', `missing exercise for ${questionId}`);
  }

  const groups = new Map();
  const membership = new Map();
  const rawGroups = input.exerciseGroups ?? [];
  if (!Array.isArray(rawGroups)) add(errors, 'INVALID_GROUPS', 'exerciseGroups', 'exerciseGroups must be an array');
  else rawGroups.forEach((group, index) => {
    const at = `exerciseGroups[${index}]`;
    if (!object(group)) {
      add(errors, 'INVALID_GROUP', at, 'group must be an object');
      return;
    }
    if (!id(group.id) || group.id === LEGACY_GROUP_ID) add(errors, 'INVALID_GROUP_ID', `${at}.id`, 'group needs a stable, non-reserved id');
    if (groups.has(group.id)) add(errors, 'DUPLICATE_GROUP_ID', `${at}.id`, `duplicate group id ${group.id}`);
    if (group.kind !== 'matching') add(errors, 'UNSUPPORTED_GROUP_KIND', `${at}.kind`, 'only matching groups are implemented in this contract');
    if (group.title !== undefined && typeof group.title !== 'string') add(errors, 'INVALID_GROUP_TITLE', `${at}.title`, 'group title must be a string when supplied');
    if (group.allowReuse !== undefined && typeof group.allowReuse !== 'boolean') add(errors, 'INVALID_REUSE_RULE', `${at}.allowReuse`, 'allowReuse must be boolean');
    if (!Array.isArray(group.questionIds) || group.questionIds.length === 0) {
      add(errors, 'INVALID_GROUP_MEMBERS', `${at}.questionIds`, 'questionIds must be a non-empty array');
      return;
    }
    const options = optionsOf(group.options, `${at}.options`, errors);
    if (!options.length) add(errors, 'MISSING_GROUP_OPTIONS', `${at}.options`, 'matching group needs right-hand items');
    group.questionIds.forEach((questionId, memberIndex) => {
      const path = `${at}.questionIds[${memberIndex}]`;
      if (!questions.has(questionId)) add(errors, 'UNKNOWN_GROUP_MEMBER', path, `unknown question ${String(questionId)}`);
      if (membership.has(questionId)) add(errors, 'DUPLICATE_GROUP_MEMBER', path, `question ${String(questionId)} belongs to more than one group entry`);
      membership.set(questionId, group.id);
      if (exercises.get(questionId)?.mode !== 'left-right-connect') add(errors, 'NON_MATCHING_GROUP_MEMBER', path, 'all members of a matching group must use left-right-connect');
    });
    groups.set(group.id, {id: group.id, kind: 'matching', title: group.title ?? '', questionIds: [...group.questionIds], options, allowReuse: group.allowReuse ?? false, legacy: false});
  });

  const matching = [...exercises.values()].filter((entry) => entry.mode === 'left-right-connect');
  const ungrouped = matching.filter((entry) => !membership.has(entry.questionId) && entry.exercise.groupId === undefined);
  if (ungrouped.length) {
    const allMatching = matching.length === questions.size && matching.length === exercises.size;
    const signature = (options) => JSON.stringify(options.map(({id, label, text}) => ({id, label, text})));
    const firstOptions = ungrouped[0].question.options;
    const uniformOptions = firstOptions.length > 0 && ungrouped.every((entry) => signature(entry.question.options) === signature(firstOptions));
    if (allMatching && groups.size === 0 && ungrouped.length === matching.length && uniformOptions) {
      const orderedIds = [...questions.keys()];
      groups.set(LEGACY_GROUP_ID, {id: LEGACY_GROUP_ID, kind: 'matching', title: '', questionIds: orderedIds, options: firstOptions.map((option) => ({...option})), allowReuse: false, legacy: true});
      orderedIds.forEach((questionId) => membership.set(questionId, LEGACY_GROUP_ID));
      add(warnings, 'LEGACY_MATCHING_GROUP', 'exerciseGroups', 'one legacy group was resolved only because the whole lesson is matching and every option list is identical');
    } else {
      for (const entry of ungrouped) add(errors, 'EXPLICIT_GROUP_REQUIRED', `exerciseLessons.${entry.questionId}.groupId`, 'mixed lessons, multiple boards, or differing option lists require explicit exerciseGroups');
    }
  }

  const targets = new Map();
  for (const entry of exercises.values()) {
    const at = `exerciseLessons.${entry.questionId}`;
    if (entry.mode === 'option-cards') entry.answerOptionId = resolveOption(entry.question.options, entry.exercise.answer)?.id ?? null;
    if (entry.mode !== 'left-right-connect') continue;
    const memberGroupId = membership.get(entry.questionId);
    const requestedGroupId = entry.exercise.groupId;
    if (requestedGroupId !== undefined && requestedGroupId !== memberGroupId) add(errors, 'GROUP_REFERENCE_MISMATCH', `${at}.groupId`, 'groupId must agree with the explicit questionIds membership');
    const group = groups.get(memberGroupId);
    if (!group) {
      add(errors, 'MISSING_MATCHING_GROUP', at, 'matching question has no resolvable group');
      continue;
    }
    entry.groupId = group.id;
    if (!group.legacy && entry.question.options.length && JSON.stringify(entry.question.options) !== JSON.stringify(group.options)) add(errors, 'CONFLICTING_GROUP_OPTIONS', at, 'printed per-question options differ from the group options; do not substitute the first question list');
    if (!requireAnswers) continue;
    const mapping = entry.exercise.mapping;
    if (!object(mapping) || !text(mapping.left) || !text(mapping.right)) {
      add(errors, 'MAPPING_REQUIRED', `${at}.mapping`, 'matching needs explicit left and right references');
      continue;
    }
    const option = resolveOption(group.options, mapping.right);
    if (!option) {
      add(errors, 'UNKNOWN_MATCH_TARGET', `${at}.mapping.right`, 'mapping right must identify exactly one item in this group');
      continue;
    }
    entry.answerOptionId = option.id;
    if (resolveOption(group.options, entry.exercise.answer)?.id !== option.id) add(errors, 'ANSWER_MAPPING_MISMATCH', `${at}.answer`, 'answer and mapping.right must identify the same group item');
    const key = JSON.stringify([group.id, option.id]);
    if (!group.allowReuse && targets.has(key)) add(errors, 'MATCH_TARGET_REUSED', `${at}.mapping.right`, `group ${group.id} forbids reusing ${option.id}`);
    targets.set(key, entry.questionId);
  }

  const ordered = [...questions.keys()].map((questionId) => exercises.get(questionId)).filter(Boolean);
  return finish({exercises: ordered, groups: [...groups.values()]});
}

export function assertExerciseContract(input, options) {
  const result = validateExerciseContract(input, options);
  if (!result.ok) throw new ExerciseContractError(result.errors);
  return result.value;
}

/** Resolve by stable identity, not exercise-array index or the first question. */
export function getExerciseContext(prepared, questionId) {
  const entry = prepared.exercises.find((exercise) => exercise.questionId === questionId);
  if (!entry) throw new ExerciseContractError([{code: 'UNKNOWN_EXERCISE', path: 'questionId', message: `unknown question ${questionId}`}]);
  const group = entry.groupId === null ? null : prepared.groups.find((candidate) => candidate.id === entry.groupId);
  if (entry.groupId !== null && !group) throw new ExerciseContractError([{code: 'MISSING_MATCHING_GROUP', path: 'groupId', message: `missing group ${entry.groupId}`}]);
  return {...entry, group};
}

/** Per-row summary data: a matching exercise never selects the whole lesson's layout. */
export function buildExerciseSummary(prepared) {
  return prepared.exercises.map((entry) => {
    const context = getExerciseContext(prepared, entry.questionId);
    const options = context.group?.options ?? entry.question.options;
    const option = options.find((candidate) => candidate.id === entry.answerOptionId);
    return {
      questionId: entry.questionId,
      groupId: entry.groupId,
      mode: entry.mode,
      prompt: entry.question.prompt,
      answer: option ? `${option.label} · ${option.text}` : entry.exercise.answer,
      theme: entry.exercise.theme ?? '',
      pair: context.group ? {leftQuestionId: entry.questionId, rightOptionId: entry.answerOptionId} : null,
    };
  });
}
