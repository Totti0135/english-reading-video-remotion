#!/usr/bin/env node
// Opt-in preflight, not a replacement for narration, ASR, media, or visual QC gates.
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {validateExerciseContract} from '../src/english-reading/model/exercise-contract.mjs';
import {validateRenderContract} from '../src/english-reading/runtime/exercise-timeline.mjs';

const usage = 'Usage: node scripts/validate-english-reading.mjs <file.json> --kind lesson|package [--source] [--public-dir public] [--warnings-as-errors]';
const inside = (parent, child) => {
  const relative = path.relative(parent, child);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};

export async function runPreflight(argv) {
  let file = null;
  let kind = null;
  let publicDirectory = null;
  let sourceOnly = false;
  let warningsAsErrors = false;
  const seen = new Set();
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') return {exitCode: 0, report: {usage}};
    if (!arg.startsWith('--')) {
      if (file !== null) return {exitCode: 2, report: {ok: false, usage, error: 'only one input file is allowed'}};
      file = arg;
      continue;
    }
    if (seen.has(arg)) return {exitCode: 2, report: {ok: false, usage, error: `duplicate argument ${arg}`}};
    seen.add(arg);
    if (arg === '--source') sourceOnly = true;
    else if (arg === '--warnings-as-errors') warningsAsErrors = true;
    else if (arg === '--kind' || arg === '--public-dir') {
      const value = argv[++index];
      if (!value || value.startsWith('--')) return {exitCode: 2, report: {ok: false, usage, error: `missing value for ${arg}`}};
      if (arg === '--kind') kind = value;
      else publicDirectory = value;
    } else return {exitCode: 2, report: {ok: false, usage, error: `unknown argument ${arg}`}};
  }
  if (!file || !['lesson', 'package'].includes(kind) || (sourceOnly && kind !== 'lesson') || (publicDirectory !== null && kind !== 'package')) {
    return {exitCode: 2, report: {ok: false, usage, error: 'choose an explicit input kind; --source is lesson-only and --public-dir is package-only'}};
  }
  let input;
  try {
    input = JSON.parse(await fs.readFile(file, 'utf8'));
  } catch (error) {
    return {exitCode: 1, report: {ok: false, file: path.resolve(file), errors: [{code: 'INPUT_READ_ERROR', path: 'input', message: error.message}], warnings: []}};
  }
  const result = kind === 'lesson' ? validateExerciseContract(input, {requireAnswers: !sourceOnly}) : validateRenderContract(input);
  const errors = [...result.errors];
  const warnings = [...result.warnings];
  let audioChecked = false;
  if (result.ok && publicDirectory !== null) {
    let root;
    try {
      root = await fs.realpath(publicDirectory);
      if (!(await fs.stat(root)).isDirectory()) throw new Error('public path is not a directory');
    } catch (error) {
      errors.push({code: 'INVALID_PUBLIC_DIRECTORY', path: 'publicDirectory', message: error.message});
    }
    if (root && errors.length === 0) {
      audioChecked = true;
      for (const [index, segment] of input.timeline.segments.entries()) {
        const at = `timeline.segments[${index}].audioSrc`;
        const requested = path.resolve(root, segment.audioSrc);
        if (!inside(root, requested)) {
          errors.push({code: 'AUDIO_OUTSIDE_PUBLIC', path: at, message: 'audio path escapes the public directory'});
          continue;
        }
        try {
          // Resolve symlinks as well as '..'; do not accept an external file through a link.
          const actual = await fs.realpath(requested);
          if (!inside(root, actual)) {
            errors.push({code: 'AUDIO_OUTSIDE_PUBLIC', path: at, message: 'audio symlink escapes the public directory'});
            continue;
          }
          const stat = await fs.stat(actual);
          if (!stat.isFile() || stat.size === 0) errors.push({code: 'INVALID_AUDIO_FILE', path: at, message: 'audio must be a non-empty regular file'});
        } catch (error) {
          errors.push({code: 'AUDIO_READ_ERROR', path: at, message: error.message});
        }
      }
    }
  }
  const ok = errors.length === 0 && (!warningsAsErrors || warnings.length === 0);
  return {
    exitCode: ok ? 0 : 1,
    report: {
      ok, file: path.resolve(file), kind, sourceOnly, warningsAsErrors,
      scope: 'exercise-and-timeline-preflight', audioChecked,
      // Passing this check does NOT prove that the old renderer has been integrated,
      // that an audio file decodes, or that a layout has passed visual inspection.
      productionRendererIntegrated: false,
      errors, warnings,
    },
  };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await runPreflight(process.argv.slice(2));
    console.log(JSON.stringify(result.report, null, 2));
    process.exitCode = result.exitCode;
  } catch (error) {
    console.log(JSON.stringify({ok: false, errors: [{code: 'PREFLIGHT_ERROR', path: 'input', message: error.message}], warnings: []}, null, 2));
    process.exitCode = 1;
  }
}
