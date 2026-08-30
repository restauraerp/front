#!/usr/bin/env node
/**
 * Turns the walkthrough copy files into the module the tours import.
 *
 * A compiler, not a merge - the same rule the campaign XML follows. The files
 * under walkthrough/ are the only place this copy is written; the generated
 * module is an artefact of them and is overwritten in full on every run. Edit
 * the artefact and the next run of this script silently discards the edit,
 * which is exactly the outcome that keeps git the source of truth.
 *
 * Run it with `npm run walkthrough:copy`. `npm run dev` and `npm run build`
 * both run it first, so a checkout is never a compile behind its own files.
 *
 * Every failure here is loud. A missing Bengali step is not something to paper
 * over with the English string: it would ship, look fine to everybody who
 * reviews it in English, and be discovered by a Bengali-speaking restaurant.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { XMLParser } from 'fast-xml-parser';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KINDS = ['demo', 'trial'];
const LANGUAGES = { en: 'tour.xml', bn: 'bn.xml' };
const OUT = resolve(root, 'src/lib/walkthrough/copy.generated.ts');

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@',
  // Every step and mission arrives as an array even when a tour has one of
  // them, so nothing downstream has to ask which shape it got.
  isArray: (name) => name === 'mission' || name === 'step',
  // Copy is prose. "1.5x" and "2026" are strings, and a parser that helpfully
  // makes them numbers turns a title into something that will not concatenate.
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

const problems = [];

/** One language of one tour, as { missions, steps } keyed the way tours.ts asks. */
function read(kind, language) {
  const path = resolve(root, 'walkthrough', kind, LANGUAGES[language]);
  let doc;

  try {
    doc = parser.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    problems.push(`${kind}/${LANGUAGES[language]} is not readable as XML: ${error.message}`);

    return null;
  }

  const tour = doc.tour;

  if (!tour) {
    problems.push(`${kind}/${LANGUAGES[language]} has no <tour> element.`);

    return null;
  }

  // Checked rather than trusted: these two attributes are the only thing that
  // says which file you are looking at, and a copied-and-renamed file with the
  // old kind still in it would quietly overwrite the other tour.
  if (tour['@kind'] !== kind) {
    problems.push(`${kind}/${LANGUAGES[language]} says kind="${tour['@kind']}" but lives in the ${kind} folder.`);
  }

  if (tour['@language'] !== language) {
    problems.push(`${kind}/${LANGUAGES[language]} says language="${tour['@language']}" but is the ${language} file.`);
  }

  const missions = {};
  const steps = {};

  for (const mission of tour.mission ?? []) {
    const id = mission['@id'];

    if (!id) {
      problems.push(`${kind}/${LANGUAGES[language]} has a <mission> with no id.`);
      continue;
    }

    if (missions[id] !== undefined) {
      problems.push(`${kind}/${LANGUAGES[language]} has two missions with id "${id}".`);
    }

    missions[id] = String(mission.title ?? '');

    for (const step of mission.step ?? []) {
      const key = step['@key'];

      if (!key) {
        problems.push(`${kind}/${LANGUAGES[language]} has a <step> with no key, in mission "${id}".`);
        continue;
      }

      const full = `${id}.${key}`;

      if (steps[full] !== undefined) {
        problems.push(`${kind}/${LANGUAGES[language]} has two steps keyed "${full}".`);
      }

      steps[full] = { title: String(step.title ?? ''), body: String(step.body ?? '') };
    }
  }

  return { missions, steps };
}

/** English is the shape every other language has to match, key for key. */
function reconcile(kind, en, bn) {
  const missions = {};
  const steps = {};

  for (const [id, title] of Object.entries(en.missions)) {
    if (bn.missions[id] === undefined) {
      problems.push(`${kind}: mission "${id}" has no Bengali title.`);
      continue;
    }

    missions[id] = { en: title, bn: bn.missions[id] };
  }

  for (const [key, words] of Object.entries(en.steps)) {
    const other = bn.steps[key];

    if (other === undefined) {
      problems.push(`${kind}: step "${key}" is missing from bn.xml.`);
      continue;
    }

    steps[key] = {
      title: { en: words.title, bn: other.title },
      body: { en: words.body, bn: other.body },
    };

    if (!words.title || !words.body) problems.push(`${kind}: step "${key}" has an empty English title or body.`);
    if (!other.title || !other.body) problems.push(`${kind}: step "${key}" has an empty Bengali title or body.`);
  }

  // The other direction, so a step deleted from tour.xml but left in bn.xml is
  // reported rather than carried around for ever as copy nothing can reach.
  for (const key of Object.keys(bn.steps)) {
    if (en.steps[key] === undefined) problems.push(`${kind}: step "${key}" is in bn.xml but not in tour.xml.`);
  }

  for (const id of Object.keys(bn.missions)) {
    if (en.missions[id] === undefined) problems.push(`${kind}: mission "${id}" is in bn.xml but not in tour.xml.`);
  }

  return { missions, steps };
}

const compiled = {};

for (const kind of KINDS) {
  const en = read(kind, 'en');
  const bn = read(kind, 'bn');

  if (en && bn) compiled[kind] = reconcile(kind, en, bn);
}

if (problems.length > 0) {
  console.error('The walkthrough copy did not compile:\n');
  for (const problem of problems) console.error('  - ' + problem);
  console.error('\nNothing was written. src/lib/walkthrough/copy.generated.ts still holds the last good copy.');
  process.exit(1);
}

const banner = `/* eslint-disable */
/**
 * Generated from walkthrough/{demo,trial}/{tour,bn}.xml - do not edit.
 *
 * Run \`npm run walkthrough:copy\` after changing those files, or just start the
 * dev server, which does it for you. Edits made here are lost on the next run.
 */
`;

const body = `
export type Words = { en: string; bn: string };
export type StepCopy = { title: Words; body: Words };

export const copy: Record<'demo' | 'trial', {
  missions: Record<string, Words>;
  steps: Record<string, StepCopy>;
}> = ${JSON.stringify(compiled, null, 2)};
`;

writeFileSync(OUT, banner + body);

const counted = KINDS.map((kind) => `${kind}: ${Object.keys(compiled[kind].steps).length} steps`).join(', ');
console.log(`Walkthrough copy compiled (${counted}).`);
