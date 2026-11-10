// Exercise segment: question -> answer reveal -> evidence dialog per question.
// The question state shows the exact stem and every printed option; the answer
// state highlights only the correct option; the evidence state keeps a compact
// question/answer strip above the complete source paragraph with exact highlights.

import React from 'react';
import {interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {activeCueAt} from '../cueState';
import {CheckBadge, HandArrow, StarDoodle} from '../components/doodles';
import {HighlightedText} from '../components/HighlightedText';
import {PaperPanel} from '../components/PaperPanel';
import {SummaryScene} from './SummaryScene';
import {fitFontSize} from '../textFit';
import {handdrawnV1} from '../visual-profiles/handdrawn-v1';
import type {ExerciseLesson, LessonSpec, SourceQuestion, TimelineSegment} from '../types';

const {colors, fonts, layout} = handdrawnV1;

interface QuestionsSceneProps {
  segment: TimelineSegment;
  lesson: LessonSpec;
  title: string;
}

type ExerciseState = 'question' | 'answer' | 'evidence';

interface ActiveExercise {
  question: SourceQuestion;
  exercise: ExerciseLesson;
  index: number;
  state: ExerciseState;
  cueFrame: number;
}

const findActiveExercise = (lesson: LessonSpec, refId: string | undefined): number =>
  lesson.source.questions.findIndex((question) => question.id === refId);

const SectionHeader: React.FC<{title: string; total: number; current: number | null}> = ({
  title,
  total,
  current,
}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 24, height: 56}}>
    <div
      style={{
        fontFamily: fonts.chinese,
        fontSize: 32,
        fontWeight: 700,
        color: colors.card,
        background: colors.accent,
        borderRadius: 12,
        padding: '6px 24px',
        letterSpacing: 4,
      }}
    >
      题目讲解
    </div>
    <div style={{fontFamily: fonts.display, fontSize: 28, fontWeight: 600, color: colors.ink}}>{title}</div>
    <div style={{flex: 1, height: 2, background: colors.line}} />
    <div style={{display: 'flex', gap: 12, alignItems: 'center'}}>
      {Array.from({length: total}, (_, index) => (
        <div
          key={index}
          style={{
            width: current === null ? 16 : 22,
            height: current === null ? 16 : 22,
            borderRadius: '50%',
            border: `2.5px solid ${index === current ? colors.accent : colors.line}`,
            background: index === current ? colors.marker : index < (current ?? 0) ? colors.inkSoft : 'transparent',
          }}
        />
      ))}
    </div>
  </div>
);

const StemPanel: React.FC<{question: SourceQuestion; index: number}> = ({question, index}) => {
  const stemSize = fitFontSize({
    text: question.prompt,
    fontFamily: fonts.text,
    fontWeight: 500,
    maxWidth: 1120,
    maxHeight: 170,
    minSize: 24,
    maxSize: 34,
  });
  return (
    <PaperPanel style={{flex: 1, minHeight: 208, display: 'flex', gap: 24, alignItems: 'center'}}>
      <div
        style={{
          fontFamily: fonts.text,
          fontSize: 40,
          fontWeight: 700,
          color: colors.card,
          background: colors.ink,
          borderRadius: 12,
          padding: '8px 22px',
        }}
      >
        {index + 1}
      </div>
      <div style={{fontFamily: fonts.text, fontSize: stemSize, lineHeight: 1.55, color: colors.ink, fontWeight: 500}}>
        {question.prompt}
      </div>
    </PaperPanel>
  );
};

const AnswerPanel: React.FC<{exercise: ExerciseLesson; questionIndex: number}> = ({
  exercise,
  questionIndex,
}) => {
  const size = fitFontSize({
    text: exercise.explanation,
    fontFamily: fonts.chinese,
    fontWeight: 500,
    maxWidth: 560,
    maxHeight: 150,
    minSize: 20,
    maxSize: 28,
  });
  return (
    <PaperPanel
      key={`answer-${exercise.questionId}`}
      style={{
        width: 640,
        minHeight: 208,
        background: colors.markerSoft,
        borderColor: colors.accent,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 16}}>
        <div
          style={{
            fontFamily: fonts.chinese,
            fontSize: 30,
            fontWeight: 700,
            color: colors.card,
            background: colors.accent,
            borderRadius: 10,
            padding: '4px 18px',
          }}
        >
          第 {questionIndex + 1} 题答案
        </div>
        <div style={{fontFamily: fonts.display, fontSize: 54, fontWeight: 700, color: colors.accent}}>
          {exercise.answer}
        </div>
        <CheckBadge size={40} />
      </div>
      <div style={{fontFamily: fonts.chinese, fontSize: 24, color: colors.accent, fontWeight: 600}}>
        {exercise.theme}
      </div>
      <div style={{fontFamily: fonts.chinese, fontSize: size, lineHeight: 1.55, color: colors.ink}}>
        {exercise.explanation}
      </div>
    </PaperPanel>
  );
};

// short-answer question state: open questions have no printed options, so the
// neutral state is a worksheet-style ruled writing area with no answer content.
const ShortAnswerThinkCard: React.FC<{questionIndex: number}> = ({questionIndex}) => (
  <PaperPanel style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 22, padding: '32px 44px'}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
      <div
        style={{
          fontFamily: fonts.chinese,
          fontSize: 30,
          fontWeight: 700,
          color: colors.card,
          background: colors.ink,
          borderRadius: 10,
          padding: '6px 20px',
          flexShrink: 0,
        }}
      >
        作答区
      </div>
      <div style={{fontFamily: fonts.chinese, fontSize: 28, color: colors.chalk}}>
        第 {questionIndex + 1} 题是开放问答题 · 先自己想，用完整英语句子作答
      </div>
      <div style={{marginLeft: 'auto', flexShrink: 0}}>
        <HandArrow length={72} />
      </div>
    </div>
    {[0, 1, 2].map((line) => (
      <div key={line} style={{flex: 1, borderBottom: `3px dashed ${colors.line}`}} />
    ))}
  </PaperPanel>
);

// short-answer answer state: the English model-answer sentence is the reveal,
// so it gets marker highlight styling plus the theme and Chinese explanation.
const ShortAnswerCard: React.FC<{
  exercise: ExerciseLesson;
  questionIndex: number;
  since: number;
}> = ({exercise, questionIndex, since}) => {
  const {fps} = useVideoConfig();
  const pop = spring({frame: since, fps, config: {damping: 14, stiffness: 160, mass: 0.6}});
  const answerSize = fitFontSize({
    text: exercise.answer,
    fontFamily: fonts.text,
    fontWeight: 600,
    maxWidth: 1560,
    maxHeight: 180,
    minSize: 28,
    maxSize: 44,
  });
  const explanationSize = fitFontSize({
    text: exercise.explanation,
    fontFamily: fonts.chinese,
    fontWeight: 500,
    maxWidth: 1560,
    maxHeight: 110,
    minSize: 20,
    maxSize: 28,
  });
  return (
    <PaperPanel
      key={`short-answer-${exercise.questionId}`}
      style={{
        flex: 1,
        background: colors.markerSoft,
        borderColor: colors.accent,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 24,
        padding: '30px 44px',
        transform: `scale(${interpolate(pop, [0, 1], [0.985, 1])})`,
        boxShadow: '5px 6px 0 rgba(212, 72, 48, 0.22)',
      }}
    >
      <div style={{display: 'flex', alignItems: 'center', gap: 18}}>
        <div
          style={{
            fontFamily: fonts.chinese,
            fontSize: 30,
            fontWeight: 700,
            color: colors.card,
            background: colors.accent,
            borderRadius: 10,
            padding: '6px 20px',
            flexShrink: 0,
          }}
        >
          第 {questionIndex + 1} 题参考答案
        </div>
        <div style={{fontFamily: fonts.chinese, fontSize: 28, fontWeight: 600, color: colors.accent}}>
          {exercise.theme}
        </div>
        <div style={{marginLeft: 'auto', flexShrink: 0}}>
          <CheckBadge size={44} />
        </div>
      </div>
      <div style={{fontFamily: fonts.text, fontSize: answerSize, lineHeight: 1.5, color: colors.ink, fontWeight: 600}}>
        {exercise.answer}
      </div>
      <div style={{fontFamily: fonts.chinese, fontSize: explanationSize, lineHeight: 1.55, color: colors.ink}}>
        {exercise.explanation}
      </div>
    </PaperPanel>
  );
};

// short-answer evidence state keeps a compact strip above the paragraph dialog;
// the model sentence is fitted instead of shown as a short label badge.
const ShortAnswerEvidenceStrip: React.FC<{exercise: ExerciseLesson; questionIndex: number}> = ({
  exercise,
  questionIndex,
}) => {
  const size = fitFontSize({
    text: exercise.answer,
    fontFamily: fonts.text,
    fontWeight: 600,
    maxWidth: 1040,
    maxHeight: 108,
    minSize: 18,
    maxSize: 30,
  });
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 20,
        background: colors.card,
        border: `2.5px solid ${colors.ink}`,
        borderRadius: 14,
        padding: '12px 24px',
      }}
    >
      <div style={{fontFamily: fonts.chinese, fontSize: 30, fontWeight: 700, color: colors.ink, flexShrink: 0}}>
        第 {questionIndex + 1} 题
      </div>
      <div
        style={{
          fontFamily: fonts.chinese,
          fontSize: 25,
          fontWeight: 700,
          color: colors.card,
          background: colors.accent,
          borderRadius: 8,
          padding: '4px 14px',
          flexShrink: 0,
        }}
      >
        参考答案
      </div>
      <div style={{fontFamily: fonts.text, fontSize: size, lineHeight: 1.4, color: colors.ink, fontWeight: 600}}>
        {exercise.answer}
      </div>
      <div style={{fontFamily: fonts.chinese, fontSize: 25, color: colors.chalk, flexShrink: 0}}>
        回到原文核对
      </div>
    </div>
  );
};

const OptionRow: React.FC<{
  option: {label: string; text: string};
  correct: boolean;
  revealed: boolean;
  since: number;
}> = ({option, correct, revealed, since}) => {
  const {fps} = useVideoConfig();
  const pop = correct && revealed
    ? spring({frame: since, fps, config: {damping: 14, stiffness: 160, mass: 0.6}})
    : 1;
  const optionSize = fitFontSize({
    text: option.text,
    fontFamily: fonts.text,
    fontWeight: 500,
    maxWidth: 700,
    maxHeight: 118,
    minSize: 20,
    maxSize: 28,
  });
  return (
    <div
      style={{
        display: 'flex',
        gap: 18,
        alignItems: 'center',
        background: correct && revealed ? colors.markerSoft : colors.card,
        border: `${correct && revealed ? 3.5 : 2.5}px solid ${correct && revealed ? colors.accent : colors.line}`,
        borderRadius: 14,
        padding: '16px 20px',
        opacity: revealed && !correct ? 0.78 : 1,
        transform: correct && revealed ? `scale(${interpolate(pop, [0, 1], [0.97, 1])})` : undefined,
        boxShadow: correct && revealed ? `5px 6px 0 rgba(212, 72, 48, 0.22)` : undefined,
      }}
    >
      <div
        style={{
          fontFamily: fonts.display,
          fontSize: 36,
          fontWeight: 700,
          color: correct && revealed ? colors.card : colors.ink,
          background: correct && revealed ? colors.accent : colors.paperShade,
          border: `2px solid ${correct && revealed ? colors.accent : colors.line}`,
          borderRadius: 10,
          width: 58,
          height: 58,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {option.label}
      </div>
      <div style={{fontFamily: fonts.text, fontSize: optionSize, lineHeight: 1.45, color: colors.ink, fontWeight: 500}}>
        {option.text}
      </div>
      {correct && revealed ? (
        <div style={{marginLeft: 'auto', flexShrink: 0}}>
          <CheckBadge size={46} />
        </div>
      ) : null}
    </div>
  );
};

const MatchingBoard: React.FC<{
  lesson: LessonSpec;
  currentIndex: number;
  revealed: boolean;
  since: number;
}> = ({lesson, currentIndex, revealed, since}) => {
  const {fps} = useVideoConfig();
  const questions = lesson.source.questions;
  const options = questions[0]?.options ?? [];
  const mappings = lesson.exerciseLessons.map((exercise) => exercise.mapping);
  const boardWidth = 1736;
  const boardHeight = 760;
  const leftWidth = 690;
  const rightWidth = 690;
  const rightX = boardWidth - rightWidth;
  const lineStartX = leftWidth + 12;
  const lineEndX = rightX - 12;
  const currentPop = spring({frame: since, fps, config: {damping: 16, stiffness: 150, mass: 0.65}});
  const visibleThrough = revealed ? currentIndex : currentIndex - 1;

  return (
    <div style={{position: 'relative', width: boardWidth, height: boardHeight}}>
      <svg width={boardWidth} height={boardHeight} style={{position: 'absolute', inset: 0, overflow: 'visible', zIndex: 1}}>
        {mappings.map((mapping, index) => {
          if (!mapping || index > visibleThrough) return null;
          const rightIndex = options.findIndex((option) => option.label === mapping.right);
          if (rightIndex < 0) return null;
          const current = index === currentIndex;
          const y1 = (index + 0.5) * (boardHeight / Math.max(1, questions.length));
          const y2 = (rightIndex + 0.5) * (boardHeight / Math.max(1, options.length));
          const draw = current ? interpolate(currentPop, [0, 1], [0, 1]) : 1;
          const control = (lineStartX + lineEndX) / 2;
          return (
            <path
              key={`${mapping.left}-${mapping.right}`}
              d={`M ${lineStartX} ${y1} C ${control} ${y1}, ${control} ${y2}, ${lineEndX} ${y2}`}
              fill="none"
              stroke={current ? colors.accent : colors.inkSoft}
              strokeWidth={current ? 8 : 5}
              strokeLinecap="round"
              strokeDasharray="18 12"
              pathLength={1}
              strokeDashoffset={1 - draw}
              opacity={current ? 1 : 0.32}
            />
          );
        })}
      </svg>

      <div style={{position: 'absolute', inset: 0, display: 'grid', gridTemplateColumns: `${leftWidth}px ${rightWidth}px`, justifyContent: 'space-between', zIndex: 2}}>
        <div style={{display: 'grid', gridTemplateRows: `repeat(${Math.max(1, questions.length)}, 1fr)`, gap: 10}}>
          {questions.map((question, index) => {
            const mapped = index <= visibleThrough;
            const current = index === currentIndex;
            const text = question.prompt.replace(/^\d+\.\s*____\s*/, '');
            const size = fitFontSize({text, fontFamily: fonts.display, fontWeight: 500, maxWidth: 570, maxHeight: 112, minSize: 17, maxSize: 24});
            return (
              <div key={question.id} style={{display: 'flex', gap: 14, alignItems: 'center', padding: '10px 16px', borderRadius: 14, border: `${current && revealed ? 3.5 : 2.5}px solid ${current && revealed ? colors.accent : colors.ink}`, background: current && revealed ? colors.markerSoft : colors.card, opacity: mapped && !current ? 0.68 : 1, boxShadow: current && revealed ? `5px 6px 0 rgba(212,72,48,.2)` : undefined}}>
                <div style={{width: 52, height: 52, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.display, fontSize: 30, fontWeight: 700, color: current && revealed ? colors.card : colors.ink, background: current && revealed ? colors.accent : colors.paperShade, border: `2px solid ${current && revealed ? colors.accent : colors.ink}`}}>{index + 1}</div>
                <div style={{fontFamily: fonts.display, fontSize: size, fontWeight: 500, lineHeight: 1.3, color: colors.ink}}>{text}</div>
              </div>
            );
          })}
        </div>
        <div style={{display: 'grid', gridTemplateRows: `repeat(${Math.max(1, options.length)}, 1fr)`, gap: 10}}>
          {options.map((option, optionIndex) => {
            const linkedIndex = mappings.findIndex((mapping, index) => index <= visibleThrough && mapping?.right === option.label);
            const current = linkedIndex === currentIndex;
            const mapped = linkedIndex >= 0;
            const size = fitFontSize({text: option.text, fontFamily: fonts.display, fontWeight: 500, maxWidth: 570, maxHeight: 88, minSize: 17, maxSize: 23});
            return (
              <div key={option.label} style={{display: 'flex', gap: 14, alignItems: 'center', padding: '8px 14px', borderRadius: 14, border: `${current ? 3.5 : 2.5}px solid ${current ? colors.accent : colors.ink}`, background: current ? colors.markerSoft : colors.card, opacity: mapped && !current ? 0.68 : 1, boxShadow: current ? `5px 6px 0 rgba(212,72,48,.2)` : undefined}}>
                <div style={{width: 50, height: 50, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: fonts.display, fontSize: 29, fontWeight: 700, color: current ? colors.card : colors.ink, background: current ? colors.accent : colors.paperShade, border: `2px solid ${current ? colors.accent : colors.ink}`}}>{option.label}</div>
                <div style={{fontFamily: fonts.display, fontSize: size, fontWeight: 500, lineHeight: 1.25, color: colors.ink}}>{option.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const MatchingEvidence: React.FC<{
  exercise: ExerciseLesson;
  questionIndex: number;
  paragraphText: string;
  since: number;
}> = ({exercise, questionIndex, paragraphText, since}) => (
  <div style={{display: 'flex', flexDirection: 'column', flex: 1, gap: 20}}>
    <div style={{display: 'flex', alignItems: 'center', gap: 18, background: colors.card, border: `2.5px solid ${colors.ink}`, borderRadius: 14, padding: '12px 22px'}}>
      <div style={{fontFamily: fonts.chinese, fontSize: 30, fontWeight: 700, color: colors.ink}}>第 {questionIndex + 1} 条连线</div>
      <div style={{fontFamily: fonts.display, fontSize: 40, fontWeight: 700, color: colors.card, background: colors.accent, borderRadius: 10, padding: '2px 18px'}}>{exercise.mapping?.left} → {exercise.mapping?.right}</div>
      <div style={{fontFamily: fonts.chinese, fontSize: 28, color: colors.ink, fontWeight: 600}}>{exercise.theme}</div>
      <div style={{marginLeft: 'auto', fontFamily: fonts.chinese, fontSize: 25, color: colors.chalk}}>回到完整原文核对</div>
    </div>
    <EvidenceDialog exercise={exercise} paragraphText={paragraphText} since={since} />
  </div>
);

const EvidenceDialog: React.FC<{exercise: ExerciseLesson; paragraphText: string; since: number}> = ({
  exercise,
  paragraphText,
  since,
}) => {
  const {fps} = useVideoConfig();
  const entrance = spring({
    frame: since,
    fps,
    config: {damping: 200, stiffness: 90, mass: 1},
  });
  return (
    <div
      style={{
        flex: 1,
        opacity: interpolate(entrance, [0, 1], [0, 1]),
        transform: `translateY(${interpolate(entrance, [0, 1], [70, 0])}px) scale(${interpolate(entrance, [0, 1], [0.94, 1])})`,
      }}
    >
      <PaperPanel style={{height: '100%', display: 'flex', flexDirection: 'column', gap: 24, padding: 40}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 20}}>
          <div
            style={{
              fontFamily: fonts.chinese,
              fontSize: 30,
              fontWeight: 700,
              color: colors.card,
              background: colors.ink,
              borderRadius: 10,
              padding: '6px 20px',
            }}
          >
            原文 {exercise.evidenceParagraphId}
          </div>
          <div style={{fontFamily: fonts.chinese, fontSize: 28, color: colors.chalk}}>
            依据句已用黄色标出
          </div>
        </div>
        <HighlightedText
          text={paragraphText}
          highlights={exercise.evidenceHighlights}
          maxWidth={1600}
          maxHeight={420}
          minSize={26}
          maxSize={42}
        />
      </PaperPanel>
    </div>
  );
};

export const QuestionsScene: React.FC<QuestionsSceneProps> = ({segment, lesson, title}) => {
  const frame = useCurrentFrame();
  const summaryCue = activeCueAt(segment.cues, frame, ['summary-card']);
  if (summaryCue) {
    return <SummaryScene lesson={lesson} title={title} since={frame - summaryCue.startFrame} />;
  }
  const cue = activeCueAt(segment.cues, frame, ['question', 'answer', 'answer-reveal', 'evidence-dialog']);
  const questions = lesson.source.questions;

  if (!cue) {
    return (
      <div style={{position: 'absolute', inset: 0, padding: `${layout.margin - 12}px ${layout.margin}px`}}>
        <SectionHeader title={title} total={questions.length} current={null} />
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 36,
            paddingBottom: 60,
          }}
        >
          <StarDoodle size={44} />
          <div style={{fontFamily: fonts.chinese, fontSize: 64, fontWeight: 700, color: colors.ink}}>
            文章学完 · 进入题目讲解
          </div>
          <HandArrow length={140} />
        </div>
      </div>
    );
  }

  const questionIndex = findActiveExercise(lesson, cue.refId);
  if (questionIndex < 0 || questions.length === 0) {
    return (
      <div style={{position: 'absolute', inset: 0, padding: `${layout.margin - 12}px ${layout.margin}px`}}>
        <SectionHeader title={title} total={questions.length} current={null} />
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 36,
            paddingBottom: 60,
          }}
        >
          <StarDoodle size={44} />
          <div style={{fontFamily: fonts.chinese, fontSize: 64, fontWeight: 700, color: colors.ink}}>
            文章学完 · 进入题目讲解
          </div>
          <HandArrow length={140} />
        </div>
      </div>
    );
  }
  const question = questions[questionIndex];
  const exercise = lesson.exerciseLessons.find((entry) => entry.questionId === cue.refId);
  if (!exercise) {
    // Cue references a question with no exercise lesson; show a neutral
    // placeholder instead of falling back to an unrelated exercise.
    return (
      <div style={{position: 'absolute', inset: 0, padding: `${layout.margin - 12}px ${layout.margin}px`}}>
        <SectionHeader title={title} total={questions.length} current={questionIndex} />
        <div
          style={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 36,
            paddingBottom: 60,
          }}
        >
          <StarDoodle size={44} />
          <div style={{fontFamily: fonts.chinese, fontSize: 56, fontWeight: 700, color: colors.ink}}>
            本题讲解内容缺失
          </div>
          <HandArrow length={140} />
        </div>
      </div>
    );
  }
  const state: ExerciseState =
    cue.kind === 'question' ? 'question' : cue.kind === 'evidence-dialog' ? 'evidence' : 'answer';
  const revealed = state !== 'question';
  const paragraph =
    state === 'evidence'
      ? lesson.source.articleParagraphs.find((entry) => entry.id === exercise.evidenceParagraphId)
      : undefined;

  if (exercise.presentationMode === 'left-right-connect') {
    return (
      <div style={{position: 'absolute', inset: 0, padding: `${layout.margin - 12}px ${layout.margin}px`, display: 'flex', flexDirection: 'column', gap: 18}}>
        <SectionHeader title={title} total={questions.length} current={questionIndex} />
        {state === 'evidence' ? (
          <MatchingEvidence
            exercise={exercise}
            questionIndex={questionIndex}
            paragraphText={paragraph?.text ?? ''}
            since={frame - cue.startFrame}
          />
        ) : (
          <>
            <div style={{display: 'flex', alignItems: 'center', gap: 18, fontFamily: fonts.chinese, fontSize: 28, color: colors.ink}}>
              <div style={{fontWeight: 700, color: colors.card, background: revealed ? colors.accent : colors.ink, borderRadius: 10, padding: '5px 18px'}}>
                {revealed ? `答案：${exercise.mapping?.left} → ${exercise.mapping?.right}` : `第 ${questionIndex + 1} 条：先判断，不连线`}
              </div>
              <div style={{color: colors.chalk}}>
                已完成连线降低亮度保留；当前答案公布后才新增连线
              </div>
            </div>
            <MatchingBoard lesson={lesson} currentIndex={questionIndex} revealed={revealed} since={frame - cue.startFrame} />
          </>
        )}
      </div>
    );
  }

  if (exercise.presentationMode === 'short-answer') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${layout.margin - 12}px ${layout.margin}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
        }}
      >
        <SectionHeader title={title} total={questions.length} current={questionIndex} />
        {state === 'evidence' ? (
          <>
            <ShortAnswerEvidenceStrip exercise={exercise} questionIndex={questionIndex} />
            <EvidenceDialog
              exercise={exercise}
              paragraphText={paragraph?.text ?? ''}
              since={frame - cue.startFrame}
            />
          </>
        ) : (
          <>
            <StemPanel question={question} index={questionIndex} />
            {revealed ? (
              <ShortAnswerCard
                exercise={exercise}
                questionIndex={questionIndex}
                since={frame - cue.startFrame}
              />
            ) : (
              <ShortAnswerThinkCard questionIndex={questionIndex} />
            )}
          </>
        )}
      </div>
    );
  }

  if (state === 'evidence') {
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          padding: `${layout.margin - 12}px ${layout.margin}px`,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        <SectionHeader title={title} total={questions.length} current={questionIndex} />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 22,
            background: colors.card,
            border: `2.5px solid ${colors.ink}`,
            borderRadius: 14,
            padding: '12px 24px',
          }}
        >
          <div style={{fontFamily: fonts.chinese, fontSize: 30, fontWeight: 700, color: colors.ink}}>
            第 {questionIndex + 1} 题
          </div>
          <div
            style={{
              fontFamily: fonts.display,
              fontSize: 40,
              fontWeight: 700,
              color: colors.card,
              background: colors.accent,
              borderRadius: 10,
              padding: '2px 20px',
            }}
          >
            {exercise.answer}
          </div>
          <div style={{fontFamily: fonts.chinese, fontSize: 28, color: colors.ink, fontWeight: 600}}>
            {exercise.theme}
          </div>
          <div style={{flex: 1}} />
          <div style={{fontFamily: fonts.chinese, fontSize: 26, color: colors.chalk}}>
            题干与选项已讲解 · 下面回到原文核对
          </div>
        </div>
        <EvidenceDialog
          exercise={exercise}
          paragraphText={paragraph?.text ?? ''}
          since={frame - cue.startFrame}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: `${layout.margin - 12}px ${layout.margin}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
      }}
    >
      <SectionHeader title={title} total={questions.length} current={questionIndex} />
      <div style={{display: 'flex', gap: 20, alignItems: 'stretch'}}>
        <StemPanel question={question} index={questionIndex} />
        {revealed ? (
          <AnswerPanel exercise={exercise} questionIndex={questionIndex} />
        ) : (
          <div
            style={{
              width: 640,
              minHeight: 208,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 14,
              border: `2.5px dashed ${colors.line}`,
              borderRadius: layout.radius,
              fontFamily: fonts.chinese,
              fontSize: 30,
              color: colors.chalk,
            }}
          >
            <HandArrow length={64} />
            先读题和全部选项 · 稍后揭晓答案
          </div>
        )}
      </div>
      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridAutoRows: '1fr',
          gap: 16,
        }}
      >
        {question.options.map((option) => (
          <OptionRow
            key={option.label}
            option={option}
            correct={option.label === exercise.answer}
            revealed={revealed}
            since={frame - cue.startFrame}
          />
        ))}
      </div>
    </div>
  );
};
