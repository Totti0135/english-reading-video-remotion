#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

const repoRoot = process.cwd();
const skillName = 'produce-english-reading-video-remotion';
const stateFile = path.join(repoRoot, '.claude', 'skills', '.english-reading-remotion-sync.json');
const errors = [];

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

if (!(await exists(stateFile))) {
  console.error(`Missing ${stateFile}. Run sync-to-claude-code.mjs first.`);
  process.exit(2);
}

const state = JSON.parse(await fs.readFile(stateFile, 'utf8'));
const target = path.join(repoRoot, state.target || '');
if (!(await exists(path.join(target, 'SKILL.md')))) errors.push('snapshot is missing SKILL.md');
else if (await hashDirectory(target) !== state.sha256) errors.push('snapshot hash mismatch');

if (errors.length === 0) {
  for (const markdownFile of (await listFiles(target)).filter((file) => file.relative.endsWith('.md'))) {
    const text = await fs.readFile(markdownFile.absolute, 'utf8');
    // Built at runtime so the sync rewrite cannot flip this needle inside the snapshot copy.
    if (text.includes(['.agents', 'skills', skillName].join('/'))) {
      errors.push(`${markdownFile.relative}: canonical .agents path was not rewritten`);
    }
    for (const match of text.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
      const link = match[1].trim().replace(/^<|>$/g, '').split('#')[0];
      if (!link || /^(?:https?:|mailto:|#)/.test(link)) continue;
      if (!(await exists(path.resolve(path.dirname(markdownFile.absolute), link)))) {
        errors.push(`${markdownFile.relative}: missing relative link ${match[1]}`);
      }
    }
  }
}

console.log(JSON.stringify({ok: errors.length === 0, target: state.target, sha256: state.sha256, errors}, null, 2));
process.exit(errors.length === 0 ? 0 : 1);
