import { test, describe, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';

import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(new URL('../scripts/prune-releases.sh', import.meta.url));

describe('Deployment Release Pruning (Option B Guarded Pruning)', () => {
  let tmpAppDir;
  let releasesDir;

  beforeEach(() => {
    tmpAppDir = fs.mkdtempSync(path.join(os.tmpdir(), 'front-deploy-test-'));
    releasesDir = path.join(tmpAppDir, 'releases');
    fs.mkdirSync(releasesDir, { recursive: true });
  });

  afterEach(() => {
    if (fs.existsSync(tmpAppDir)) {
      fs.rmSync(tmpAppDir, { recursive: true, force: true });
    }
  });

  const createMockRelease = (name, delayMs = 50) => {
    const dirPath = path.join(releasesDir, name);
    fs.mkdirSync(dirPath, { recursive: true });
    // Write a dummy file to give it content
    fs.writeFileSync(path.join(dirPath, 'package.json'), '{}');
    // Ensure distinct timestamps
    const now = Date.now();
    fs.utimesSync(dirPath, new Date(now), new Date(now));
    return dirPath;
  };

  test('keeps the 3 most recent releases and deletes older ones when 5 exist', () => {
    // Create 5 releases from oldest to newest
    createMockRelease('v1.0.0');
    // Set explicit mtime so sorting is deterministic
    fs.utimesSync(path.join(releasesDir, 'v1.0.0'), new Date('2026-01-01'), new Date('2026-01-01'));

    createMockRelease('v1.0.1');
    fs.utimesSync(path.join(releasesDir, 'v1.0.1'), new Date('2026-01-02'), new Date('2026-01-02'));

    createMockRelease('v1.0.2');
    fs.utimesSync(path.join(releasesDir, 'v1.0.2'), new Date('2026-01-03'), new Date('2026-01-03'));

    createMockRelease('v1.0.3');
    fs.utimesSync(path.join(releasesDir, 'v1.0.3'), new Date('2026-01-04'), new Date('2026-01-04'));

    createMockRelease('v1.0.4');
    fs.utimesSync(path.join(releasesDir, 'v1.0.4'), new Date('2026-01-05'), new Date('2026-01-05'));

    // Symlink current to the newest release v1.0.4
    fs.symlinkSync(path.join(releasesDir, 'v1.0.4'), path.join(tmpAppDir, 'current'));

    const output = execFileSync('bash', [SCRIPT_PATH, tmpAppDir, '3'], { encoding: 'utf8' });

    const remaining = fs.readdirSync(releasesDir).sort();
    assert.deepEqual(remaining, ['v1.0.2', 'v1.0.3', 'v1.0.4'], 'Should retain exactly the 3 newest releases');
    assert.equal(fs.existsSync(path.join(releasesDir, 'v1.0.0')), false, 'v1.0.0 should be deleted');
    assert.equal(fs.existsSync(path.join(releasesDir, 'v1.0.1')), false, 'v1.0.1 should be deleted');
    assert.match(output, /Pruning old release/);
  });

  test('does not delete any releases when total count is <= 3', () => {
    createMockRelease('v1.0.0');
    fs.utimesSync(path.join(releasesDir, 'v1.0.0'), new Date('2026-01-01'), new Date('2026-01-01'));

    createMockRelease('v1.0.1');
    fs.utimesSync(path.join(releasesDir, 'v1.0.1'), new Date('2026-01-02'), new Date('2026-01-02'));

    createMockRelease('v1.0.2');
    fs.utimesSync(path.join(releasesDir, 'v1.0.2'), new Date('2026-01-03'), new Date('2026-01-03'));

    fs.symlinkSync(path.join(releasesDir, 'v1.0.2'), path.join(tmpAppDir, 'current'));

    const output = execFileSync('bash', [SCRIPT_PATH, tmpAppDir, '3'], { encoding: 'utf8' });

    const remaining = fs.readdirSync(releasesDir).sort();
    assert.deepEqual(remaining, ['v1.0.0', 'v1.0.1', 'v1.0.2']);
    assert.match(output, /No releases to prune/);
  });

  test('safely handles when only 1 release exists', () => {
    createMockRelease('v1.0.0');
    fs.symlinkSync(path.join(releasesDir, 'v1.0.0'), path.join(tmpAppDir, 'current'));

    const output = execFileSync('bash', [SCRIPT_PATH, tmpAppDir, '3'], { encoding: 'utf8' });

    assert.deepEqual(fs.readdirSync(releasesDir), ['v1.0.0']);
    assert.match(output, /No releases to prune/);
  });

  test('CRITICAL SAFETY GUARD: never deletes currently active release even if it is an older directory (rollback)', () => {
    createMockRelease('v1.0.0');
    fs.utimesSync(path.join(releasesDir, 'v1.0.0'), new Date('2026-01-01'), new Date('2026-01-01'));

    createMockRelease('v1.0.1');
    fs.utimesSync(path.join(releasesDir, 'v1.0.1'), new Date('2026-01-02'), new Date('2026-01-02'));

    createMockRelease('v1.0.2');
    fs.utimesSync(path.join(releasesDir, 'v1.0.2'), new Date('2026-01-03'), new Date('2026-01-03'));

    createMockRelease('v1.0.3');
    fs.utimesSync(path.join(releasesDir, 'v1.0.3'), new Date('2026-01-04'), new Date('2026-01-04'));

    // Rollback simulation: active release was rolled back to the oldest release v1.0.0
    fs.symlinkSync(path.join(releasesDir, 'v1.0.0'), path.join(tmpAppDir, 'current'));

    const output = execFileSync('bash', [SCRIPT_PATH, tmpAppDir, '3'], { encoding: 'utf8' });

    // v1.0.0 is the active release, so the guard MUST spare it!
    assert.equal(fs.existsSync(path.join(releasesDir, 'v1.0.0')), true, 'Active release must not be deleted!');
    assert.match(output, /Skipping active release/);
  });

  test('fails with error code if required arguments or directories are missing', () => {
    assert.throws(
      () => execFileSync('bash', [SCRIPT_PATH], { encoding: 'utf8' }),
      /APP_DIR argument is required/
    );

    assert.throws(
      () => execFileSync('bash', [SCRIPT_PATH, '/non/existent/path/999'], { encoding: 'utf8' }),
      /does not exist/
    );
  });
});
