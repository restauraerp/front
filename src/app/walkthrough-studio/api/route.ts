/**
 * Reads and writes the walkthrough copy files, for the studio page next door.
 *
 * Local only, and refused outright anywhere else. The whole arrangement rests
 * on git being the source of truth: copy is edited on somebody's machine, the
 * XML changes on disk, and the change is reviewed and pushed like any other.
 * A production instance has no repository to write into and no reviewer on the
 * other side of the edit, so the endpoint does not exist there at all.
 */
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { tours, type TourKind } from '@/lib/walkthrough/tours';

export const dynamic = 'force-dynamic';

const KINDS: TourKind[] = ['demo', 'trial'];
const ROOT = process.cwd();

/** 404 rather than 403: in production this route is simply not part of the app. */
const OFF = process.env.NODE_ENV === 'production';

type Words = { en: string; bn: string };
type StepEdit = { key: string; title: Words; body: Words };
type MissionEdit = { id: string; title: Words; steps: StepEdit[] };

/**
 * The tour as the studio shows it: mission order and step order from tours.ts,
 * words from the compiled copy.
 *
 * Read through the tour rather than straight off the XML on purpose. The list
 * somebody edits is then the list the product will actually draw - a step left
 * in the XML after its beat was deleted does not appear, and a beat added
 * without copy shows up as the empty row it is.
 */
function shape(kind: TourKind): MissionEdit[] {
  const missions: MissionEdit[] = [];

  for (const step of tours[kind]) {
    const ref = step.mission;

    if (!ref) continue;

    let mission = missions[missions.length - 1];

    if (!mission || mission.id !== ref.id) {
      mission = { id: ref.id, title: { ...ref.title }, steps: [] };
      missions.push(mission);
    }

    mission.steps.push({
      // Without the mission in front of it, which is how it is written in the file.
      key: step.key.slice(ref.id.length + 1),
      title: { ...step.title },
      body: { ...step.body },
    });
  }

  return missions;
}

const escape = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** One language of one tour, emitted in the shape the compiler expects to read. */
function render(kind: TourKind, language: 'en' | 'bn', missions: MissionEdit[]): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<tour kind="${kind}" language="${language}"`,
    '      xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"',
    '      xsi:noNamespaceSchemaLocation="../walkthrough.xsd">',
  ];

  for (const mission of missions) {
    lines.push('', `  <mission id="${mission.id}">`, `    <title>${escape(mission.title[language])}</title>`);

    for (const step of mission.steps) {
      lines.push(
        '',
        `    <step key="${step.key}">`,
        `      <title>${escape(step.title[language])}</title>`,
        `      <body>${escape(step.body[language])}</body>`,
        '    </step>',
      );
    }

    lines.push('  </mission>');
  }

  lines.push('</tour>', '');

  return lines.join('\n');
}

/** The compiler, run as its own process so the studio and a terminal agree. */
function compile(): Promise<{ ok: boolean; output: string }> {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [path.join(ROOT, 'scripts/walkthrough-copy.mjs')], { cwd: ROOT });
    let output = '';

    child.stdout.on('data', (chunk) => (output += chunk));
    child.stderr.on('data', (chunk) => (output += chunk));
    child.on('close', (code) => resolve({ ok: code === 0, output: output.trim() }));
  });
}

export async function GET() {
  if (OFF) return new Response('Not found', { status: 404 });

  return Response.json({
    tours: Object.fromEntries(KINDS.map((kind) => [kind, shape(kind)])),
  });
}

export async function PUT(request: Request) {
  if (OFF) return new Response('Not found', { status: 404 });

  let payload: { kind?: string; missions?: MissionEdit[] };

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'That was not JSON.' }, { status: 400 });
  }

  const kind = payload.kind as TourKind;

  if (!KINDS.includes(kind)) {
    return Response.json({ error: `There is no "${payload.kind}" tour.` }, { status: 400 });
  }

  const missions = payload.missions;

  if (!Array.isArray(missions) || missions.length === 0) {
    return Response.json({ error: 'No missions were sent.' }, { status: 400 });
  }

  /*
   * The edit has to cover the tour exactly.
   *
   * A save that is missing a step would write a file the compiler then refuses,
   * leaving the checkout with copy that does not build - and the person who
   * caused it looking at a screen that said "saved". Checked before anything is
   * written, against the tour rather than against the file being replaced.
   */
  const expected = shape(kind);
  const wanted = expected.flatMap((mission) => mission.steps.map((step) => `${mission.id}.${step.key}`)).sort();
  const got = missions.flatMap((mission) => (mission.steps ?? []).map((step) => `${mission.id}.${step.key}`)).sort();

  if (wanted.join(' ') !== got.join(' ')) {
    return Response.json(
      { error: 'The edit does not cover the same steps as the tour. Reload the page and try again.' },
      { status: 409 },
    );
  }

  const empty = missions.find((mission) =>
    !mission.title?.en?.trim()
    || !mission.title?.bn?.trim()
    || mission.steps.some((step) => !step.title?.en?.trim() || !step.title?.bn?.trim()
      || !step.body?.en?.trim() || !step.body?.bn?.trim()),
  );

  if (empty) {
    return Response.json(
      { error: `Mission "${empty.id}" has something blank in it. Every step needs both languages.` },
      { status: 422 },
    );
  }

  const files: Array<[string, string]> = [
    [path.join(ROOT, 'walkthrough', kind, 'tour.xml'), render(kind, 'en', missions)],
    [path.join(ROOT, 'walkthrough', kind, 'bn.xml'), render(kind, 'bn', missions)],
  ];

  // Held so a compile failure can put the files back. The compiler writes
  // nothing when it refuses, so without this a bad save would leave the XML
  // broken and the generated module still holding the previous copy - two
  // different answers to "what does this step say".
  const before = await Promise.all(files.map(([file]) => readFile(file, 'utf8')));

  await Promise.all(files.map(([file, contents]) => writeFile(file, contents, 'utf8')));

  const result = await compile();

  if (!result.ok) {
    await Promise.all(files.map(([file], index) => writeFile(file, before[index], 'utf8')));

    return Response.json(
      { error: 'The copy did not compile, so nothing was changed.', output: result.output },
      { status: 422 },
    );
  }

  return Response.json({ ok: true, output: result.output, files: files.map(([file]) => path.relative(ROOT, file)) });
}
