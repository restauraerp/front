import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

function resolveConversionAudience(status) {
  const isDemo = status?.is_demo === true;
  const isTrial = status?.tenant_status === 'trialing' && status?.demo_restaurant !== true;
  const isSubscribedExpiringSoon = status?.tenant_status === 'active'
    && status?.demo_restaurant !== true
    && (status?.expiring_soon === true || (status?.days_until_expiry !== null && status?.days_until_expiry !== undefined && status.days_until_expiry <= 3 && status.days_until_expiry >= 0));

  return isTrial ? 'trial' : isDemo ? 'demo' : isSubscribedExpiringSoon ? 'expiring' : null;
}

function getExpiringMessage(status) {
  const subDaysLeft = status?.days_until_expiry ?? null;
  const subEndsAt = status?.expires_at ? new Date(status.expires_at) : null;
  const subEndsOn = subEndsAt && !Number.isNaN(subEndsAt.getTime())
    ? subEndsAt.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    : null;

  if (subDaysLeft !== null && subDaysLeft <= 0) {
    return 'Your subscription ends today.';
  }
  if (subDaysLeft === 1) {
    return 'Your subscription ends tomorrow.';
  }
  if (subEndsOn) {
    return `Your subscription ends on ${subEndsOn} (${subDaysLeft} days left).`;
  }
  return 'Your subscription is ending soon.';
}

function shouldShowSubscriptionBanner(status) {
  if (!status) return false;
  const isExpiringSoon = status.expiring_soon === true || (status.state === 'full' && status.days_until_expiry !== null && status.days_until_expiry !== undefined && status.days_until_expiry <= 3 && status.days_until_expiry >= 0);
  if (status.state === 'full' && !isExpiringSoon) return false;
  return Boolean(status.message);
}

function getSubscriptionBannerToneAndAction(status) {
  const readOnly = status.state === 'read_only' || status.state === 'blocked';
  return {
    readOnly,
    tone: readOnly ? 'alert-error' : 'alert-warning',
    title: readOnly ? 'Saving is paused' : (status.expiring_soon ? 'Subscription expiring soon' : 'Action needed to keep saving'),
    actionLabel: readOnly ? 'Renew to restore saving' : 'Renew for next month',
  };
}

describe('Subscription Banner & Expiry Notifications', () => {
  test('notifies subscribed user 3 days before expiry in conversion banner', () => {
    const status = {
      state: 'full',
      tenant_status: 'active',
      plan: 'growth',
      days_until_expiry: 3,
      expiring_soon: true,
      expires_at: '2026-11-26T12:00:00Z',
    };

    assert.equal(resolveConversionAudience(status), 'expiring');
    const msg = getExpiringMessage(status);
    assert.match(msg, /3 days left/);
  });

  test('notifies subscribed user 1 day before expiry', () => {
    const status = {
      state: 'full',
      tenant_status: 'active',
      days_until_expiry: 1,
      expiring_soon: true,
    };

    assert.equal(resolveConversionAudience(status), 'expiring');
    assert.equal(getExpiringMessage(status), 'Your subscription ends tomorrow.');
  });

  test('notifies subscribed user on the day of expiry', () => {
    const status = {
      state: 'full',
      tenant_status: 'active',
      days_until_expiry: 0,
      expiring_soon: true,
    };

    assert.equal(resolveConversionAudience(status), 'expiring');
    assert.equal(getExpiringMessage(status), 'Your subscription ends today.');
  });

  test('does not show expiry prompt if expiry is more than 3 days away', () => {
    const status = {
      state: 'full',
      tenant_status: 'active',
      days_until_expiry: 15,
      expiring_soon: false,
    };

    assert.equal(resolveConversionAudience(status), null);
    assert.equal(shouldShowSubscriptionBanner(status), false);
  });

  test('subscription banner renders warning with direct renew button when expiring soon', () => {
    const status = {
      state: 'full',
      tenant_status: 'active',
      days_until_expiry: 2,
      expiring_soon: true,
      message: 'Your subscription ends in 2 days. Renew now to continue using the application without interruption.',
    };

    assert.equal(shouldShowSubscriptionBanner(status), true);
    const config = getSubscriptionBannerToneAndAction(status);
    assert.equal(config.readOnly, false);
    assert.equal(config.tone, 'alert-warning');
    assert.equal(config.title, 'Subscription expiring soon');
    assert.equal(config.actionLabel, 'Renew for next month');
  });

  test('subscription banner renders error with direct renew button when expired in read_only mode', () => {
    const status = {
      state: 'read_only',
      tenant_status: 'active',
      days_until_expiry: -1,
      expiring_soon: false,
      message: 'Your monthly subscription ended, so new data cannot be saved. Everything is still readable.',
    };

    assert.equal(shouldShowSubscriptionBanner(status), true);
    const config = getSubscriptionBannerToneAndAction(status);
    assert.equal(config.readOnly, true);
    assert.equal(config.tone, 'alert-error');
    assert.equal(config.title, 'Saving is paused');
    assert.equal(config.actionLabel, 'Renew to restore saving');
  });
});
