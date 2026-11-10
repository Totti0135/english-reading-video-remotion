#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith('--'));
const outIndex = args.indexOf('--out');
const outputPath = outIndex >= 0 ? args[outIndex + 1] : null;

if (!inputPath) {
  console.error('Usage: parse-source-md.mjs <source.md> [--out lesson.json]');
  process.exit(2);
}
if (outIndex >= 0 && !outputPath) {
  console.error('--out requires a path');
  process.exit(2);
}

const sourceText = await fs.readFile(inputPath, 'utf8');
const sourcePath = path.resolve(inputPath);
const relativeSourcePath = path.relative(process.cwd(), sourcePath).split(path.sep).join('/');

const parseScalar = (value) => {
  const trimmed = value.trim();
  if (/^(?:true|false)$/i.test(trimmed)) return trimmed.toLowerCase() === 'true';
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);
  if (/^(?:null|~)$/i.test(trimmed)) return null;
  const quoted = trimmed.match(/^(?:"([\s\S]*)"|'([\s\S]*)')$/);
  return quoted ? (quoted[1] ?? quoted[2]) : trimmed;
};

const frontmatterMatch = sourceText.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
if (!frontmatterMatch) {
  console.error('Missing YAML frontmatter');
  process.exit(1);
}

const frontmatter = {};
for (const line of frontmatterMatch[1].split(/\r?\n/)) {
  if (!line.trim() || line.trim().startsWith('#')) continue;
  const match = line.match(/^([A-Za-z][A-Za-z0-9_-]*):\s*(.*)$/);
  if (!match) {
    console.error(`Unsupported frontmatter line: ${line}`);
    process.exit(1);
  }
  frontmatter[match[1]] = parseScalar(match[2]);
}

const markdown = sourceText.slice(frontmatterMatch[0].length);

const getSection = (heading) => {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim().toLowerCase() === `## ${heading}`.toLowerCase());
  if (start < 0) return '';
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^##\s+/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end).join('\n').trim();
};

const splitSubheadings = (section) => {
  const lines = section.split(/\r?\n/);
  const blocks = [];
  let current = null;
  for (const line of lines) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      if (current) blocks.push({...current, body: current.lines.join('\n').trim()});
      current = {heading: heading[1].trim(), lines: []};
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) blocks.push({...current, body: current.lines.join('\n').trim()});
  return blocks;
};

const cleanParagraph = (value) => value.replace(/\s*\n\s*/g, ' ').replace(/\s+/g, ' ').trim();

const articleSection = getSection('Article');
let articleParagraphs = splitSubheadings(articleSection).map((block, index) => ({
  id: /^P\d+$/i.test(block.heading) ? block.heading.toUpperCase() : `P${String(index + 1).padStart(2, '0')}`,
  text: cleanParagraph(block.body),
}));
if (articleParagraphs.length === 0 && articleSection) {
  articleParagraphs = articleSection
    .split(/\n\s*\n+/)
    .map(cleanParagraph)
    .filter(Boolean)
    .map((text, index) => ({id: `P${String(index + 1).padStart(2, '0')}`, text}));
}

const wordPower = getSection('Word Power')
  .split(/\r?\n/)
  .map((line) => line.match(/^\s*-\s*(.+?)\s*\|\s*(.*?)\s*\|\s*(.*?)\s*$/))
  .filter(Boolean)
  .map((match) => ({term: match[1].trim(), partOfSpeech: match[2].trim(), meaning: match[3].trim()}));

const languageTips = splitSubheadings(getSection('Language Tips')).map((block, index) => {
  const fields = {};
  for (const line of block.body.split(/\r?\n/)) {
    const match = line.match(/^\s*-\s*(Pattern|Meaning|Example):\s*(.*)$/i);
    if (match) fields[match[1].toLowerCase()] = match[2].trim();
  }
  return {
    id: /^T\d+$/i.test(block.heading) ? block.heading.toUpperCase() : `T${String(index + 1).padStart(2, '0')}`,
    pattern: fields.pattern || '',
    meaning: fields.meaning || '',
    example: fields.example || '',
  };
});

const questions = splitSubheadings(getSection('Questions')).map((block, index) => {
  const heading = block.heading.match(/^([A-Za-z0-9_-]+)(?:\s*\[([A-Za-z-]+)\])?$/);
  const id = heading ? heading[1].toUpperCase() : `Q${String(index + 1).padStart(2, '0')}`;
  const type = heading?.[2]?.toLowerCase() || 'multiple-choice';
  const options = [];
  const promptLines = [];
  const metadata = {};
  for (const rawLine of block.body.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const option = line.match(/^(?:-\s*)?([A-Z])\.\s*(.+)$/i);
    if (option) {
      options.push({label: option[1].toUpperCase(), text: option[2].trim()});
      continue;
    }
    const meta = line.match(/^(?:-\s*)?(Answer|Explanation|Evidence Paragraph|Highlight):\s*(.*)$/i);
    if (meta) {
      const key = meta[1].toLowerCase().replace(/\s+/g, '');
      metadata[key] = meta[2].trim();
      continue;
    }
    if (!line.startsWith('- ')) promptLines.push(line);
  }
  return {
    id,
    type,
    prompt: cleanParagraph(promptLines.join(' ')),
    options,
    suppliedAnswer: metadata.answer || '',
    suppliedExplanation: metadata.explanation || '',
    suppliedEvidenceParagraphId: metadata.evidenceparagraph?.toUpperCase() || '',
    suppliedHighlight: metadata.highlight || '',
  };
});

const splitSentences = (text) => {
  const matches = text.match(/[^.!?]+(?:[.!?]+["”’']?|$)/g) || [text];
  const sentences = [];
  for (const raw of matches) {
    const sentence = raw.trim();
    if (!sentence) continue;
    if (sentences.length > 0 && /^[a-z]/.test(sentence)) {
      sentences[sentences.length - 1] = `${sentences.at(-1)} ${sentence}`;
    } else {
      sentences.push(sentence);
    }
  }
  return sentences;
};

const sentenceLessons = articleParagraphs.flatMap((paragraph) =>
  splitSentences(paragraph.text).map((sentence, index) => ({
    id: `${paragraph.id}-S${String(index + 1).padStart(2, '0')}`,
    paragraphId: paragraph.id,
    sourceText: sentence,
    translation: '',
    grammarPoints: [],
    fixedPhrases: [],
    newWords: [],
    narrationText: '',
  })),
);

const exerciseLessons = questions.map((question) => ({
  questionId: question.id,
  answer: question.suppliedAnswer,
  theme: '',
  explanation: question.suppliedExplanation,
  evidenceParagraphId: question.suppliedEvidenceParagraphId,
  evidenceHighlights: question.suppliedHighlight ? [question.suppliedHighlight] : [],
  narrationText: '',
}));

const lesson = {
  version: 1,
  slug: String(frontmatter.slug || '').trim(),
  title: String(frontmatter.title || '').trim(),
  grade: String(frontmatter.grade || '初中').trim(),
  narrationLanguage: String(frontmatter.narrationLanguage || 'zh-CN').trim(),
  fps: Number(frontmatter.fps || 30),
  visualProfile: {id: String(frontmatter.visualProfile || 'english-reading-handdrawn-v1').trim()},
  voice: {
    provider: 'doubao',
    voiceId: String(frontmatter.voiceId || 'dayi').trim(),
    readingSpeedRatio: Number(frontmatter.readingSpeedRatio || 0.88),
    questionSpeedRatio: Number(frontmatter.questionSpeedRatio || 0.84),
  },
  sourceInput: {kind: 'markdown', path: relativeSourcePath || path.basename(sourcePath)},
  source: {
    articleParagraphs,
    wordPower,
    languageTips,
    questions,
    notes: getSection('Notes'),
  },
  sentenceLessons,
  exerciseLessons,
  narrationSegments: [],
};

const rendered = `${JSON.stringify(lesson, null, 2)}\n`;
if (outputPath) {
  await fs.mkdir(path.dirname(outputPath), {recursive: true});
  await fs.writeFile(outputPath, rendered, 'utf8');
  console.log(JSON.stringify({ok: true, input: path.resolve(inputPath), output: path.resolve(outputPath), paragraphs: articleParagraphs.length, sentences: sentenceLessons.length, questions: questions.length}, null, 2));
} else {
  process.stdout.write(rendered);
}
