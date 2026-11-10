#!/usr/bin/env node

import {spawnSync} from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const option = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};

const lessonPath = args.find((arg) => !arg.startsWith('--'));
const syncPath = option('--sync');
const audioDirectoryArg = option('--audio-dir');
const outputPath = option('--out');
const publicDirectoryArg = option('--public-dir', 'public');
const width = Number(option('--width', '1920'));
const height = Number(option('--height', '1080'));
const durationToleranceMs = Number(option('--duration-tolerance-ms', '150'));

if (!lessonPath || !syncPath || !audioDirectoryArg || !outputPath) {
  console.error('Usage: build-remotion-props.mjs <lesson.json> --sync <sync-map.json> --audio-dir <public audio dir> --out <remotion-props.json> [--public-dir public] [--width 1920] [--height 1080] [--duration-tolerance-ms 150]');
  process.exit(2);
}

if (![width, height].every((value) => Number.isInteger(value) && value > 0)) {
  throw new Error('width and height must be positive integers');
}
if (!Number.isFinite(durationToleranceMs) || durationToleranceMs < 0) {
  throw new Error('duration tolerance must be a non-negative number');
}

const repoRoot = process.cwd();
const publicDirectory = path.resolve(repoRoot, publicDirectoryArg);
const audioDirectory = path.resolve(repoRoot, audioDirectoryArg);

const inside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative !== '' && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
};

if (!inside(publicDirectory, audioDirectory)) {
  throw new Error(`audio directory must be inside public directory: ${audioDirectory}`);
}

const [lesson, syncMap] = await Promise.all([
  fs.readFile(lessonPath, 'utf8').then(JSON.parse),
  fs.readFile(syncPath, 'utf8').then(JSON.parse),
]);

if (!lesson.slug || lesson.slug !== syncMap.slug) {
  throw new Error(`lesson/sync slug mismatch: ${lesson.slug || '(missing)'} vs ${syncMap.slug || '(missing)'}`);
}
if (!Number.isInteger(lesson.fps) || lesson.fps <= 0 || lesson.fps !== syncMap.fps) {
  throw new Error(`lesson/sync fps mismatch: ${lesson.fps} vs ${syncMap.fps}`);
}

const narrationSegments = lesson.narrationSegments || [];
const syncSegments = syncMap.segments || [];
if (narrationSegments.length === 0 || narrationSegments.length !== syncSegments.length) {
  throw new Error(`narration/sync segment count mismatch: ${narrationSegments.length} vs ${syncSegments.length}`);
}

const supportedExtensions = new Set(['.wav', '.mp3', '.m4a', '.aac', '.flac', '.ogg']);
const audioEntries = await fs.readdir(audioDirectory, {withFileTypes: true});
const audioByStem = new Map();
for (const entry of audioEntries) {
  if (!entry.isFile()) continue;
  const extension = path.extname(entry.name).toLowerCase();
  if (!supportedExtensions.has(extension)) continue;
  const stem = path.basename(entry.name, extension);
  const files = audioByStem.get(stem) || [];
  files.push(path.join(audioDirectory, entry.name));
  audioByStem.set(stem, files);
}

const probeDurationMs = (filePath) => {
  const result = spawnSync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ], {encoding: 'utf8'});
  if (result.error) throw new Error(`ffprobe failed for ${filePath}: ${result.error.message}`);
  if (result.status !== 0) throw new Error(`ffprobe failed for ${filePath}: ${result.stderr.trim()}`);
  const seconds = Number(result.stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error(`ffprobe returned invalid duration for ${filePath}`);
  return Math.round(seconds * 1000);
};

const timelineSegments = [];
let cursor = 0;

for (let index = 0; index < narrationSegments.length; index += 1) {
  const narration = narrationSegments[index];
  const timed = syncSegments[index];
  if (!narration?.id || narration.id !== timed?.id) {
    throw new Error(`segment order mismatch at index ${index}: ${narration?.id || '(missing)'} vs ${timed?.id || '(missing)'}`);
  }
  if (!Number.isInteger(timed.durationFrames) || timed.durationFrames <= 0) {
    throw new Error(`segment ${timed.id}: durationFrames must be a positive integer`);
  }
  const candidates = audioByStem.get(timed.id) || [];
  if (candidates.length !== 1) {
    throw new Error(`segment ${timed.id}: expected exactly one local audio file, found ${candidates.length}`);
  }
  const audioFile = candidates[0];
  const audioDurationMs = probeDurationMs(audioFile);
  const expectedDurationMs = Number(timed.durationMs);
  if (!Number.isFinite(expectedDurationMs) || expectedDurationMs <= 0) {
    throw new Error(`segment ${timed.id}: durationMs must be positive`);
  }
  if (Math.abs(audioDurationMs - expectedDurationMs) > durationToleranceMs) {
    throw new Error(`segment ${timed.id}: audio duration ${audioDurationMs}ms differs from sync duration ${expectedDurationMs}ms by more than ${durationToleranceMs}ms`);
  }
  for (const cue of timed.cues || []) {
    if (!Number.isInteger(cue.startFrame) || cue.startFrame < 0 || cue.startFrame >= timed.durationFrames) {
      throw new Error(`segment ${timed.id} cue ${cue.id || '(missing)'}: startFrame is outside the segment`);
    }
  }

  const audioSrc = path.relative(publicDirectory, audioFile).split(path.sep).join('/');
  timelineSegments.push({
    id: timed.id,
    kind: timed.kind,
    startFrame: cursor,
    endFrame: cursor + timed.durationFrames,
    durationFrames: timed.durationFrames,
    durationMs: expectedDurationMs,
    audioDurationMs,
    audioSrc,
    cues: timed.cues || [],
  });
  cursor += timed.durationFrames;
}

const result = {
  version: 1,
  slug: lesson.slug,
  title: lesson.title,
  fps: lesson.fps,
  width,
  height,
  durationInFrames: cursor,
  visualProfile: lesson.visualProfile,
  lesson,
  timeline: {segments: timelineSegments},
  source: {
    lesson: path.relative(repoRoot, path.resolve(lessonPath)),
    syncMap: path.relative(repoRoot, path.resolve(syncPath)),
    audioDirectory: path.relative(repoRoot, audioDirectory),
  },
};

await fs.mkdir(path.dirname(outputPath), {recursive: true});
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({
  ok: true,
  output: path.resolve(outputPath),
  slug: result.slug,
  segments: timelineSegments.length,
  cues: timelineSegments.reduce((sum, segment) => sum + segment.cues.length, 0),
  durationInFrames: result.durationInFrames,
}, null, 2));
