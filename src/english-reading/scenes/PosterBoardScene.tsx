import React from 'react';
import {useCurrentFrame} from 'remotion';
import {activeCueAt} from '../cueState';
import {HandArrow, StarDoodle} from '../components/doodles';
import {PaperPanel} from '../components/PaperPanel';
import {fitFontSize} from '../textFit';
import {handdrawnV1} from '../visual-profiles/handdrawn-v1';
import type {LessonSpec, TimelineSegment} from '../types';

const {colors, fonts, layout} = handdrawnV1;

interface PosterBoardSceneProps {
  segment: TimelineSegment;
  lesson: LessonSpec;
  title: string;
}

const clubName = (text: string) => text.split(':')[0]?.trim() || text;
const clubSlogan = (text: string) => text.includes(':') ? text.slice(text.indexOf(':') + 1).trim() : '';

export const PosterBoardScene: React.FC<PosterBoardSceneProps> = ({segment, lesson, title}) => {
  const frame = useCurrentFrame();
  const cue = activeCueAt(segment.cues, frame);
  const options = lesson.source.questions[0]?.options ?? [];
  const sentence = lesson.sentenceLessons.find((entry) => entry.id === cue?.refId);
  const posterIndex = sentence ? Number(sentence.paragraphId.slice(1)) - 2 : -1;
  const stage = cue?.kind;

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${layout.margin - 12}px ${layout.margin}px`, display: 'flex', flexDirection: 'column', gap: 18}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 22, height: 56}}>
        <div style={{fontFamily: fonts.chinese, fontSize: 32, fontWeight: 700, color: colors.card, background: colors.ink, borderRadius: 12, padding: '6px 22px'}}>A–F 社团海报</div>
        <div style={{fontFamily: fonts.display, fontSize: 28, fontWeight: 600, color: colors.ink}}>{title}</div>
        <div style={{flex: 1, height: 2, background: colors.line}} />
        <div style={{fontFamily: fonts.chinese, fontSize: 27, color: colors.accent, fontWeight: 700}}>此阶段不连线</div>
      </div>

      <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 14, flex: 1}}>
        {options.map((option, index) => {
          const active = index === posterIndex;
          const sloganSize = fitFontSize({text: clubSlogan(option.text), fontFamily: fonts.display, fontWeight: 500, maxWidth: 430, maxHeight: 72, minSize: 21, maxSize: 28});
          return (
            <PaperPanel key={option.label} style={{padding: '18px 22px', display: 'flex', gap: 18, alignItems: 'center', borderColor: active ? colors.accent : colors.line, background: active ? colors.markerSoft : colors.card, boxShadow: active ? `6px 7px 0 rgba(212, 72, 48, 0.2)` : undefined}}>
              <div style={{width: 58, height: 58, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: active ? colors.card : colors.ink, background: active ? colors.accent : colors.paperShade, border: `2.5px solid ${active ? colors.accent : colors.ink}`}}>{option.label}</div>
              <div style={{minWidth: 0}}>
                <div style={{fontFamily: fonts.display, fontSize: 31, fontWeight: 700, color: colors.ink, marginBottom: 6}}>{clubName(option.text)}</div>
                <div style={{fontFamily: fonts.display, fontSize: sloganSize, lineHeight: 1.35, color: colors.chalk, fontStyle: 'italic'}}>{clubSlogan(option.text)}</div>
              </div>
              {active ? <StarDoodle size={22} /> : null}
            </PaperPanel>
          );
        })}
      </div>

      <PaperPanel style={{height: 250, padding: '20px 30px', display: 'flex', alignItems: 'center', gap: 28, background: sentence ? colors.markerSoft : colors.card, borderColor: sentence ? colors.accent : colors.ink}}>
        {!sentence || stage === 'poster-board' || stage === 'question-neutral' ? (
          <>
            <HandArrow length={92} />
            <div style={{fontFamily: fonts.chinese, fontSize: 38, lineHeight: 1.45, fontWeight: 700, color: colors.ink}}>
              {stage === 'question-neutral' ? '六个选项保持中立；先观察海报关键词，不提前显示答案。' : '先完整浏览六张海报，再按顺序朗读、讲解和翻译。'}
            </div>
          </>
        ) : stage === 'translation' ? (
          <>
            <div style={{fontFamily: fonts.chinese, fontSize: 30, fontWeight: 700, color: colors.card, background: colors.accent, borderRadius: 10, padding: '6px 18px'}}>完整翻译</div>
            <div style={{fontFamily: fonts.chinese, fontSize: 39, fontWeight: 600, lineHeight: 1.45, color: colors.ink}}>{sentence.translation}</div>
          </>
        ) : stage === 'teaching-panel' ? (
          <>
            <div style={{fontFamily: fonts.chinese, fontSize: 30, fontWeight: 700, color: colors.card, background: colors.accent, borderRadius: 10, padding: '6px 18px'}}>重点讲解</div>
            <div style={{display: 'grid', gridTemplateColumns: '1.35fr 1fr', gap: 30, flex: 1, alignItems: 'center'}}>
              <div style={{display: 'flex', flexDirection: 'column', gap: 5}}>
                {sentence.grammarPoints.map((point) => <div key={point} style={{fontFamily: fonts.chinese, fontSize: 26, lineHeight: 1.35, color: colors.ink}}>• {point}</div>)}
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7}}>
                {[...sentence.fixedPhrases, ...sentence.newWords].slice(0, 4).map((item) => <div key={item} style={{fontFamily: fonts.chinese, fontSize: 21, lineHeight: 1.25, color: colors.chalk, background: colors.card, borderRadius: 8, padding: '6px 10px'}}>{item}</div>)}
              </div>
            </div>
          </>
        ) : (
          <>
            <div style={{fontFamily: fonts.chinese, fontSize: 30, fontWeight: 700, color: colors.card, background: colors.ink, borderRadius: 10, padding: '6px 18px'}}>慢速朗读</div>
            <div style={{fontFamily: fonts.display, fontSize: 39, fontWeight: 600, lineHeight: 1.4, color: colors.ink}}>{sentence.sourceText}</div>
          </>
        )}
      </PaperPanel>
    </div>
  );
};
