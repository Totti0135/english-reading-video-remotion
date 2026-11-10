#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const skillName = 'produce-english-reading-video-remotion';
const source = path.join(repoRoot, '.agents', 'skills', skillName);
const claudeRoot = path.join(repoRoot, '.claude', 'skills');
const target = path.join(claudeRoot, skillName);
const temporary = path.join(claudeRoot, `.${skillName}.syncing`);
const stateFile = path.join(claudeRoot, '.english-reading-remotion-sync.json');

const exists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const listFiles = async (directory, base = directory) => {
  const entries = await fs.readdir(directory, {withFileTypes: true});
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await listFiles(absolute, base));
    else if (entry.isFile()) files.push({absolute, relative: path.relative(base, absolute)});
  }
  return files;
};

const hashDirectory = async (directory) => {
  const hash = crypto.createHash('sha256');
  for (const file of await listFiles(directory)) {
    hash.update(file.relative);
    hash.update('\0');
    hash.update(await fs.readFile(file.absolute));
    hash.update('\0');
  }
  return hash.digest('hex');
};

if (!(await exists(path.join(source, 'SKILL.md')))) {
  throw new Error(`Run from the repository root; missing ${source}`);
}

let previousState = null;
if (await exists(stateFile)) previousState = JSON.parse(await fs.readFile(stateFile, 'utf8'));
if (await exists(target) && previousState?.target !== path.relative(repoRoot, target)) {
  throw new Error(`Refusing to overwrite unmanaged Claude skill ${target}`);
}

await fs.mkdir(claudeRoot, {recursive: true});
await fs.rm(temporary, {recursive: true, force: true});
await fs.cp(source, temporary, {recursive: true, errorOnExist: true});

for (const file of await listFiles(temporary)) {
  if (!/\.(?:md|yaml|json|mjs)$/.test(file.relative)) continue;
  const original = await fs.readFile(file.absolute, 'utf8');
  // Build the paths at runtime: a contiguous literal here would be rewritten in the
  // snapshot copy of this script, silently turning the rewrite into a no-op.
  const rewritten = original.replaceAll(
    ['.agents', 'skills', skillName].join('/'),
    ['.claude', 'skills', skillName].join('/'),
  );
  if (rewritten !== original) await fs.writeFile(file.absolute, rewritten, 'utf8');
}

if (await exists(target)) await fs.rm(target, {recursive: true, force: true});
await fs.rename(temporary, target);

const state = {
  version: 1,
  generatedAt: new Date().toISOString(),
  source: path.relative(repoRoot, source),
  target: path.relative(repoRoot, target),
  sha256: await hashDirectory(target),
  note: 'Snapshot of the repository-native Remotion English reading skill.',
};
await fs.writeFile(stateFile, `${JSON.stringify(state, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({ok: true, stateFile: path.relative(repoRoot, stateFile), ...state}, null, 2));
