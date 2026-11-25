import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

export const RECEIPT_KEYS = {
  format: 'receipt_format',
  fontScale: 'receipt_font_scale',
};

export const VALID_RECEIPT_FORMATS = ['detailed', 'minimal'];
export const VALID_FONT_SCALES = ['80%', '90%', '100%', '110%', '120%'];

export const RECEIPT_DEFAULTS = {
  format: 'detailed',
  fontScale: '100%',
};

export function resolveReceiptSettings(rows) {
  const formatRow = rows.find(r => r.key === RECEIPT_KEYS.format);
  const scaleRow = rows.find(r => r.key === RECEIPT_KEYS.fontScale);

  const rawFormat = (formatRow?.value ?? '').trim().toLowerCase();
  const format = VALID_RECEIPT_FORMATS.includes(rawFormat) ? rawFormat : RECEIPT_DEFAULTS.format;

  let rawScale = (scaleRow?.value ?? '').trim();
  if (rawScale && !rawScale.endsWith('%')) {
    rawScale = `${rawScale}%`;
  }
  const fontScale = VALID_FONT_SCALES.includes(rawScale) ? rawScale : RECEIPT_DEFAULTS.fontScale;

  return { format, fontScale };
}

export function getReceiptStyles(format, fontScale) {
  const isMinimal = format === 'minimal';
  const scaleNum = parseInt(fontScale, 10) / 100;

  return {
    isMinimal,
    padding: isMinimal ? '4px' : '10px',
    maxWidth: isMinimal ? '280px' : '300px',
    scaleFactor: scaleNum,
    baseFontSize: `${(0.85 * scaleNum).toFixed(3)}rem`,
    titleFontSize: isMinimal ? `${(1.1 * scaleNum).toFixed(3)}rem` : `${(1.5 * scaleNum).toFixed(3)}rem`,
    tokenFontSize: isMinimal ? `${(1.2 * scaleNum).toFixed(3)}rem` : `${(2.6 * scaleNum).toFixed(3)}rem`,
    lineHeight: isMinimal ? '1.2' : '1.4',
    itemPadding: isMinimal ? '2px 0' : '5px 0',
    sectionMargin: isMinimal ? '4px' : '10px',
  };
}

export function shouldRenderElement(elementName, format) {
  const isMinimal = format === 'minimal';
  switch (elementName) {
    case 'token_banner_huge':
      return !isMinimal;
    case 'token_compact_inline':
      return isMinimal;
    case 'logo':
      return !isMinimal;
    case 'facebook_qr':
      return !isMinimal;
    case 'footer_spacing':
      return !isMinimal;
    case 'product_id_badge':
      return !isMinimal;
    case 'order_items':
    case 'total_amount':
    case 'payment_method':
      return true;
    default:
      return true;
  }
}

describe('Receipt Settings & Minimal Receipt Layout Logic', () => {
  test('falls back to defaults when no settings are stored', () => {
    const settings = resolveReceiptSettings([]);
    assert.strictEqual(settings.format, 'detailed');
    assert.strictEqual(settings.fontScale, '100%');
  });

  test('resolves minimal format correctly', () => {
    const settings = resolveReceiptSettings([
      { key: 'receipt_format', value: 'minimal' },
    ]);
    assert.strictEqual(settings.format, 'minimal');
    assert.strictEqual(settings.fontScale, '100%');
  });

  test('resolves font scale with percentage or bare numbers within bounds', () => {
    const settingsWithPct = resolveReceiptSettings([
      { key: 'receipt_font_scale', value: '80%' },
    ]);
    assert.strictEqual(settingsWithPct.fontScale, '80%');

    const settingsBareNum = resolveReceiptSettings([
      { key: 'receipt_font_scale', value: '120' },
    ]);
    assert.strictEqual(settingsBareNum.fontScale, '120%');
  });

  test('falls back to default for invalid format or out-of-bounds font scale', () => {
    const settings = resolveReceiptSettings([
      { key: 'receipt_format', value: 'ultra_compact_unknown' },
      { key: 'receipt_font_scale', value: '500%' },
    ]);
    assert.strictEqual(settings.format, 'detailed');
    assert.strictEqual(settings.fontScale, '100%');
  });

  test('minimal format computes reduced padding, line-height, and margins for roll saving', () => {
    const detailed = getReceiptStyles('detailed', '100%');
    const minimal = getReceiptStyles('minimal', '100%');

    assert.strictEqual(detailed.isMinimal, false);
    assert.strictEqual(minimal.isMinimal, true);

    assert.strictEqual(detailed.padding, '10px');
    assert.strictEqual(minimal.padding, '4px');

    assert.strictEqual(detailed.itemPadding, '5px 0');
    assert.strictEqual(minimal.itemPadding, '2px 0');

    assert.strictEqual(detailed.lineHeight, '1.4');
    assert.strictEqual(minimal.lineHeight, '1.2');
  });

  test('font scale 80% proportionally reduces typography sizes', () => {
    const standard = getReceiptStyles('detailed', '100%');
    const reduced = getReceiptStyles('detailed', '80%');

    assert.strictEqual(standard.scaleFactor, 1.0);
    assert.strictEqual(reduced.scaleFactor, 0.8);

    assert.strictEqual(standard.baseFontSize, '0.850rem');
    assert.strictEqual(reduced.baseFontSize, '0.680rem');

    assert.strictEqual(standard.titleFontSize, '1.500rem');
    assert.strictEqual(reduced.titleFontSize, '1.200rem');
  });

  test('font scale 120% proportionally increases typography sizes', () => {
    const enlarged = getReceiptStyles('detailed', '120%');

    assert.strictEqual(enlarged.scaleFactor, 1.2);
    assert.strictEqual(enlarged.baseFontSize, '1.020rem');
    assert.strictEqual(enlarged.titleFontSize, '1.800rem');
  });

  test('minimal mode suppresses paper-wasting elements like huge token banner, logo, and QR code', () => {
    assert.strictEqual(shouldRenderElement('token_banner_huge', 'minimal'), false);
    assert.strictEqual(shouldRenderElement('token_compact_inline', 'minimal'), true);
    assert.strictEqual(shouldRenderElement('logo', 'minimal'), false);
    assert.strictEqual(shouldRenderElement('facebook_qr', 'minimal'), false);
    assert.strictEqual(shouldRenderElement('product_id_badge', 'minimal'), false);

    // Essential items are always retained
    assert.strictEqual(shouldRenderElement('order_items', 'minimal'), true);
    assert.strictEqual(shouldRenderElement('total_amount', 'minimal'), true);
    assert.strictEqual(shouldRenderElement('payment_method', 'minimal'), true);
  });

  test('detailed mode retains all decorative and informational elements', () => {
    assert.strictEqual(shouldRenderElement('token_banner_huge', 'detailed'), true);
    assert.strictEqual(shouldRenderElement('token_compact_inline', 'detailed'), false);
    assert.strictEqual(shouldRenderElement('logo', 'detailed'), true);
    assert.strictEqual(shouldRenderElement('facebook_qr', 'detailed'), true);
    assert.strictEqual(shouldRenderElement('product_id_badge', 'detailed'), true);
  });
});
