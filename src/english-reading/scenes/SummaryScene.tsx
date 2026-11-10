// Lesson closing card shown during the summary narration: a data-driven
// answer recap (one row per exercise) plus generic thanks chrome.

import React from 'react';
import {interpolate, spring, useVideoConfig} from 'remotion';
import {CheckBadge, StarDoodle} from '../components/doodles';
import {PaperPanel} from '../components/PaperPanel';
import {fitFontSize} from '../textFit';
import {handdrawnV1} from '../visual-profiles/handdrawn-v1';
import type {LessonSpec} from '../types';

const {colors, fonts, layout} = handdrawnV1;

interface SummarySceneProps {
  lesson: LessonSpec;
  title: string;
  since: number;
}

export const SummaryScene: React.FC<SummarySceneProps> = ({lesson, title, since}) => {
  const {fps} = useVideoConfig();
  const entrance = spring({frame: since, fps, config: {damping: 200, stiffness: 100, mass: 0.9}});
  const isMatching = lesson.exerciseLessons.some((exercise) => exercise.presentationMode === 'left-right-connect');
  const isShortAnswer = lesson.exerciseLessons.some(
    (exercise) => exercise.presentationMode === 'short-answer',
  );
  const options = lesson.source.questions[0]?.options ?? [];
  const usedOptions = new Set(lesson.exerciseLessons.map((exercise) => exercise.mapping?.right).filter(Boolean));
  const unusedOptions = options.filter((option) => !usedOptions.has(option.label));

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: `${layout.margin - 12}px ${layout.margin + 40}px`,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          opacity: interpolate(entrance, [0, 1], [0, 1]),
          transform: `translateY(${interpolate(entrance, [0, 1], [24, 0])}px)`,
          display: 'flex',
          flexDirection: 'column',
          gap: 26,
          height: '100%',
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 24, height: 56}}>
          <div
            style={{
              fontFamily: fonts.chinese,
              fontSize: 32,
              fontWeight: 700,
              color: colors.card,
              background: colors.ink,
              borderRadius: 12,
              padding: '6px 24px',
              letterSpacing: 4,
            }}
          >
            本课小结
          </div>
          <div style={{fontFamily: fonts.display, fontSize: 28, fontWeight: 600, color: colors.ink}}>{title}</div>
          <div style={{flex: 1, height: 2, background: colors.line}} />
        </div>
        <PaperPanel style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 20, padding: 40}}>
          {isMatching ? (
            <div style={{display: 'grid', gridTemplateColumns: '1.08fr 0.92fr', gap: 34, flex: 1}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
                <div style={{fontFamily: fonts.chinese, fontSize: 34, fontWeight: 700, color: colors.accent}}>最终连线</div>
                {lesson.exerciseLessons.map((exercise, index) => {
                  const question = lesson.source.questions.find((entry) => entry.id === exercise.questionId);
                  const option = options.find((entry) => entry.label === exercise.mapping?.right);
                  const name = question?.prompt.match(/[A-Za-z]+/)?.[0] ?? `第 ${index + 1} 题`;
                  const club = option?.text.split(':')[0] ?? exercise.theme;
                  const rowIn = spring({frame: since - 8 - index * 5, fps, config: {damping: 200, stiffness: 120, mass: 0.7}});
                  return (
                    <div key={exercise.questionId} style={{display: 'flex', alignItems: 'center', gap: 16, opacity: interpolate(rowIn, [0, 1], [0, 1]), transform: `translateX(${interpolate(rowIn, [0, 1], [-30, 0])}px)`, border: `2px solid ${colors.line}`, borderRadius: 14, padding: '12px 16px', background: colors.card}}>
                      <div style={{fontFamily: fonts.display, fontSize: 29, fontWeight: 700, color: colors.ink, minWidth: 32}}>{exercise.mapping?.left}</div>
                      <div style={{fontFamily: fonts.display, fontSize: 29, fontWeight: 700, color: colors.ink, width: 120}}>{name}</div>
                      <div style={{fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: colors.accent}}>→ {exercise.mapping?.right}</div>
                      <div style={{fontFamily: fonts.display, fontSize: 27, fontWeight: 600, color: colors.ink}}>{club}</div>
                      <CheckBadge size={30} />
                    </div>
                  );
                })}
              </div>
              <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
                <div style={{fontFamily: fonts.chinese, fontSize: 34, fontWeight: 700, color: colors.accent}}>多余选项</div>
                {unusedOptions.map((option) => (
                  <div key={option.label} style={{fontFamily: fonts.display, fontSize: 29, lineHeight: 1.4, color: colors.ink, border: `2.5px dashed ${colors.inkSoft}`, borderRadius: 14, padding: '14px 18px', background: colors.card}}>
                    <strong>{option.label}</strong> · {option.text}
                  </div>
                ))}
                <div style={{fontFamily: fonts.chinese, fontSize: 34, fontWeight: 700, color: colors.accent, marginTop: 10}}>三步定位法</div>
                {[
                  '① 逐句读懂人物的兴趣、愿望或能力',
                  '② 圈出最有区分度的定位词',
                  '③ 对照海报动作词，整组信息一致才连线',
                ].map((line) => (
                  <div key={line} style={{fontFamily: fonts.chinese, fontSize: 28, lineHeight: 1.45, color: colors.ink, background: colors.markerSoft, borderRadius: 12, padding: '12px 16px'}}>{line}</div>
                ))}
              </div>
            </div>
          ) : isShortAnswer ? (
            <div style={{display: 'flex', flexDirection: 'column', gap: 13, flex: 1, justifyContent: 'center'}}>
              {lesson.exerciseLessons.map((exercise, index) => {
                const question = lesson.source.questions.find(
                  (entry) => entry.id === exercise.questionId,
                );
                const matchedOption = question?.options.find(
                  (option) => option.label === exercise.answer,
                );
                const answerText = matchedOption
                  ? `${exercise.answer} · ${matchedOption.text}`
                  : exercise.answer;
                const rowIn = spring({
                  frame: since - 8 - index * 5,
                  fps,
                  config: {damping: 200, stiffness: 120, mass: 0.7},
                });
                const size = fitFontSize({
                  text: answerText,
                  fontFamily: fonts.text,
                  fontWeight: 600,
                  maxWidth: 1120,
                  maxHeight: 88,
                  minSize: 20,
                  maxSize: 32,
                });
                return (
                  <div
                    key={exercise.questionId}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 20,
                      opacity: interpolate(rowIn, [0, 1], [0, 1]),
                      transform: `translateX(${interpolate(rowIn, [0, 1], [-30, 0])}px)`,
                      border: `2px solid ${colors.line}`,
                      borderRadius: 14,
                      padding: '10px 20px',
                      background: colors.card,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: fonts.chinese,
                        fontSize: 28,
                        fontWeight: 700,
                        color: colors.ink,
                        border: `2.5px solid ${colors.ink}`,
                        borderRadius: 12,
                        padding: '5px 18px',
                        minWidth: 132,
                        textAlign: 'center',
                        flexShrink: 0,
                      }}
                    >
                      第 {index + 1} 题
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.text,
                        fontSize: size,
                        lineHeight: 1.35,
                        color: colors.ink,
                        fontWeight: 600,
                        flex: 1,
                      }}
                    >
                      {answerText}
                    </div>
                    <div
                      style={{
                        fontFamily: fonts.chinese,
                        fontSize: 24,
                        color: colors.chalk,
                        flexShrink: 0,
                      }}
                    >
                      {exercise.theme}
                    </div>
                    <CheckBadge size={30} />
                  </div>
                );
              })}
            </div>
          ) : lesson.exerciseLessons.map((exercise, index) => {
            const rowIn = spring({
              frame: since - 8 - index * 5,
              fps,
              config: {damping: 200, stiffness: 120, mass: 0.7},
            });
            return (
              <div
                key={exercise.questionId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 26,
                  opacity: interpolate(rowIn, [0, 1], [0, 1]),
                  transform: `translateX(${interpolate(rowIn, [0, 1], [-30, 0])}px)`,
                }}
              >
                <div
                  style={{
                    fontFamily: fonts.chinese,
                    fontSize: 30,
                    fontWeight: 700,
                    color: colors.ink,
                    border: `2.5px solid ${colors.ink}`,
                    borderRadius: 12,
                    padding: '6px 22px',
                    minWidth: 150,
                    textAlign: 'center',
                  }}
                >
                  第 {index + 1} 题
                </div>
                <div
                  style={{
                    fontFamily: fonts.display,
                    fontSize: 52,
                    fontWeight: 700,
                    color: colors.card,
                    background: colors.accent,
                    borderRadius: 12,
                    padding: '2px 24px',
                  }}
                >
                  {exercise.answer}
                </div>
                <CheckBadge size={38} />
                <div style={{fontFamily: fonts.chinese, fontSize: 32, color: colors.ink, fontWeight: 500}}>
                  {exercise.theme}
                </div>
              </div>
            );
          })}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
            }}
          >
            <StarDoodle size={28} />
            <div style={{fontFamily: fonts.chinese, fontSize: 36, color: colors.chalk, letterSpacing: 4}}>
              全部题目讲解完毕 · 感谢观看
            </div>
            <StarDoodle size={28} />
          </div>
        </PaperPanel>
      </div>
    </div>
  );
};
