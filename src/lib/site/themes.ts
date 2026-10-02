import type React from 'react';

/**
 * The site builder's palettes and type styles.
 *
 * core-api only stores the names (SiteSections::PALETTES / FONTS); the colours
 * live here. A palette overrides the daisyUI theme variables on the site's
 * outer element, so every section - and every daisyUI class inside it - picks
 * the colours up with no per-component work.
 */
export const PALETTES: Record<string, { label: string; vars: Record<string, string> }> = {
  emerald: {
    label: 'Emerald',
    vars: { '--color-primary': '#0F6E5C', '--color-primary-content': '#FFFFFF', '--color-neutral': '#1A1D1F', '--color-neutral-content': '#FAFAF8', '--color-base-200': '#F2F5F4' },
  },
  saffron: {
    label: 'Saffron',
    vars: { '--color-primary': '#D97706', '--color-primary-content': '#FFFFFF', '--color-neutral': '#3B2414', '--color-neutral-content': '#FFF7ED', '--color-base-200': '#FFF4E5' },
  },
  crimson: {
    label: 'Crimson',
    vars: { '--color-primary': '#B91C1C', '--color-primary-content': '#FFFFFF', '--color-neutral': '#2A1215', '--color-neutral-content': '#FEF2F2', '--color-base-200': '#FBEFEF' },
  },
  ocean: {
    label: 'Ocean',
    vars: { '--color-primary': '#1D4ED8', '--color-primary-content': '#FFFFFF', '--color-neutral': '#0F1A2E', '--color-neutral-content': '#EFF6FF', '--color-base-200': '#EEF3FB' },
  },
  charcoal: {
    label: 'Charcoal & gold',
    vars: { '--color-primary': '#B08D3C', '--color-primary-content': '#111111', '--color-neutral': '#111111', '--color-neutral-content': '#F5F1E8', '--color-base-200': '#F3EFE6' },
  },
};

/** The root layout already loads Inter, Poppins and Hind Siliguri as CSS variables. */
export const FONTS: Record<string, { label: string; family: string }> = {
  modern: { label: 'Modern', family: 'var(--font-inter), system-ui, sans-serif' },
  rounded: { label: 'Rounded', family: 'var(--font-poppins), system-ui, sans-serif' },
  classic: { label: 'Classic', family: 'Georgia, "Times New Roman", serif' },
  bangla: { label: 'Bangla', family: 'var(--font-hind-siliguri), var(--font-inter), sans-serif' },
};

export interface SiteTheme {
  palette: string;
  font: string;
}

export const DEFAULT_THEME: SiteTheme = { palette: 'emerald', font: 'modern' };

/** The style to put on the site's outer element. */
export function themeStyle(theme: SiteTheme | null | undefined): React.CSSProperties {
  const palette = PALETTES[theme?.palette ?? ''] ?? PALETTES.emerald;
  const font = FONTS[theme?.font ?? ''] ?? FONTS.modern;
  return { ...palette.vars, fontFamily: font.family } as React.CSSProperties;
}
