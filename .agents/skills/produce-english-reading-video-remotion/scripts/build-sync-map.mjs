#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const lessonPath = args.find((arg) => !arg.startsWith('--'));
const asrIndex = args.indexOf('--asr-dir');
const outIndex = args.indexOf('--out');
const asrDirectory = asrIndex >= 0 ? args[asrIndex + 1] : null;
const outputPath = outIndex >= 0 ? args[outIndex + 1] : null;

if (!lessonPath || !asrDirectory || !outputPath) {
  console.error('Usage: build-sync-map.mjs <lesson.json> --asr-dir <directory> --out <sync-map.json>');
  process.exit(2);
}

const lesson = JSON.parse(await fs.readFile(lessonPath, 'utf8'));
const fps = lesson.fps;
if (!Number.isInteger(fps) || fps <= 0) throw new Error('lesson.fps must be a positive integer');
const sourceLesson = path.relative(process.cwd(), path.resolve(lessonPath)).split(path.sep).join('/');

const isAsrRow = (value) => value && Number.isFinite(value.startMs) && Number.isFinite(value.endMs) && typeof value.text === 'string';

const collectRows = (value, rows = []) => {
  if (Array.isArray(value)) {
    if (value.every(isAsrRow)) rows.push(...value);
    else for (const item of value) collectRows(item, rows);
  } else if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) collectRows(nested, rows);
  }
  return rows;
};

const normalize = (value) => String(value)
  .normalize('NFKC')
  .toLocaleLowerCase()
  .replace(/[’‘]/g, "'")
  .match(/[\p{L}\p{N}]+/gu)
  ?.join('') || '';

const buildSearchIndex = (rows) => {
  let text = '';
  const startMsByCharacter = [];
  for (const row of rows) {
    const normalized = normalize(row.text);
    text += normalized;
    for (let index = 0; index < normalized.length; index += 1) startMsByCharacter.push(row.startMs);
  }
  return {text, startMsByCharacter};
};

const syncSegments = [];
const failures = [];

for (const segment of lesson.narrationSegments || []) {
  const filePath = path.join(asrDirectory, `${segment.id}.json`);
  let asr;
  try {
    asr = JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    failures.push(`segment ${segment.id}: cannot read ${filePath}: ${error.message}`);
    continue;
  }
  const rows = collectRows(asr)
    .filter(isAsrRow)
    .sort((a, b) => a.startMs - b.startMs || a.endMs - b.endMs)
    .filter((row, index, all) => index === 0 || row.startMs !== all[index - 1].startMs || row.endMs !== all[index - 1].endMs || row.text !== all[index - 1].text);
  if (rows.length === 0) {
    failures.push(`segment ${segment.id}: no ASR rows with startMs/endMs/text`);
    continue;
  }

  const search = buildSearchIndex(rows);
  let cursor = 0;
  const cues = [];
  for (const cue of segment.visualCues || []) {
    const matchText = cue.asrMatchText || cue.spokenCue;
    const needle = normalize(matchText);
    if (!needle) {
      failures.push(`segment ${segment.id} cue ${cue.id}: empty normalized match text`);
      continue;
    }
    const position = search.text.indexOf(needle, cursor);
    if (position < 0) {
      failures.push(`segment ${segment.id} cue ${cue.id}: ASR text not found after cursor: ${matchText}`);
      continue;
    }
    const startMs = search.startMsByCharacter[position];
    cues.push({
      id: cue.id,
      kind: cue.kind,
      refId: cue.refId || '',
      matchText,
      startMs,
      startFrame: Math.round(startMs / 1000 * fps),
      matchMethod: 'normalized-exact',
    });
    cursor = position + needle.length;
  }

  const transcriptEndMs = Math.max(...rows.map((row) => row.endMs));
  const durationMs = Number(segment.actualDurationMs || segment.durationMs || transcriptEndMs);
  const durationFrames = Math.max(1, Math.round(durationMs / 1000 * fps));
  syncSegments.push({id: segment.id, kind: segment.kind, durationMs, durationFrames, cues});
}

if (failures.length > 0) {
  console.error(JSON.stringify({ok: false, failures}, null, 2));
  process.exit(1);
}

const result = {
  version: 1,
  slug: lesson.slug,
  fps,
  sourceLesson,
  generatedAt: new Date().toISOString(),
  segments: syncSegments,
};
await fs.mkdir(path.dirname(outputPath), {recursive: true});
await fs.writeFile(outputPath, `${JSON.stringify(result, null, 2)}\n`, 'utf8');
console.log(JSON.stringify({ok: true, output: path.resolve(outputPath), segments: syncSegments.length, cues: syncSegments.reduce((sum, segment) => sum + segment.cues.length, 0)}, null, 2));
