import {assertExerciseContract, getExerciseContext, buildExerciseSummary, validateExerciseContract} from '../../src/english-reading/model/exercise-contract.mjs';
import type {ExerciseLessonInput, PresentationMode, MatchingExerciseGroup} from '../../src/english-reading/model/exercise-contract.mjs';
import {compileExerciseTimeline, exerciseStateAtFrame} from '../../src/english-reading/runtime/exercise-timeline.mjs';

const valid: ExerciseLessonInput = {
  version: 1,
  source: {questions: [{id: 'Q1', type: 'short-answer', prompt: 'Why?', options: []}]},
  exerciseLessons: [{questionId: 'Q1', answer: 'A reason.', presentationMode: 'short-answer'}],
};
const group: MatchingExerciseGroup = {id: 'g1', kind: 'matching', questionIds: ['Q1'], options: [{id: 'item1', label: 'A', text: 'Item'}], allowReuse: false};
const mode: PresentationMode = 'left-right-connect';
// @ts-expect-error: an unimplemented renderer must not be accepted as a mode.
const unknownMode: PresentationMode = 'inline-cloze';
// @ts-expect-error: reuse policy is a boolean, not a string.
const invalidGroup: MatchingExerciseGroup = {...group, allowReuse: 'yes'};
const result = validateExerciseContract(valid);
if (result.ok) {
  const presentation: PresentationMode = result.value.exercises[0].mode;
  const summary: string = buildExerciseSummary(result.value)[0].answer;
  const context = getExerciseContext(result.value, 'Q1');
  if (context.group) {
    const groupId: string = context.group.id;
    void groupId;
  }
  void [presentation, summary];
} else {
  const absent: null = result.value;
  const issue: string = result.errors[0].code;
  void [absent, issue];
}
const prepared = assertExerciseContract(valid);
void [prepared, group, mode, unknownMode, invalidGroup];
// The loader boundary intentionally accepts unknown JSON; consumers get typed plans.
const plan = compileExerciseTimeline({});
const state = exerciseStateAtFrame(plan, 0);
if (state.active) {
  const phase: 'question' | 'answer' | 'evidence' = state.active.phase;
  const id: string = state.active.questionId;
  void [phase, id];
}
