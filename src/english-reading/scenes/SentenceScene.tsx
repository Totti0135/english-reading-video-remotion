// Paragraph teaching segment: sentence -> teaching panel -> translation,
// driven by the segment's ASR cues for the current sentence.

import React from 'react';
import {useCurrentFrame} from 'remotion';
import {activeCueAt} from '../cueState';
import {PaperPanel} from '../components/PaperPanel';
import {ScribbleCircle, WavyUnderline} from '../components/doodles';
import {fitFontSize} from '../textFit';
import {handdrawnV1} from '../visual-profiles/handdrawn-v1';
import type {LessonSpec, SentenceLesson, TimelineSegment} from '../types';

const {colors, fonts, layout} = handdrawnV1;

interface SentenceSceneProps {
  segment: TimelineSegment;
  lesson: LessonSpec;
  title: string;
}

type SubState = 'sentence' | 'teaching-panel' | 'translation';

const stateLabel: Record<SubState, string> = {
  'sentence': '慢速朗读',
  'teaching-panel': '重点讲解',
  'translation': '完整翻译',
};

const SentenceHeader: React.FC<{
  title: string;
  sentence: SentenceLesson;
  paragraphCount: number;
  sentenceCount: number;
  sentenceIndex: number;
}> = ({title, sentence, paragraphCount, sentenceIndex, sentenceCount}) => (
  <div style={{display: 'flex', alignItems: 'center', gap: 24, height: 60}}>
    <div style={{fontFamily: fonts.display, fontSize: 30, fontWeight: 600, color: colors.ink}}>
      {title}
    </div>
    <div style={{flex: 1, height: 2, background: colors.line}} />
    <div
      style={{
        fontFamily: fonts.text,
        fontSize: 26,
        fontWeight: 700,
        color: colors.card,
        background: colors.inkSoft,
        borderRadius: 10,
        padding: '4px 18px',
      }}
    >
      {sentence.paragraphId} · 第 {Number(sentence.paragraphId.slice(1))}/{paragraphCount} 段
    </div>
    <div
      style={{
        fontFamily: fonts.chinese,
        fontSize: 26,
        color: colors.ink,
        border: `2px solid ${colors.ink}`,
        borderRadius: 10,
        padding: '4px 18px',
      }}
    >
      第 {sentenceIndex + 1}/{sentenceCount} 句
    </div>
  </div>
);

const ExplanationZone: React.FC<{sentence: SentenceLesson; subState: SubState; since: number}> = ({
  sentence,
  subState,
  since,
}) => {
  if (subState === 'sentence') {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          opacity: since > 4 ? 1 : 0,
        }}
      >
        <ScribbleCircle size={64} />
        <div style={{fontFamily: fonts.chinese, fontSize: 38, color: colors.chalk, letterSpacing: 6}}>
          先听慢速朗读 · 稍后逐句讲解
        </div>
      </div>
    );
  }

  if (subState === 'teaching-panel') {
    return (
      <PaperPanel
        key={`${sentence.id}-teaching`}
        style={{
          flex: 1,
          display: 'flex',
          gap: 40,
          background: colors.markerSoft,
          padding: 30,
          borderColor: colors.accent,
        }}
      >
        <div style={{flex: 1, display: 'flex', flexDirection: 'column', gap: 16}}>
          <div style={{fontFamily: fonts.chinese, fontSize: 34, fontWeight: 700, color: colors.accent}}>
            重点讲解
          </div>
          {sentence.grammarPoints.map((point, index) => (
            <div
              key={index}
              style={{fontFamily: fonts.chinese, fontSize: 33, color: colors.ink, lineHeight: 1.5}}
            >
              <span style={{color: colors.accent, fontWeight: 700}}>• </span>
              {point}
            </div>
          ))}
        </div>
        <div
          style={{
            width: 460,
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            justifyContent: 'center',
          }}
        >
          {sentence.fixedPhrases.map((phrase, index) => (
            <div
              key={index}
              style={{
                fontFamily: fonts.chinese,
                fontSize: 27,
                color: colors.ink,
                background: colors.card,
                border: `2px solid ${colors.inkSoft}`,
                borderRadius: 10,
                padding: '8px 16px',
              }}
            >
              搭配 | {phrase}
            </div>
          ))}
          {sentence.newWords.map((word, index) => (
            <div
              key={index}
              style={{
                fontFamily: fonts.chinese,
                fontSize: 27,
                color: colors.ink,
                background: colors.card,
                border: `2px dashed ${colors.inkSoft}`,
                borderRadius: 10,
                padding: '8px 16px',
              }}
            >
              生词 | {word}
            </div>
          ))}
        </div>
      </PaperPanel>
    );
  }

  return (
    <PaperPanel
      key={`${sentence.id}-translation`}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        background: colors.markerSoft,
        padding: 30,
        borderColor: colors.accent,
      }}
    >
      <div style={{fontFamily: fonts.chinese, fontSize: 34, fontWeight: 700, color: colors.accent}}>
        完整翻译
      </div>
      <div style={{fontFamily: fonts.chinese, fontSize: 44, color: colors.ink, fontWeight: 600, lineHeight: 1.5}}>
        {sentence.translation}
      </div>
      <div style={{marginTop: 'auto'}}>
        <WavyUnderline width={520} color={colors.inkSoft} />
      </div>
    </PaperPanel>
  );
};

export const SentenceScene: React.FC<SentenceSceneProps> = ({segment, lesson, title}) => {
  const frame = useCurrentFrame();
  const cue = activeCueAt(segment.cues, frame, ['sentence', 'teaching-panel', 'translation']);
  const subState: SubState = (cue?.kind as SubState | undefined) ?? 'sentence';
  const sentenceId = cue?.refId;
  const fallback = lesson.sentenceLessons.find((entry) =>
    segment.cues.some((entryCue) => entryCue.refId === entry.id),
  ) ?? lesson.sentenceLessons[0];
  const sentence = lesson.sentenceLessons.find((entry) => entry.id === sentenceId) ?? fallback;

  if (!sentence) {
    // No sentence lesson resolves for this segment (unresolvable refId or
    // empty sentenceLessons); show a neutral placeholder instead of crashing.
    return (
      <div style={{position: 'absolute', inset: 0, padding: `${layout.margin}px`}}>
        <PaperPanel style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
          <div style={{fontFamily: fonts.chinese, fontSize: 52, fontWeight: 700, color: colors.ink}}>
            本段讲解内容缺失
          </div>
        </PaperPanel>
      </div>
    );
  }

  const sentences = lesson.sentenceLessons.filter((entry) => entry.paragraphId === sentence.paragraphId);
  const sentenceIndex = Math.max(0, sentences.findIndex((entry) => entry.id === sentence.id));

  const sentenceSize = fitFontSize({
    text: sentence.sourceText,
    fontFamily: fonts.display,
    fontWeight: 500,
    maxWidth: 1560,
    maxHeight: subState === 'sentence' ? 300 : 190,
    minSize: 36,
    maxSize: subState === 'sentence' ? 78 : 60,
  });

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        padding: `${layout.margin - 12}px ${layout.margin}px`,
        display: 'flex',
        flexDirection: 'column',
        gap: 22,
      }}
    >
      <SentenceHeader
        title={title}
        sentence={sentence}
        paragraphCount={lesson.source.articleParagraphs.length}
        sentenceIndex={sentenceIndex}
        sentenceCount={sentences.length}
      />
      <PaperPanel key={sentence.id} style={{minHeight: subState === 'sentence' ? 360 : 260, padding: 34}}>
        <div
          style={{
            fontFamily: fonts.display,
            fontSize: sentenceSize,
            fontWeight: 500,
            color: colors.ink,
            lineHeight: 1.4,
          }}
        >
          {sentence.sourceText}
        </div>
        {subState === 'sentence' ? (
          <div style={{marginTop: 22}}>
            <WavyUnderline width={Math.min(900, sentenceSize * 12)} />
          </div>
        ) : null}
      </PaperPanel>
      <ExplanationZone sentence={sentence} subState={subState} since={frame - (cue?.startFrame ?? 0)} />
    </div>
  );
};
