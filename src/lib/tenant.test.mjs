import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export const TENANT_COOKIE = 'tenant';
export const DEFAULT_TENANT = 'demo_restaurant';

export function createTenantManager(mockCookie = '', defaultTenant = DEFAULT_TENANT) {
  let cookieStore = mockCookie;

  function readCookie(name) {
    const match = cookieStore.match(new RegExp('(^|; )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function getTenant(serverTenant) {
    return serverTenant || readCookie(TENANT_COOKIE) || defaultTenant || null;
  }

  function getSavedTenant() {
    return readCookie(TENANT_COOKIE);
  }

  function setTenant(slug) {
    cookieStore = `${TENANT_COOKIE}=${encodeURIComponent(slug)}; path=/; max-age=86400; SameSite=Lax`;
  }

  function clearTenant() {
    cookieStore = '';
  }

  function tenantKey(key, serverTenant) {
    const tenant = getTenant(serverTenant) || 'unknown';
    return `${key}::${tenant}`;
  }

  return {
    getTenant,
    getSavedTenant,
    setTenant,
    clearTenant,
    tenantKey,
    getCookieStore: () => cookieStore,
  };
}

describe('Tenant Resolution & Session Isolation Logic', () => {
  test('falls back to default tenant when no cookie or server tenant is provided', () => {
    const manager = createTenantManager('', 'test_branch');
    assert.strictEqual(manager.getTenant(), 'test_branch');
  });

  test('serverTenant always takes priority over cookie and default tenant', () => {
    const manager = createTenantManager('tenant=cookie_tenant', 'default_tenant');
    assert.strictEqual(manager.getTenant('server_override'), 'server_override');
  });

  test('cookie tenant takes precedence over default tenant', () => {
    const manager = createTenantManager('tenant=active_session', 'default_tenant');
    assert.strictEqual(manager.getTenant(), 'active_session');
  });

  test('getSavedTenant returns null when no cookie is set (avoiding storefront leak)', () => {
    const manager = createTenantManager('', 'demo_restaurant');
    assert.strictEqual(manager.getSavedTenant(), null);
  });

  test('getSavedTenant returns the signed-in tenant from cookie', () => {
    const manager = createTenantManager('tenant=my_cafe', 'demo_restaurant');
    assert.strictEqual(manager.getSavedTenant(), 'my_cafe');
  });

  test('setTenant sets tenant cookie with proper encoding and max-age', () => {
    const manager = createTenantManager();
    manager.setTenant('chittagong_branch');
    assert.ok(manager.getCookieStore().includes('tenant=chittagong_branch'));
    assert.strictEqual(manager.getTenant(), 'chittagong_branch');
  });

  test('clearTenant resets the tenant cookie', () => {
    const manager = createTenantManager('tenant=logged_in');
    assert.strictEqual(manager.getTenant(), 'logged_in');
    manager.clearTenant();
    assert.strictEqual(manager.getSavedTenant(), null);
    assert.strictEqual(manager.getTenant(), DEFAULT_TENANT);
  });

  test('tenantKey namespaces localStorage keys to prevent cross-tenant data leakage', () => {
    const manager = createTenantManager('tenant=branch_1');
    assert.strictEqual(manager.tenantKey('restora_active_location_id'), 'restora_active_location_id::branch_1');

    manager.setTenant('branch_2');
    assert.strictEqual(manager.tenantKey('restora_active_location_id'), 'restora_active_location_id::branch_2');
  });
});
