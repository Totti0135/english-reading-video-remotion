import React from 'react';
import {Composition, Folder} from 'remotion';
import {
  EnglishReadingLesson,
  calculateEnglishReadingMetadata,
} from './english-reading/EnglishReadingLesson';
import type {EnglishReadingProps} from './english-reading/types';

const PLACEHOLDER_PROPS: EnglishReadingProps = {
  version: 1,
  slug: '',
  title: 'English Reading',
  fps: 30,
  width: 1920,
  height: 1080,
  durationInFrames: 150,
  visualProfile: {id: 'english-reading-handdrawn-v1'},
  lesson: {
    slug: '',
    title: 'English Reading',
    grade: '初中',
    fps: 30,
    source: {
      articleParagraphs: [],
      wordPower: [],
      languageTips: [],
      questions: [],
      notes: '',
    },
    sentenceLessons: [],
    exerciseLessons: [],
  },
  timeline: {segments: []},
};

export const RemotionRoot: React.FC = () => (
  <Folder name="English-Reading">
    <Composition
      id="EnglishReadingLesson"
      component={EnglishReadingLesson}
      durationInFrames={150}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={PLACEHOLDER_PROPS}
      calculateMetadata={calculateEnglishReadingMetadata}
    />
  </Folder>
);
