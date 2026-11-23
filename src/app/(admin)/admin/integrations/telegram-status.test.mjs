import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { getRiderTelegramStatus } from './telegram-status.js';

describe('Telegram Status Formatting & Status Badges', () => {
  test('returns unlinked for null or empty rider', () => {
    assert.deepEqual(getRiderTelegramStatus(null), {
      status: 'unlinked',
      label: 'Not connected',
      badgeClass: 'badge-ghost',
      actionLabel: 'Copy onboarding link',
    });
    assert.deepEqual(getRiderTelegramStatus(undefined), {
      status: 'unlinked',
      label: 'Not connected',
      badgeClass: 'badge-ghost',
      actionLabel: 'Copy onboarding link',
    });
  });

  test('returns connected when linked is true', () => {
    const res = getRiderTelegramStatus({
      linked: true,
      telegram_username: 'rider_sam',
    });
    assert.equal(res.status, 'connected');
    assert.equal(res.label, 'Connected');
    assert.equal(res.badgeClass, 'badge-success');
    assert.equal(res.actionLabel, 'Send test');
  });

  test('returns blocked / unreachable when telegram_last_error is present and not linked', () => {
    const res = getRiderTelegramStatus({
      linked: false,
      telegram_last_error: 'Forbidden: bot was blocked by the user',
    });
    assert.equal(res.status, 'blocked');
    assert.equal(res.label, 'Blocked / Unreachable');
    assert.equal(res.badgeClass, 'badge-error');
    assert.equal(res.subtext, 'Forbidden: bot was blocked by the user');
    assert.equal(res.actionLabel, 'Reconnect link');
  });

  test('returns pending when link_expires_at is present without error or link', () => {
    const res = getRiderTelegramStatus({
      linked: false,
      link_expires_at: '2026-11-25T12:00:00Z',
    });
    assert.equal(res.status, 'pending');
    assert.equal(res.label, 'Link sent');
    assert.equal(res.badgeClass, 'badge-warning');
    assert.equal(res.actionLabel, 'New link');
  });

  test('returns unlinked when not linked, no error, and no active link', () => {
    const res = getRiderTelegramStatus({
      linked: false,
      link_expires_at: null,
      telegram_last_error: null,
    });
    assert.equal(res.status, 'unlinked');
    assert.equal(res.label, 'Not connected');
    assert.equal(res.badgeClass, 'badge-ghost');
    assert.equal(res.actionLabel, 'Copy onboarding link');
  });
});
