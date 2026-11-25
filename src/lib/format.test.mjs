import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

const NUMBER_LOCALE = 'en-IN';

export function formatCurrency(value) {
  return Number(value || 0).toLocaleString(NUMBER_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatTaka(value) {
  return `৳${formatCurrency(value)}`;
}

export function formatTakaCompact(value) {
  const n = Number(value || 0);
  const abs = Math.abs(n);
  if (abs >= 10_000_000) return `৳${(n / 10_000_000).toFixed(1)}Cr`;
  if (abs >= 100_000) return `৳${(n / 100_000).toFixed(1)}L`;
  if (abs >= 1_000) return `৳${(n / 1_000).toFixed(1)}K`;
  return `৳${n.toFixed(0)}`;
}

export function formatQuantity(value) {
  const n = Number(value || 0);
  return Number.isInteger(n)
    ? n.toLocaleString(NUMBER_LOCALE)
    : n.toLocaleString(NUMBER_LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatCount(value) {
  return Number(value || 0).toLocaleString(NUMBER_LOCALE);
}

describe('Number and Currency Formatting (en-IN Locale)', () => {
  describe('formatCurrency()', () => {
    test('formats numbers with two decimal places and lakh/crore commas', () => {
      assert.strictEqual(formatCurrency(779821), '7,79,821.00');
      assert.strictEqual(formatCurrency(12345678.9), '1,23,45,678.90');
      assert.strictEqual(formatCurrency(50), '50.00');
    });

    test('handles zero, null, undefined, and empty strings gracefully', () => {
      assert.strictEqual(formatCurrency(0), '0.00');
      assert.strictEqual(formatCurrency(null), '0.00');
      assert.strictEqual(formatCurrency(undefined), '0.00');
      assert.strictEqual(formatCurrency(''), '0.00');
    });

    test('parses string numbers accurately', () => {
      assert.strictEqual(formatCurrency('1500.5'), '1,500.50');
      assert.strictEqual(formatCurrency('99.999'), '100.00');
    });
  });

  describe('formatTaka()', () => {
    test('prefixes amount with taka symbol ৳', () => {
      assert.strictEqual(formatTaka(100), '৳100.00');
      assert.strictEqual(formatTaka(779821), '৳7,79,821.00');
      assert.strictEqual(formatTaka(null), '৳0.00');
    });
  });

  describe('formatTakaCompact()', () => {
    test('formats values >= 1 Crore with Cr suffix', () => {
      assert.strictEqual(formatTakaCompact(15000000), '৳1.5Cr');
      assert.strictEqual(formatTakaCompact(10000000), '৳1.0Cr');
    });

    test('formats values >= 1 Lakh with L suffix', () => {
      assert.strictEqual(formatTakaCompact(250000), '৳2.5L');
      assert.strictEqual(formatTakaCompact(100000), '৳1.0L');
    });

    test('formats values >= 1 Thousand with K suffix', () => {
      assert.strictEqual(formatTakaCompact(5400), '৳5.4K');
      assert.strictEqual(formatTakaCompact(1000), '৳1.0K');
    });

    test('formats small values below 1000 with exact integer representation', () => {
      assert.strictEqual(formatTakaCompact(750), '৳750');
      assert.strictEqual(formatTakaCompact(42.8), '৳43');
      assert.strictEqual(formatTakaCompact(0), '৳0');
      assert.strictEqual(formatTakaCompact(null), '৳0');
    });
  });

  describe('formatQuantity() & formatCount()', () => {
    test('formats integer quantities without decimal places', () => {
      assert.strictEqual(formatQuantity(5), '5');
      assert.strictEqual(formatQuantity(10000), '10,000');
      assert.strictEqual(formatQuantity('12'), '12');
    });

    test('formats fractional quantities with two decimal places', () => {
      assert.strictEqual(formatQuantity(2.5), '2.50');
      assert.strictEqual(formatQuantity(0.75), '0.75');
    });

    test('formatCount formats count numbers properly', () => {
      assert.strictEqual(formatCount(1234567), '12,34,567');
      assert.strictEqual(formatCount(0), '0');
      assert.strictEqual(formatCount(null), '0');
    });
  });
});
