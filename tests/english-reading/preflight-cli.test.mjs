import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {runPreflight} from '../../scripts/validate-english-reading.mjs';
import {choiceLesson, renderPackage} from './fixtures.mjs';

const cli = fileURLToPath(new URL('../../scripts/validate-english-reading.mjs', import.meta.url));
async function withFixture(t, input) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'english-reading-test-'));
  t.after(() => fs.rm(directory, {recursive: true, force: true}));
  const file = path.join(directory, 'input.json');
  await fs.writeFile(file, JSON.stringify(input));
  return {directory, file};
}
for (const argv of [[], ['x.json'], ['x.json', '--kind', 'auto'], ['x.json', '--kind'], ['x.json', '--kind', 'lesson', '--public-dir', 'public'], ['x.json', '--kind', 'package', '--source'], ['x.json', '--kind', 'lesson', '--bogus'], ['x.json', '--kind', 'lesson', '--kind', 'lesson'], ['x.json', 'y.json', '--kind', 'lesson']]) {
  test(`CLI rejects invalid usage: ${argv.join(' ')}`, async () => assert.equal((await runPreflight(argv)).exitCode, 2));
}
test('CLI help does not read or write files', async () => {
  const result = await runPreflight(['--help']); assert.equal(result.exitCode, 0); assert.match(result.report.usage, /--kind/);
});
test('CLI reports valid exercise preflight without claiming renderer integration', async (t) => {
  const {file} = await withFixture(t, choiceLesson());
  const before = await fs.readFile(file, 'utf8');
  const result = await runPreflight([file, '--kind', 'lesson']);
  assert.equal(result.exitCode, 0);
  assert.equal(result.report.productionRendererIntegrated, false);
  assert.equal(await fs.readFile(file, 'utf8'), before);
});
test('CLI can make legacy warnings fatal without mutating the source', async (t) => {
  const lesson = choiceLesson(); delete lesson.exerciseLessons[0].presentationMode;
  const {file} = await withFixture(t, lesson);
  assert.equal((await runPreflight([file, '--kind', 'lesson'])).exitCode, 0);
  const strict = await runPreflight([file, '--kind', 'lesson', '--warnings-as-errors']);
  assert.equal(strict.exitCode, 1); assert.equal(strict.report.ok, false); assert.equal(strict.report.errors.length, 0);
});
test('CLI distinguishes source drafts from answered exercises', async (t) => {
  const lesson = choiceLesson(); lesson.exerciseLessons[0].answer = '';
  const {file} = await withFixture(t, lesson);
  assert.equal((await runPreflight([file, '--kind', 'lesson', '--source'])).exitCode, 0);
  assert.equal((await runPreflight([file, '--kind', 'lesson'])).exitCode, 1);
});
test('CLI returns JSON and an actual nonzero process exit for invalid input', async (t) => {
  const lesson = choiceLesson(); lesson.exerciseLessons[0].presentationMode = 'not-installed';
  const {file} = await withFixture(t, lesson);
  const child = spawnSync(process.execPath, [cli, file, '--kind', 'lesson'], {encoding: 'utf8'});
  assert.equal(child.status, 1); assert.equal(JSON.parse(child.stdout).ok, false); assert.equal(child.stderr, '');
});
test('CLI handles malformed JSON and missing files cleanly', async (t) => {
  const {file} = await withFixture(t, {}); await fs.writeFile(file, '{broken');
  assert.equal((await runPreflight([file, '--kind', 'lesson'])).report.errors[0].code, 'INPUT_READ_ERROR');
  assert.equal((await runPreflight([`${file}.missing`, '--kind', 'lesson'])).exitCode, 1);
});
test('package validation without --public-dir makes no media-check claim', async (t) => {
  const {file} = await withFixture(t, renderPackage());
  const result = await runPreflight([file, '--kind', 'package']);
  assert.equal(result.exitCode, 0); assert.equal(result.report.audioChecked, false);
});
test('optional audio existence check accepts non-empty local files only', async (t) => {
  const props = renderPackage(); const {directory, file} = await withFixture(t, props);
  const publicDir = path.join(directory, 'public'); const audio = path.join(publicDir, props.timeline.segments[0].audioSrc);
  await fs.mkdir(path.dirname(audio), {recursive: true}); await fs.writeFile(audio, 'fixture bytes, not a decoded WAV');
  const result = await runPreflight([file, '--kind', 'package', '--public-dir', publicDir]);
  assert.equal(result.exitCode, 0); assert.equal(result.report.audioChecked, true);
  await fs.writeFile(audio, '');
  assert.equal((await runPreflight([file, '--kind', 'package', '--public-dir', publicDir])).report.errors[0].code, 'INVALID_AUDIO_FILE');
});
test('missing audio is reported without touching other files', async (t) => {
  const {directory, file} = await withFixture(t, renderPackage());
  const result = await runPreflight([file, '--kind', 'package', '--public-dir', directory]);
  assert.equal(result.exitCode, 1); assert.equal(result.report.errors[0].code, 'AUDIO_READ_ERROR');
});
test('audio links cannot escape the configured public directory', async (t) => {
  const props = renderPackage(); const {directory, file} = await withFixture(t, props);
  const publicDir = path.join(directory, 'public'); const audio = path.join(publicDir, props.timeline.segments[0].audioSrc);
  await fs.mkdir(path.dirname(audio), {recursive: true});
  const outside = path.join(directory, 'outside.wav'); await fs.writeFile(outside, 'outside'); await fs.symlink(outside, audio);
  const result = await runPreflight([file, '--kind', 'package', '--public-dir', publicDir]);
  assert.equal(result.exitCode, 1); assert.equal(result.report.errors[0].code, 'AUDIO_OUTSIDE_PUBLIC');
});
