// Shared types for the generic English reading lesson renderer.
// The renderer is lesson-agnostic: all visible lesson content arrives via
// remotion-props.json and must never be hardcoded in scene components.

export type CueKind =
  | 'title-card'
  | 'task-overview'
  | 'structure-overview'
  | 'person-card'
  | 'people-complete'
  | 'poster-board'
  | 'question-neutral'
  | 'sentence'
  | 'teaching-panel'
  | 'translation'
  | 'question'
  | 'answer'
  | 'answer-reveal'
  | 'evidence-dialog'
  | 'summary-card';

export interface TimedCue {
  id: string;
  kind: CueKind;
  refId: string;
  matchText: string;
  startMs: number;
  startFrame: number;
  matchMethod: string;
}

export type SegmentKind =
  | 'reading-intro'
  | 'reading-paragraph'
  | 'reading-options'
  | 'reading-question'
  | 'reading-questions'
  | 'reading-summary';

export interface TimelineSegment {
  id: string;
  kind: SegmentKind;
  startFrame: number;
  endFrame: number;
  durationFrames: number;
  durationMs: number;
  audioDurationMs: number;
  audioSrc: string;
  cues: TimedCue[];
}

export interface ArticleParagraph {
  id: string;
  text: string;
}

export interface WordPowerEntry {
  term: string;
  partOfSpeech: string;
  meaning: string;
}

export interface LanguageTip {
  id: string;
  pattern: string;
  meaning: string;
  example: string;
}

export interface QuestionOption {
  label: string;
  text: string;
}

export interface SourceQuestion {
  id: string;
  type: string;
  prompt: string;
  options: QuestionOption[];
  suppliedAnswer: string;
  suppliedExplanation: string;
  suppliedEvidenceParagraphId: string;
  suppliedHighlight: string;
}

export interface SentenceLesson {
  id: string;
  paragraphId: string;
  sourceText: string;
  translation: string;
  grammarPoints: string[];
  fixedPhrases: string[];
  newWords: string[];
  narrationText: string;
}

export interface ExerciseLesson {
  questionId: string;
  answer: string;
  theme: string;
  explanation: string;
  evidenceParagraphId: string;
  evidenceHighlights: string[];
  narrationText: string;
  presentationMode?: 'option-cards' | 'left-right-connect' | 'short-answer';
  presentationNotes?: string;
  mapping?: {left: string; right: string};
}

export interface IntroPanels {
  taskLines: string[];
  structure: {paragraphId: string; summary: string}[];
  /** Title-card decoration; defaults to the neutral book doodle. */
  decorDoodle?: 'book' | 'plate';
}

export interface LessonSpec {
  slug: string;
  title: string;
  titleZh?: string;
  grade: string;
  fps: number;
  openingFrame?: {
    startFrame: number;
    requiredVisibleText: string;
    mode: string;
    animationRule: string;
  };
  source: {
    articleParagraphs: ArticleParagraph[];
    wordPower: WordPowerEntry[];
    languageTips: LanguageTip[];
    questions: SourceQuestion[];
    notes: string;
    instructions?: string;
  };
  sentenceLessons: SentenceLesson[];
  exerciseLessons: ExerciseLesson[];
  deliveryMode?: string;
  introPanels?: IntroPanels;
}

// Type alias (not interface) so Remotion's Record<string, unknown> constraint
// for composition props is satisfied via the implicit index signature.
export type EnglishReadingProps = {
  version: number;
  slug: string;
  title: string;
  fps: number;
  width: number;
  height: number;
  durationInFrames: number;
  visualProfile: {id: string};
  lesson: LessonSpec;
  timeline: {segments: TimelineSegment[]};
};
