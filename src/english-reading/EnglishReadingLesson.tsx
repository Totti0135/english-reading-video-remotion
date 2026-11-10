// Generic English reading lesson composition.
// Content arrives entirely via remotion-props.json (--props on the CLI);
// nothing lesson-specific is hardcoded here.

import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile} from 'remotion';
import type {CalculateMetadataFunction} from 'remotion';
import {ensureFontsLoaded} from './fonts';
import {SegmentScene} from './SegmentScene';
import {handdrawnV1} from './visual-profiles/handdrawn-v1';
import type {EnglishReadingProps} from './types';

const {colors, fonts, motion} = handdrawnV1;

export const calculateEnglishReadingMetadata: CalculateMetadataFunction<EnglishReadingProps> = ({
  props,
}) => ({
  durationInFrames: props.durationInFrames > 0 ? props.durationInFrames : 150,
  fps: props.fps > 0 ? props.fps : 30,
  width: props.width > 0 ? props.width : handdrawnV1.layout.width,
  height: props.height > 0 ? props.height : handdrawnV1.layout.height,
  defaultOutName: `${props.slug || 'english-reading'}.mp4`,
});

const PropsHint: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: colors.paper,
      fontFamily: fonts.chinese,
      color: colors.ink,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 24,
    }}
  >
    <div style={{fontSize: 56, fontWeight: 700}}>EnglishReadingLesson</div>
    <div style={{fontSize: 32, color: colors.chalk}}>
      通用英语精读组合 · 请通过 --props 传入 remotion-props.json 预览具体课程
    </div>
  </AbsoluteFill>
);

const SegmentSequence: React.FC<{
  segment: EnglishReadingProps['timeline']['segments'][number];
  lesson: EnglishReadingProps['lesson'];
  title: string;
}> = ({segment, lesson, title}) => (
  <>
    <Audio src={staticFile(segment.audioSrc)} />
    <SegmentScene segment={segment} lesson={lesson} title={title} />
  </>
);

export const EnglishReadingLesson: React.FC<EnglishReadingProps> = (props) => {
  ensureFontsLoaded();
  const segments = props.timeline?.segments ?? [];
  if (segments.length === 0) {
    return <PropsHint />;
  }
  return (
    <AbsoluteFill style={{backgroundColor: colors.paper, fontFamily: fonts.chinese}}>
      {segments.map((segment) => (
        <Sequence
          key={segment.id}
          name={`${segment.id} · ${segment.kind}`}
          from={segment.startFrame}
          durationInFrames={segment.durationFrames}
          premountFor={motion.premountFrames}
        >
          <SegmentSequence segment={segment} lesson={props.lesson} title={props.title} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
