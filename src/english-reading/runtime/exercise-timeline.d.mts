import type {ContractResult, PreparedExercises} from '../model/exercise-contract.mjs';
export type CueKind = 'title-card' | 'task-overview' | 'structure-overview' | 'person-card' | 'people-complete' | 'poster-board' | 'question-neutral' | 'sentence' | 'teaching-panel' | 'translation' | 'question' | 'answer' | 'answer-reveal' | 'evidence-dialog' | 'summary-card';
export interface TimelineEvent {
  id: string;
  kind: CueKind;
  refId: string;
  frame: number;
  localFrame: number;
  segmentId: string;
  path: string;
}
export interface ExerciseTimeline {
  prepared: PreparedExercises;
  events: TimelineEvent[];
  segments: {id: string; startFrame: number; endFrame: number}[];
  durationInFrames: number;
}
export interface ExerciseFrameState {
  segmentId: string;
  localFrame: number;
  active: {questionId: string; phase: 'question' | 'answer' | 'evidence'; sinceFrame: number} | null;
  latestCue: TimelineEvent | null;
  revealedQuestionIds: string[];
  revealedPairs: {groupId: string; leftQuestionId: string; rightOptionId: string | null}[];
}
export const KNOWN_CUE_KINDS: readonly CueKind[];
export function validateRenderContract(input: unknown, options?: {requireCoverage?: boolean}): ContractResult<ExerciseTimeline>;
export function compileExerciseTimeline(input: unknown, options?: {requireCoverage?: boolean}): ExerciseTimeline;
export function exerciseStateAtFrame(plan: ExerciseTimeline, frame: number): ExerciseFrameState;
