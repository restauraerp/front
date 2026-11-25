import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

describe('Waiter Account & No-Login Roles Logic Tests', () => {
  // Test helper replicating roleSignsIn logic
  const roleSignsIn = (role) =>
    !role || !(role.requires_login === false || role.requires_login === 0 || role.requires_login === '0');

  describe('roleSignsIn helper', () => {
    test('returns true for undefined or null role', () => {
      assert.equal(roleSignsIn(undefined), true);
      assert.equal(roleSignsIn(null), true);
    });

    test('returns true for roles requiring login (boolean, integer, string)', () => {
      assert.equal(roleSignsIn({ name: 'pos_manager', requires_login: true }), true);
      assert.equal(roleSignsIn({ name: 'pos_manager', requires_login: 1 }), true);
      assert.equal(roleSignsIn({ name: 'pos_manager', requires_login: '1' }), true);
    });

    test('returns false for roles NOT requiring login like waiter (boolean, integer, string)', () => {
      assert.equal(roleSignsIn({ name: 'waiter', requires_login: false }), false);
      assert.equal(roleSignsIn({ name: 'waiter', requires_login: 0 }), false);
      assert.equal(roleSignsIn({ name: 'waiter', requires_login: '0' }), false);
    });
  });

  describe('Employee form state management on role selection', () => {
    test('selecting waiter role sets can_login to false and resets email & password for new user', () => {
      const prevFormData = {
        name: 'Rafi',
        email: 'rafi@temp.test',
        password: 'password123',
        role: '',
        can_login: true,
        can_deliver: false,
      };

      const selectedRole = { name: 'waiter', requires_login: false };
      const editingId = null; // New user creation

      const signsIn = selectedRole.name === 'restaurant_admin' || roleSignsIn(selectedRole);
      const nextFormData = {
        ...prevFormData,
        role: selectedRole.name,
        can_login: editingId !== null ? prevFormData.can_login : signsIn,
        email: editingId === null && !signsIn ? '' : prevFormData.email,
        password: editingId === null && !signsIn ? '' : prevFormData.password,
        can_deliver: selectedRole.name === 'rider' ? true : prevFormData.can_deliver,
      };

      assert.equal(nextFormData.role, 'waiter');
      assert.equal(nextFormData.can_login, false);
      assert.equal(nextFormData.email, '');
      assert.equal(nextFormData.password, '');
      assert.equal(nextFormData.can_deliver, false);
    });

    test('selecting rider role sets can_deliver to true', () => {
      const prevFormData = {
        name: 'Karim Rider',
        email: 'karim@delivery.test',
        password: 'password123',
        role: '',
        can_login: true,
        can_deliver: false,
      };

      const selectedRole = { name: 'rider', requires_login: true };
      const editingId = null;

      const signsIn = selectedRole.name === 'restaurant_admin' || roleSignsIn(selectedRole);
      const nextFormData = {
        ...prevFormData,
        role: selectedRole.name,
        can_login: editingId !== null ? prevFormData.can_login : signsIn,
        email: editingId === null && !signsIn ? '' : prevFormData.email,
        password: editingId === null && !signsIn ? '' : prevFormData.password,
        can_deliver: selectedRole.name === 'rider' ? true : prevFormData.can_deliver,
      };

      assert.equal(nextFormData.role, 'rider');
      assert.equal(nextFormData.can_login, true);
      assert.equal(nextFormData.can_deliver, true);
    });

    test('selecting restaurant_admin always enforces can_login = true', () => {
      const prevFormData = {
        name: 'Owner',
        email: 'owner@restaurant.test',
        password: 'password123',
        role: 'waiter',
        can_login: false,
        can_deliver: false,
      };

      const selectedRole = { name: 'restaurant_admin', requires_login: true };
      const editingId = null;

      const signsIn = selectedRole.name === 'restaurant_admin' || roleSignsIn(selectedRole);
      const nextFormData = {
        ...prevFormData,
        role: selectedRole.name,
        can_login: editingId !== null ? prevFormData.can_login : signsIn,
        email: editingId === null && !signsIn ? '' : prevFormData.email,
        password: editingId === null && !signsIn ? '' : prevFormData.password,
        can_deliver: selectedRole.name === 'rider' ? true : prevFormData.can_deliver,
      };

      assert.equal(nextFormData.can_login, true);
    });

    test('editing existing user preserves their custom can_login preference regardless of role default', () => {
      const prevFormData = {
        name: 'Special Waiter With Login',
        email: 'special@waiter.test',
        password: '',
        role: 'pos_manager',
        can_login: true,
        can_deliver: false,
      };

      const selectedRole = { name: 'waiter', requires_login: false };
      const editingId = 42; // Existing user

      const signsIn = selectedRole.name === 'restaurant_admin' || roleSignsIn(selectedRole);
      const nextFormData = {
        ...prevFormData,
        role: selectedRole.name,
        can_login: editingId !== null ? prevFormData.can_login : signsIn,
        email: editingId === null && !signsIn ? '' : prevFormData.email,
        password: editingId === null && !signsIn ? '' : prevFormData.password,
        can_deliver: selectedRole.name === 'rider' ? true : prevFormData.can_deliver,
      };

      // can_login remains true as customized for this user
      assert.equal(nextFormData.can_login, true);
      assert.equal(nextFormData.email, 'special@waiter.test');
    });

    test('manual toggle allows restaurant admin to grant login to a waiter', () => {
      let formData = {
        name: 'Rafi Waiter',
        role: 'waiter',
        can_login: false,
        email: '',
        password: '',
      };

      // Admin toggles "Can sign in" ON
      formData = { ...formData, can_login: true };
      assert.equal(formData.can_login, true);

      // Now email and password can be filled
      formData.email = 'rafi@restaurant.test';
      formData.password = 'securePass123';
      assert.equal(formData.email, 'rafi@restaurant.test');
      assert.equal(formData.password, 'securePass123');
    });
  });

  describe('Sync predefined roles response handling', () => {
    test('handles newly populated roles format', () => {
      const response = {
        message: 'Predefined roles synchronized successfully.',
        added: ['waiter', 'rider'],
      };

      const formatted = response.added.map((r) => r.replace(/_/g, ' ').toUpperCase()).join(', ');
      assert.equal(formatted, 'WAITER, RIDER');
    });

    test('handles already up to date empty added list', () => {
      const response = {
        message: 'All predefined roles are already present.',
        added: [],
      };

      assert.equal(response.added.length, 0);
    });
  });
});
