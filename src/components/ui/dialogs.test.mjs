import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export function resolveTone(kind, customTone) {
  if (customTone) return customTone;
  return kind === 'confirm' ? 'btn-error' : 'btn-primary';
}

export function validatePromptInput(value, maxLength) {
  const trimmed = (value || '').trim();
  if (trimmed === '') {
    return { valid: false, error: 'Input cannot be empty' };
  }
  if (maxLength && trimmed.length > maxLength) {
    return { valid: false, error: `Exceeds max length of ${maxLength}` };
  }
  return { valid: true, value: trimmed };
}

export function createDialogRequest(kind, options) {
  let settled = false;
  let resolvedValue = null;
  let finishFn = null;

  const promise = new Promise((resolve) => {
    finishFn = (ok, inputValue) => {
      if (settled) return;
      settled = true;
      if (kind === 'confirm') {
        resolvedValue = Boolean(ok);
        resolve(resolvedValue);
      } else if (kind === 'prompt') {
        resolvedValue = ok ? (inputValue || '').trim() : null;
        resolve(resolvedValue);
      } else {
        resolvedValue = undefined;
        resolve();
      }
    };
  });

  return {
    kind,
    options,
    tone: resolveTone(kind, options?.tone),
    action: options?.action ?? (kind === 'alert' ? 'OK' : kind === 'prompt' ? 'Save' : 'Confirm'),
    cancel: options?.cancel ?? 'Cancel',
    promise,
    _finish: finishFn,
    getSettled: () => settled,
    getResolvedValue: () => resolvedValue,
  };
}

describe('Frontend Dialog System (useDialogs & Modal Logic)', () => {
  describe('resolveTone()', () => {
    test('defaults to btn-error for confirm dialogs (destructive action protection)', () => {
      assert.strictEqual(resolveTone('confirm'), 'btn-error');
    });

    test('defaults to btn-primary for alert and prompt dialogs', () => {
      assert.strictEqual(resolveTone('alert'), 'btn-primary');
      assert.strictEqual(resolveTone('prompt'), 'btn-primary');
    });

    test('honors explicitly specified tones (btn-warning, btn-success, btn-primary)', () => {
      assert.strictEqual(resolveTone('confirm', 'btn-warning'), 'btn-warning');
      assert.strictEqual(resolveTone('confirm', 'btn-success'), 'btn-success');
      assert.strictEqual(resolveTone('alert', 'btn-error'), 'btn-error');
    });
  });

  describe('validatePromptInput()', () => {
    test('rejects empty and whitespace-only prompt strings', () => {
      assert.strictEqual(validatePromptInput('').valid, false);
      assert.strictEqual(validatePromptInput('   ').valid, false);
      assert.strictEqual(validatePromptInput(null).valid, false);
      assert.strictEqual(validatePromptInput(undefined).valid, false);
    });

    test('accepts valid input and returns trimmed string', () => {
      const res = validatePromptInput('  New Table 5  ');
      assert.strictEqual(res.valid, true);
      assert.strictEqual(res.value, 'New Table 5');
    });

    test('enforces maxLength constraint when provided', () => {
      assert.strictEqual(validatePromptInput('Short', 10).valid, true);
      assert.strictEqual(validatePromptInput('Way too long text exceeding limit', 10).valid, false);
    });
  });

  describe('createDialogRequest() Promise Lifecycle', () => {
    test('confirm resolves with true when confirmed', async () => {
      const dialog = createDialogRequest('confirm', { title: 'Delete Order?' });
      assert.strictEqual(dialog.action, 'Confirm');
      assert.strictEqual(dialog.tone, 'btn-error');

      dialog._finish(true);
      const result = await dialog.promise;
      assert.strictEqual(result, true);
      assert.strictEqual(dialog.getSettled(), true);
    });

    test('confirm resolves with false when cancelled or dismissed', async () => {
      const dialog = createDialogRequest('confirm', { title: 'Delete Order?' });
      dialog._finish(false);
      const result = await dialog.promise;
      assert.strictEqual(result, false);
    });

    test('prompt returns trimmed input string when confirmed', async () => {
      const dialog = createDialogRequest('prompt', { title: 'Rename Category', action: 'Update' });
      assert.strictEqual(dialog.action, 'Update');

      dialog._finish(true, '  Beverages  ');
      const result = await dialog.promise;
      assert.strictEqual(result, 'Beverages');
    });

    test('prompt returns null when cancelled', async () => {
      const dialog = createDialogRequest('prompt', { title: 'Rename Category' });
      dialog._finish(false, 'Typed text discarded');
      const result = await dialog.promise;
      assert.strictEqual(result, null);
    });

    test('alert resolves void on dismiss', async () => {
      const dialog = createDialogRequest('alert', { title: 'Payment Success', action: 'Done' });
      assert.strictEqual(dialog.action, 'Done');
      assert.strictEqual(dialog.tone, 'btn-primary');

      dialog._finish(true);
      const result = await dialog.promise;
      assert.strictEqual(result, undefined);
    });

    test('settling is idempotent (subsequent triggers are ignored)', async () => {
      const dialog = createDialogRequest('confirm', { title: 'Test' });
      dialog._finish(true);
      dialog._finish(false); // Second call should be ignored
      const result = await dialog.promise;
      assert.strictEqual(result, true);
    });
  });
});
