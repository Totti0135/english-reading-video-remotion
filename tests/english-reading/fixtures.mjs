// Synthetic fixtures: no production worksheet, narration, or audio is modified.
export const clone = (value) => structuredClone(value);
export const options = () => [
  {label: 'A', text: 'At home'},
  {label: 'B', text: 'In the library'},
  {label: 'C', text: 'In the park'},
];
export function choiceLesson() {
  return {
    version: 1, slug: 'contract-fixture', title: 'A reading fixture', fps: 30,
    source: {
      articleParagraphs: [{id: 'P01', text: 'Lina reads in the library. Omar reads at home.'}],
      questions: [{id: 'Q01', type: 'multiple-choice', prompt: 'Where does Lina read?', options: options()}],
    },
    sentenceLessons: [{id: 'P01-S01', paragraphId: 'P01', sourceText: 'Lina reads in the library.'}],
    exerciseLessons: [{questionId: 'Q01', answer: 'B', theme: '定位', explanation: 'Use the first sentence.', presentationMode: 'option-cards', evidenceParagraphId: 'P01', evidenceHighlights: ['Lina reads in the library.']}],
  };
}
export function matchingLesson() {
  const lesson = choiceLesson();
  lesson.source.questions = [1, 2].map((n) => ({id: `M0${n}`, type: 'fill-blank', prompt: `Reader ${n}`, options: options()}));
  lesson.exerciseLessons = [1, 2].map((n) => ({questionId: `M0${n}`, answer: n === 1 ? 'B' : 'A', presentationMode: 'left-right-connect', mapping: {left: String(n), right: n === 1 ? 'B' : 'A'}, evidenceParagraphId: '', evidenceHighlights: []}));
  return lesson;
}
export function mixedLesson() {
  const lesson = choiceLesson();
  lesson.exerciseGroups = [];
  for (const [groupId, prefix, words] of [['places', 'M', ['Home', 'Library']], ['meals', 'N', ['Rice', 'Soup']]]) {
    const groupOptions = words.map((word, i) => ({id: `${groupId}-${i}`, label: String.fromCharCode(65 + i), text: word}));
    const questionIds = [1, 2].map((n) => `${prefix}0${n}`);
    lesson.exerciseGroups.push({id: groupId, kind: 'matching', title: groupId, questionIds, options: groupOptions});
    questionIds.forEach((questionId, index) => {
      lesson.source.questions.push({id: questionId, type: 'matching', prompt: `${groupId} item ${index + 1}`, options: []});
      const answer = groupOptions[1 - index];
      lesson.exerciseLessons.push({questionId, answer: answer.label, presentationMode: 'left-right-connect', groupId, mapping: {left: String(index + 1), right: answer.id}});
    });
  }
  lesson.source.questions.push({id: 'S01', type: 'short-answer', prompt: 'Explain your preference.', options: []});
  lesson.exerciseLessons.push({questionId: 'S01', answer: 'I prefer reading in a quiet place.', theme: '简答', presentationMode: 'short-answer'});
  return lesson;
}
export function segment(id, startFrame, durationFrames, rows) {
  return {id, kind: 'reading-questions', startFrame, endFrame: startFrame + durationFrames, durationFrames, audioSrc: `audio/fixtures/${id}.wav`, cues: rows.map(([kind, refId, frame], index) => ({id: `${id}-cue-${index}`, kind, refId, startFrame: frame}))};
}
export function renderPackage(lesson = choiceLesson(), segments) {
  if (!segments) {
    let frame = 0;
    const rows = [];
    for (const question of lesson.source.questions) {
      const exercise = lesson.exerciseLessons.find((item) => item.questionId === question.id);
      rows.push(['question', question.id, frame]); frame += 12;
      rows.push(['answer-reveal', question.id, frame]); frame += 12;
      if (exercise.evidenceParagraphId) { rows.push(['evidence-dialog', question.id, frame]); frame += 12; }
    }
    rows.push(['summary-card', 'lesson', frame]);
    segments = [segment('01', 0, frame + 20, rows)];
  }
  return {version: 1, slug: lesson.slug, fps: 30, width: 1920, height: 1080, durationInFrames: segments.at(-1).endFrame, visualProfile: {id: 'english-reading-handdrawn-v1'}, lesson, timeline: {segments}};
}
