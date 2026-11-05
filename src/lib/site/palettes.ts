/**
 * Colour palettes for restaurant websites.
 *
 * A palette is five colours - primary, secondary, accent, neutral (footer,
 * banner) and base (the page). Everything else a site needs - lighter and
 * darker page shades, and a readable text colour on every one of them - is
 * worked out here (paletteVars), so any five colours give a usable site and a
 * dark base gives a dark site.
 *
 * The catalogue: 36 food colours, each in three styles - classic (warm light
 * page), fresh (bright, airy) and night (dark) - built by the same rules from
 * the one colour. Searchable by name, colour family and mood; and
 * fromColour() builds the same styles around any colour an owner picks.
 */

export type PaletteColors = { primary: string; secondary: string; accent: string; neutral: string; base: string };

export interface Palette {
  key: string;
  name: string;
  family: string;
  style: 'classic' | 'fresh' | 'night' | 'original';
  tags: string[];
  colors: PaletteColors;
}

// ---- Colour maths ------------------------------------------------------------

type HSL = { h: number; s: number; l: number };

export function hexToHsl(hex: string): HSL {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return { h: 0, s: 0, l: l * 100 };
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: h * 60, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: HSL): string {
  const hh = ((h % 360) + 360) % 360, ss = Math.max(0, Math.min(100, s)) / 100, ll = Math.max(0, Math.min(100, l)) / 100;
  const k = (n: number) => (n + hh / 30) % 12;
  const a = ss * Math.min(ll, 1 - ll);
  const f = (n: number) => ll - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `#${[f(0), f(8), f(4)].map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('')}`.toUpperCase();
}

const shift = (hex: string, d: Partial<HSL>): string => {
  const c = hexToHsl(hex);
  return hslToHex({ h: c.h + (d.h ?? 0), s: c.s + (d.s ?? 0), l: c.l + (d.l ?? 0) });
};

function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
}

export const isDark = (hex: string) => luminance(hex) < 0.18;

/** White or near-black, whichever reads better on `bg`, tinted toward it. */
function textOn(bg: string): string {
  const { h } = hexToHsl(bg);
  const light = hslToHex({ h, s: 20, l: 98 });
  const dark = hslToHex({ h, s: 25, l: 10 });
  return contrast(light, bg) >= contrast(dark, bg) ? light : dark;
}

/** The daisyUI theme variables a palette sets on the site's outer element. */
export function paletteVars(c: PaletteColors): Record<string, string> {
  const dark = isDark(c.base);
  const step = dark ? 5 : -4;
  const base200 = shift(c.base, { l: step });
  const base300 = shift(c.base, { l: step * 2.2 });
  const baseContent = textOn(c.base);

  return {
    '--color-primary': c.primary, '--color-primary-content': textOn(c.primary),
    '--color-secondary': c.secondary, '--color-secondary-content': textOn(c.secondary),
    '--color-accent': c.accent, '--color-accent-content': textOn(c.accent),
    '--color-neutral': c.neutral, '--color-neutral-content': textOn(c.neutral),
    '--color-base-100': c.base, '--color-base-200': base200, '--color-base-300': base300, '--color-base-content': baseContent,
  };
}

// ---- Building palettes from one colour ---------------------------------------

/** Keeps a colour usable as a button: not washed out, not near black. */
function asPrimary(hex: string, dark: boolean): string {
  const c = hexToHsl(hex);
  const l = dark ? Math.max(c.l, 52) : Math.min(Math.max(c.l, 28), 50);
  return hslToHex({ h: c.h, s: Math.max(c.s, 35), l });
}

export function styled(hex: string, style: 'classic' | 'fresh' | 'night'): PaletteColors {
  const { h, s } = hexToHsl(hex);
  switch (style) {
    case 'classic':
      return {
        primary: asPrimary(hex, false),
        secondary: hslToHex({ h: h - 25, s: s * 0.55, l: 30 }),
        accent: hslToHex({ h: h + 150, s: Math.min(s, 55), l: 42 }),
        neutral: hslToHex({ h, s: 28, l: 13 }),
        base: hslToHex({ h: h + 10, s: 45, l: 97.5 }),
      };
    case 'fresh':
      return {
        primary: asPrimary(hex, false),
        secondary: hslToHex({ h: h + 35, s: Math.max(s, 55), l: 42 }),
        accent: hslToHex({ h: h + 120, s: 65, l: 40 }),
        neutral: hslToHex({ h: h + 180, s: 22, l: 16 }),
        base: '#FFFFFF',
      };
    case 'night':
      return {
        primary: asPrimary(hex, true),
        secondary: hslToHex({ h: h - 30, s: Math.max(s * 0.7, 30), l: 62 }),
        accent: hslToHex({ h: h + 160, s: 55, l: 60 }),
        neutral: hslToHex({ h, s: 22, l: 5 }),
        base: hslToHex({ h, s: 18, l: 9 }),
      };
  }
}

/** The three styles built around any colour. */
export function fromColour(hex: string): Palette[] {
  const label = hex.toUpperCase();
  return (['classic', 'fresh', 'night'] as const).map((style) => ({
    key: 'custom',
    name: `${label} ${STYLE_LABEL[style]}`,
    family: familyOf(hex),
    style,
    tags: [],
    colors: styled(hex, style),
  }));
}

export const STYLE_LABEL = { classic: 'Classic', fresh: 'Fresh', night: 'Night', original: 'Original' } as const;

const STYLE_TAGS: Record<string, string[]> = {
  classic: ['light', 'warm', 'traditional', 'cosy'],
  fresh: ['light', 'bright', 'modern', 'clean'],
  night: ['dark', 'elegant', 'bar', 'fine dining'],
};

/** Hue family names, for search: "orange" finds saffron, mango, paprika... */
export function familyOf(hex: string): string {
  const { h, s, l } = hexToHsl(hex);
  if (s < 12) return l < 30 ? 'black' : l > 85 ? 'white' : 'grey';
  if (h < 12 || h >= 345) return 'red';
  if (h < 40) return l < 35 ? 'brown' : 'orange';
  if (h < 65) return 'yellow';
  if (h < 160) return 'green';
  if (h < 200) return 'teal';
  if (h < 255) return 'blue';
  if (h < 290) return 'purple';
  return 'pink';
}

// ---- The catalogue -------------------------------------------------------------

const SEEDS: [string, string, string[]][] = [
  ['Saffron', '#D97706', ['biryani', 'indian']],
  ['Turmeric', '#CA8A04', ['curry', 'spice']],
  ['Mango', '#F59E0B', ['summer', 'dessert']],
  ['Paprika', '#C2410C', ['grill', 'spice']],
  ['Chili', '#B91C1C', ['spicy', 'fast food']],
  ['Tomato', '#DC2626', ['pizza', 'italian']],
  ['Pomegranate', '#A4161A', ['persian', 'kebab']],
  ['Crimson', '#9F1239', ['wine', 'steak']],
  ['Beetroot', '#831843', ['bistro']],
  ['Raspberry', '#BE185D', ['dessert', 'bakery']],
  ['Rose', '#E11D48', ['cafe', 'dessert']],
  ['Coral', '#E5533D', ['seafood', 'beach']],
  ['Terracotta', '#B4532A', ['mediterranean', 'clay oven']],
  ['Cinnamon', '#9A3412', ['bakery', 'tea']],
  ['Caramel', '#B45309', ['cafe', 'sweets']],
  ['Cocoa', '#7C4A2D', ['chocolate', 'coffee']],
  ['Espresso', '#6F4E37', ['coffee', 'cafe']],
  ['Sand', '#A8875A', ['desert', 'arabic']],
  ['Gold', '#B08D3C', ['luxury', 'fine dining']],
  ['Lime', '#65A30D', ['healthy', 'juice']],
  ['Pistachio', '#4D7C0F', ['sweets', 'arabic']],
  ['Olive', '#5F6B1E', ['mediterranean', 'italian']],
  ['Basil', '#15803D', ['italian', 'healthy']],
  ['Matcha', '#3F6212', ['tea', 'japanese']],
  ['Emerald', '#047857', ['halal', 'fresh']],
  ['Forest', '#14532D', ['organic', 'farm']],
  ['Mint', '#0F9F7A', ['healthy', 'salad']],
  ['Teal', '#0F766E', ['seafood', 'modern']],
  ['Lagoon', '#0E7490', ['seafood', 'thai']],
  ['Azure', '#0369A1', ['seafood', 'coastal']],
  ['Ocean', '#1D4ED8', ['fish', 'modern']],
  ['Indigo', '#3730A3', ['lounge', 'night']],
  ['Plum', '#6B21A8', ['dessert', 'lounge']],
  ['Aubergine', '#4C1D95', ['fine dining', 'wine']],
  ['Slate', '#475569', ['minimal', 'modern']],
  ['Charcoal', '#374151', ['grill', 'bbq', 'minimal']],
];

/** The site builder's first five palettes, kept under their names so older sites look the same. */
const ORIGINALS: Palette[] = [
  { key: 'emerald', name: 'Emerald', colors: { primary: '#0F6E5C', secondary: '#1F4F45', accent: '#C2410C', neutral: '#1A1D1F', base: '#FFFFFF' } },
  { key: 'saffron', name: 'Saffron', colors: { primary: '#D97706', secondary: '#7C2D12', accent: '#0F766E', neutral: '#3B2414', base: '#FFFBF5' } },
  { key: 'crimson', name: 'Crimson', colors: { primary: '#B91C1C', secondary: '#7F1D1D', accent: '#B45309', neutral: '#2A1215', base: '#FFFFFF' } },
  { key: 'ocean', name: 'Ocean', colors: { primary: '#1D4ED8', secondary: '#1E3A8A', accent: '#0F766E', neutral: '#0F1A2E', base: '#FFFFFF' } },
  { key: 'charcoal', name: 'Charcoal & gold', colors: { primary: '#B08D3C', secondary: '#57534E', accent: '#7F1D1D', neutral: '#111111', base: '#FFFDF8' } },
].map((p) => ({ ...p, family: familyOf(p.colors.primary), style: 'original' as const, tags: ['original'] }));

export const PALETTES: Palette[] = [
  ...ORIGINALS,
  ...SEEDS.flatMap(([name, hex, tags]) =>
    (['classic', 'fresh', 'night'] as const).map((style) => ({
      key: `${name.toLowerCase()}-${style}`,
      name: `${name} ${STYLE_LABEL[style]}`,
      family: familyOf(hex),
      style,
      tags: [...tags, ...STYLE_TAGS[style]],
      colors: styled(hex, style),
    })),
  ),
];

export const PALETTE_BY_KEY: Record<string, Palette> = Object.fromEntries(PALETTES.map((p) => [p.key, p]));

/** A theme's colours: its own, else its named palette's, else Emerald. */
export function colorsOf(theme: { palette?: string; colors?: PaletteColors | null } | null | undefined): PaletteColors {
  return theme?.colors ?? PALETTE_BY_KEY[theme?.palette ?? '']?.colors ?? PALETTE_BY_KEY.emerald.colors;
}

/** Text search over name, colour family, style and tags - every word must match. */
export function searchPalettes(query: string, list: Palette[] = PALETTES): Palette[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return list;
  return list.filter((p) => {
    const hay = `${p.name} ${p.family} ${p.style} ${p.tags.join(' ')}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}

/** Catalogue palettes whose primary is nearest to `hex` in hue (then lightness). */
export function nearestPalettes(hex: string, count = 12): Palette[] {
  const t = hexToHsl(hex);
  const distance = (p: Palette) => {
    const c = hexToHsl(p.colors.primary);
    const dh = Math.min(Math.abs(c.h - t.h), 360 - Math.abs(c.h - t.h));
    return dh * 2 + Math.abs(c.s - t.s) * 0.3 + Math.abs(c.l - t.l) * 0.6;
  };
  return [...PALETTES].sort((a, b) => distance(a) - distance(b)).slice(0, count);
}
