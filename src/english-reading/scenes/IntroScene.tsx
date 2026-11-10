// Opening segment: title card -> task overview -> structure overview.

import React from 'react';
import {useCurrentFrame} from 'remotion';
import {activeCueAt} from '../cueState';
import {BookDoodle, HandArrow, PlateDoodle, StarDoodle, WavyUnderline} from '../components/doodles';
import {PaperPanel} from '../components/PaperPanel';
import {fitFontSize} from '../textFit';
import {handdrawnV1} from '../visual-profiles/handdrawn-v1';
import type {LessonSpec, TimelineSegment} from '../types';
import {SentenceScene} from './SentenceScene';

const {colors, fonts, layout} = handdrawnV1;

interface IntroSceneProps {
  segment: TimelineSegment;
  lesson: LessonSpec;
}

const StageHeader: React.FC<{label: string}> = ({label}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 18, marginBottom: 26}}>
    <div
      style={{
        fontFamily: fonts.chinese,
        fontSize: 40,
        fontWeight: 700,
        color: colors.card,
        background: colors.ink,
        borderRadius: 14,
        padding: '8px 26px',
        letterSpacing: 4,
      }}
    >
      {label}
    </div>
    <div style={{flex: 1, height: 2, background: colors.line, borderRadius: 2}} />
  </div>
);

export const IntroScene: React.FC<IntroSceneProps> = ({segment, lesson}) => {
  const frame = useCurrentFrame();
  const cue = activeCueAt(segment.cues, frame);
  const stage = cue?.kind ?? 'title-card';

  if (stage === 'sentence' || stage === 'teaching-panel' || stage === 'translation') {
    return <SentenceScene segment={segment} lesson={lesson} title={lesson.title} />;
  }

  const titleSize = fitFontSize({
    text: lesson.title,
    fontFamily: fonts.display,
    fontWeight: 600,
    maxWidth: 1300,
    maxHeight: 150,
    minSize: 56,
    maxSize: 116,
  });

  if (stage === 'title-card') {
    // Opening-frame rule: the lesson title is fully visible on frame 0;
    // only supporting doodles animate in afterwards.
    // Title-card decor is lesson-chosen: a neutral book by default, an
    // opt-in themed doodle (e.g. a plate) via introPanels.decorDoodle.
    const Decor =
      lesson.introPanels?.decorDoodle === 'plate' ? PlateDoodle : BookDoodle;
    return (
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 34,
        }}
      >
        <div
          style={{
            fontFamily: fonts.chinese,
            fontSize: 30,
            letterSpacing: 10,
            color: colors.chalk,
          }}
        >
          {lesson.grade} · 英语精读
        </div>
        <div style={{display: 'flex', alignItems: 'center', gap: 48}}>
          <Decor size={180} />
          <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20}}>
            <div
              style={{
                fontFamily: fonts.display,
                fontSize: titleSize,
                fontWeight: 600,
                color: colors.ink,
                lineHeight: 1.1,
                textAlign: 'center',
              }}
            >
              {lesson.title}
            </div>
            <WavyUnderline width={Math.min(720, titleSize * 7)} />
            {lesson.titleZh ? (
              <div style={{fontFamily: fonts.chinese, fontSize: 52, color: colors.accent, fontWeight: 600}}>
                {lesson.titleZh}
              </div>
            ) : null}
          </div>
          <Decor size={180} color={colors.accent} />
        </div>
        <StarDoodle size={30} />
      </div>
    );
  }

  if (stage === 'task-overview') {
    return (
      <div style={{position: 'absolute', inset: 0, padding: `${layout.margin}px ${layout.margin + 40}px`}}>
        <PaperPanel style={{height: '100%', display: 'flex', flexDirection: 'column', gap: 30}}>
          <StageHeader label="任务说明" />
          <div
            style={{
              fontFamily: fonts.text,
              fontSize: 34,
              lineHeight: 1.65,
              color: colors.ink,
              fontWeight: 500,
            }}
          >
            {lesson.source.instructions}
          </div>
          <div style={{display: 'flex', flexDirection: 'column', gap: 22, marginTop: 8}}>
            {(lesson.introPanels?.taskLines ?? []).map((line, index) => (
              <div key={index} style={{display: 'flex', alignItems: 'center', gap: 22}}>
                <HandArrow length={72} />
                <div
                  style={{
                    fontFamily: fonts.chinese,
                    fontSize: 40,
                    fontWeight: 600,
                    color: colors.ink,
                    background: colors.markerSoft,
                    borderRadius: 12,
                    padding: '8px 24px',
                    border: `2px solid ${colors.accent}`,
                  }}
                >
                  {line}
                </div>
              </div>
            ))}
          </div>
        </PaperPanel>
      </div>
    );
  }

  // structure-overview; fall back to plain paragraph listing when the lesson
  // ships no curated structure panel.
  const structureRows =
    lesson.introPanels?.structure ??
    lesson.source.articleParagraphs.map((paragraph) => ({
      paragraphId: paragraph.id,
      summary: paragraph.text.length > 30 ? `${paragraph.text.slice(0, 30)}…` : paragraph.text,
    }));
  return (
    <div style={{position: 'absolute', inset: 0, padding: `${layout.margin}px ${layout.margin + 40}px`}}>
      <PaperPanel style={{height: '100%', display: 'flex', flexDirection: 'column', gap: 24}}>
        <StageHeader label="文章结构" />
        <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
          {structureRows.map((row, index) => (
            <div key={row.paragraphId} style={{display: 'flex', alignItems: 'center', gap: 26}}>
              <div
                style={{
                  fontFamily: fonts.text,
                  fontSize: 34,
                  fontWeight: 700,
                  color: colors.card,
                  background: index % 2 === 0 ? colors.ink : colors.inkSoft,
                  borderRadius: 12,
                  padding: '8px 20px',
                  minWidth: 110,
                  textAlign: 'center',
                }}
              >
                {row.paragraphId}
              </div>
              <div style={{fontFamily: fonts.chinese, fontSize: 38, color: colors.ink, fontWeight: 500}}>
                {row.summary}
              </div>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            justifyContent: 'center',
          }}
        >
          <StarDoodle size={26} />
          <div style={{fontFamily: fonts.chinese, fontSize: 34, color: colors.chalk}}>
            {lesson.source.articleParagraphs.length} 个文段 ·{' '}
            {lesson.source.questions.length} 道练习 · 逐句精读讲解
          </div>
          <StarDoodle size={26} />
        </div>
      </PaperPanel>
    </div>
  );
};
