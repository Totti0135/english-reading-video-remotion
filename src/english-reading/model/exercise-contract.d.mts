export type PresentationMode = 'option-cards' | 'left-right-connect' | 'short-answer';
export type SupportedQuestionType = 'multiple-choice' | 'single-choice' | 'true-false' | 'matching' | 'short-answer' | 'fill-blank';
export interface ContractIssue { code: string; path: string; message: string }
export interface SourceOption { id?: string; label: string; text: string }
export interface SourceQuestion { id: string; type: SupportedQuestionType; prompt: string; options: SourceOption[] }
export interface ExerciseLesson {
  questionId: string;
  answer: string;
  presentationMode?: PresentationMode;
  groupId?: string;
  theme?: string;
  explanation?: string;
  evidenceParagraphId?: string;
  evidenceHighlights?: string[];
  mapping?: {left: string; right: string};
}
export interface MatchingExerciseGroup {
  id: string;
  kind: 'matching';
  title?: string;
  questionIds: string[];
  options: SourceOption[];
  allowReuse?: boolean;
}
export interface ExerciseLessonInput {
  version?: 1;
  source: {
    questions: SourceQuestion[];
    articleParagraphs?: {id: string; text: string}[];
  };
  exerciseLessons: ExerciseLesson[];
  exerciseGroups?: MatchingExerciseGroup[];
}
export interface ResolvedOption { id: string; label: string; text: string }
export interface ResolvedGroup {
  id: string;
  kind: 'matching';
  title: string;
  questionIds: string[];
  options: ResolvedOption[];
  allowReuse: boolean;
  legacy: boolean;
}
export interface ResolvedExercise {
  questionId: string;
  question: Omit<SourceQuestion, 'options'> & {options: ResolvedOption[]};
  exercise: ExerciseLesson;
  mode: PresentationMode;
  groupId: string | null;
  answerOptionId: string | null;
}
export interface PreparedExercises { exercises: ResolvedExercise[]; groups: ResolvedGroup[] }
export type ContractResult<T> =
  | {ok: true; errors: []; warnings: ContractIssue[]; value: T}
  | {ok: false; errors: ContractIssue[]; warnings: ContractIssue[]; value: null};
export const PRESENTATION_CAPABILITIES: Readonly<Record<PresentationMode, {
  readonly questionTypes: readonly SupportedQuestionType[];
  readonly phases: readonly ('question' | 'answer' | 'evidence')[];
}>>;
export class ExerciseContractError extends Error { constructor(errors: ContractIssue[]); issues: ContractIssue[] }
export function validateExerciseContract(input: unknown, options?: {requireAnswers?: boolean}): ContractResult<PreparedExercises>;
export function assertExerciseContract(input: unknown, options?: {requireAnswers?: boolean}): PreparedExercises;
export function getExerciseContext(prepared: PreparedExercises, questionId: string): ResolvedExercise & {group: ResolvedGroup | null};
export interface ExerciseSummaryRow {
  questionId: string;
  groupId: string | null;
  mode: PresentationMode;
  prompt: string;
  answer: string;
  theme: string;
  pair: {leftQuestionId: string; rightOptionId: string | null} | null;
}
export function buildExerciseSummary(prepared: PreparedExercises): ExerciseSummaryRow[];
