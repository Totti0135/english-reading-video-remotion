import React from 'react';
import {useCurrentFrame} from 'remotion';
import {activeCueAt} from '../cueState';
import {HandArrow, StarDoodle} from '../components/doodles';
import {PaperPanel} from '../components/PaperPanel';
import {fitFontSize} from '../textFit';
import {handdrawnV1} from '../visual-profiles/handdrawn-v1';
import type {LessonSpec, TimelineSegment} from '../types';
import {SentenceScene} from './SentenceScene';

const {colors, fonts, layout} = handdrawnV1;

interface PeopleSceneProps {
  segment: TimelineSegment;
  lesson: LessonSpec;
  title: string;
}

const personName = (text: string) => text.match(/^([A-Za-z]+)/)?.[1] ?? 'Student';

export const PeopleScene: React.FC<PeopleSceneProps> = ({segment, lesson, title}) => {
  const frame = useCurrentFrame();
  const cue = activeCueAt(segment.cues, frame);

  if (cue?.kind === 'sentence' || cue?.kind === 'teaching-panel' || cue?.kind === 'translation') {
    return <SentenceScene segment={segment} lesson={lesson} title={title} />;
  }

  const peopleParagraphIds = lesson.exerciseLessons
    .map((exercise) => exercise.evidenceParagraphId)
    .filter((id, index, all) => id && all.indexOf(id) === index);
  const people = peopleParagraphIds
    .map((id) => lesson.source.articleParagraphs.find((paragraph) => paragraph.id === id))
    .filter((paragraph): paragraph is NonNullable<typeof paragraph> => Boolean(paragraph));

  if (cue?.kind === 'people-complete') {
    return (
      <div style={{position: 'absolute', inset: 0, padding: `${layout.margin - 12}px ${layout.margin}px`}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 22, marginBottom: 28}}>
          <div style={{fontFamily: fonts.chinese, fontSize: 34, fontWeight: 700, color: colors.card, background: colors.ink, borderRadius: 12, padding: '6px 22px'}}>
            人物信息已讲完
          </div>
          <div style={{fontFamily: fonts.display, fontSize: 30, fontWeight: 600, color: colors.ink}}>{title}</div>
          <div style={{flex: 1, height: 2, background: colors.line}} />
        </div>
        <PaperPanel style={{height: 850, padding: 34, display: 'flex', flexDirection: 'column', gap: 22}}>
          <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, flex: 1}}>
            {people.map((paragraph, index) => (
              <div key={paragraph.id} style={{display: 'flex', gap: 18, alignItems: 'center', border: `2px solid ${colors.line}`, borderRadius: 14, padding: '14px 20px', background: colors.card}}>
                <div style={{width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: colors.markerSoft, border: `2.5px solid ${colors.accent}`, fontFamily: fonts.display, fontSize: 30, fontWeight: 700, color: colors.accent}}>
                  {index + 1}
                </div>
                <div>
                  <div style={{fontFamily: fonts.display, fontSize: 34, fontWeight: 700, color: colors.ink}}>{personName(paragraph.text)}</div>
                  <div style={{fontFamily: fonts.chinese, fontSize: 24, color: colors.chalk}}>兴趣、愿望和关键词已记录</div>
                </div>
                <StarDoodle size={24} />
              </div>
            ))}
          </div>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, fontFamily: fonts.chinese, fontSize: 38, fontWeight: 700, color: colors.accent}}>
            <HandArrow length={90} />
            下一步再看 A–F 社团海报，然后开始连线
          </div>
        </PaperPanel>
      </div>
    );
  }

  const paragraph = lesson.source.articleParagraphs.find((entry) => entry.id === cue?.refId) ?? people[0];
  const index = Math.max(0, people.findIndex((entry) => entry.id === paragraph?.id));
  const text = paragraph?.text ?? '';
  const fontSize = fitFontSize({text, fontFamily: fonts.display, fontWeight: 500, maxWidth: 1500, maxHeight: 500, minSize: 34, maxSize: 54});

  return (
    <div style={{position: 'absolute', inset: 0, padding: `${layout.margin - 12}px ${layout.margin}px`, display: 'flex', flexDirection: 'column', gap: 28}}>
      <div style={{display: 'flex', alignItems: 'center', gap: 24}}>
        <div style={{fontFamily: fonts.chinese, fontSize: 34, fontWeight: 700, color: colors.card, background: colors.ink, borderRadius: 12, padding: '6px 22px'}}>人物逐句精讲</div>
        <div style={{fontFamily: fonts.display, fontSize: 30, fontWeight: 600, color: colors.ink}}>{title}</div>
        <div style={{flex: 1, height: 2, background: colors.line}} />
        <div style={{fontFamily: fonts.chinese, fontSize: 28, color: colors.ink}}>第 {index + 1}/5 位</div>
      </div>
      <PaperPanel style={{flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 36, padding: 54}}>
        <div style={{display: 'flex', alignItems: 'center', gap: 26}}>
          <div style={{width: 86, height: 86, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: colors.accent, color: colors.card, fontFamily: fonts.display, fontSize: 46, fontWeight: 700}}>{index + 1}</div>
          <div style={{fontFamily: fonts.display, fontSize: 70, fontWeight: 700, color: colors.ink}}>{personName(text)}</div>
          <div style={{marginLeft: 'auto', fontFamily: fonts.chinese, fontSize: 30, color: colors.accent, border: `2.5px dashed ${colors.accent}`, borderRadius: 12, padding: '8px 22px'}}>先听情况 · 暂不看社团</div>
        </div>
        <div style={{fontFamily: fonts.display, fontSize, lineHeight: 1.55, color: colors.ink, fontWeight: 500}}>{text}</div>
        <div style={{display: 'flex', alignItems: 'center', gap: 18, color: colors.chalk, fontFamily: fonts.chinese, fontSize: 32}}>
          <HandArrow length={72} />
          接下来按“第一句—讲解—翻译”的顺序逐句学习
        </div>
      </PaperPanel>
    </div>
  );
};
