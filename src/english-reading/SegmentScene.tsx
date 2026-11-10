// Routes a timeline segment to its scene by kind.

import React from 'react';
import {IntroScene} from './scenes/IntroScene';
import {PeopleScene} from './scenes/PeopleScene';
import {PosterBoardScene} from './scenes/PosterBoardScene';
import {QuestionsScene} from './scenes/QuestionsScene';
import {SentenceScene} from './scenes/SentenceScene';
import type {LessonSpec, TimelineSegment} from './types';

interface SegmentSceneProps {
  segment: TimelineSegment;
  lesson: LessonSpec;
  title: string;
}

export const SegmentScene: React.FC<SegmentSceneProps> = ({segment, lesson, title}) => {
  switch (segment.kind) {
    case 'reading-intro':
      return <IntroScene segment={segment} lesson={lesson} />;
    case 'reading-options':
      return <PosterBoardScene segment={segment} lesson={lesson} title={title} />;
    case 'reading-paragraph':
      return <PeopleScene segment={segment} lesson={lesson} title={title} />;
    case 'reading-question':
    case 'reading-questions':
    case 'reading-summary':
      return <QuestionsScene segment={segment} lesson={lesson} title={title} />;
    default:
      return <SentenceScene segment={segment} lesson={lesson} title={title} />;
  }
};
