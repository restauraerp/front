#!/usr/bin/env node
/**
 * Fails the build when a NEXT_PUBLIC_* variable the code reads is missing.
 *
 * Why this exists
 * ---------------
 * Next replaces `process.env.NEXT_PUBLIC_X` with a literal string at BUILD
 * time. A variable that is absent from the build environment does not throw
 * and does not warn - it compiles to `undefined`, the `|| ''` fallback next to
 * it turns that into an empty string, and the feature guarded by it silently
 * stops existing in the shipped bundle.
 *
 * That is not hypothetical. The production deploy built without an env file
 * for months: NEXT_PUBLIC_WEBSITE_URL was empty, so ConversionBanner returned
 * null and no trial or demo account ever saw the upgrade prompt. Google Maps
 * autocomplete and the Meta pixel were dead for the same reason. Every deploy
 * went green.
 *
 * Wired into `npm run build`, so it is impossible to produce a bundle - here
 * or in CI - with a required public variable missing.
 *
 * Adding a new NEXT_PUBLIC_* variable
 * -----------------------------------
 * List it below as required or optional. An unlisted one fails the build on
 * purpose: deciding whether a feature may quietly disappear is a decision, not
 * a default.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

// CommonJS, so the named export has to come off the default.
import nextEnv from '@next/env';

const { loadEnvConfig } = nextEnv;

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Without these the app is broken, so a build without them is worse than no build. */
const REQUIRED = {
  NEXT_PUBLIC_API_URL: 'every API call is relative to it; empty means nothing loads',
  NEXT_PUBLIC_TENANT_ID: 'names the restaurant the public storefront serves',
  NEXT_PUBLIC_WEBSITE_URL: 'the trial/demo upgrade banner hides itself when unset',
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: 'address autocomplete falls back to a plain text box',
};

/** Genuinely optional: the code already checks for them and no-ops. */
const OPTIONAL = {
  NEXT_PUBLIC_GTM_ID: 'analytics only; layout.tsx skips the tag when unset',
  NEXT_PUBLIC_FACEBOOK_PIXEL_ID: 'analytics only; FacebookPixel renders nothing when unset',
};

/** Supplied by next.config.ts rather than any env file, so never expected here. */
const INJECTED = {
  NEXT_PUBLIC_APP_VERSION: 'written by next.config.ts from package.json',
};

const SCAN_DIRS = ['src'];
const SCAN_FILES = ['next.config.ts'];
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs']);

/** Every NEXT_PUBLIC_* name the source actually reads, mapped to where it is read. */
function findReferences() {
  const found = new Map();

  const record = (file) => {
    const text = readFileSync(file, 'utf8');
    for (const match of text.matchAll(/process\.env\.(NEXT_PUBLIC_[A-Z0-9_]+)/g)) {
      const where = found.get(match[1]) ?? new Set();
      where.add(relative(ROOT, file));
      found.set(match[1], where);
    }
  };

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      if (entry === 'node_modules' || entry.startsWith('.')) continue;
      const path = join(dir, entry);
      if (statSync(path).isDirectory()) walk(path);
      else if (SCAN_EXTENSIONS.has(extname(path))) record(path);
    }
  };

  SCAN_DIRS.map((d) => join(ROOT, d)).forEach(walk);
  SCAN_FILES.map((f) => join(ROOT, f)).forEach(record);

  return found;
}

// Load exactly what `next build` will load: .env.production, .env.local, .env
// and friends, layered under anything already exported in the shell.
loadEnvConfig(ROOT, false, { info: () => {}, error: () => {} });

const references = findReferences();
const errors = [];
const warnings = [];

for (const [name, files] of references) {
  const where = [...files].join(', ');

  if (name in INJECTED) continue;

  if (!(name in REQUIRED) && !(name in OPTIONAL)) {
    errors.push(
      `${name} is read in ${where} but is not classified.\n` +
        '    Add it to REQUIRED or OPTIONAL in scripts/check-public-env.mjs.',
    );
    continue;
  }

  if (name in REQUIRED && !process.env[name]) {
    errors.push(`${name} is empty - ${REQUIRED[name]}.\n    Read in ${where}.`);
  }
}

for (const name of [...Object.keys(REQUIRED), ...Object.keys(OPTIONAL)]) {
  if (!references.has(name)) {
    warnings.push(`${name} is listed here but nothing reads it any more - drop it?`);
  }
}

for (const warning of warnings) {
  console.warn(`\x1b[33mwarn\x1b[0m  ${warning}`);
}

if (errors.length > 0) {
  console.error('\n\x1b[31mBuild stopped: public environment is incomplete.\x1b[0m\n');
  for (const error of errors) {
    console.error(`  - ${error}\n`);
  }
  console.error(
    'These are baked into the client bundle at build time, so a missing one\n' +
      'ships a silently broken feature rather than failing at runtime.\n\n' +
      'Locally: add it to .env. In CI: add it to /var/www/front/shared/.env on\n' +
      'the deploy host, which the workflow pulls in before building.\n',
  );
  process.exit(1);
}

console.log(`\x1b[32m✓\x1b[0m public env complete (${Object.keys(REQUIRED).length} required present)`);
