import type React from 'react';
import { colorsOf, paletteVars, type PaletteColors } from './palettes';
import { familyCss, type FontFace } from './fonts';

/**
 * A site's theme as core-api stores it (App\Support\Site\SiteTheme), and the
 * style that applies it.
 *
 * Colours become daisyUI's theme variables on the site's outer element, so
 * every section - and every daisyUI class inside it - picks them up with no
 * per-component work. Fonts become two variables: the body font on the
 * element itself, the heading font for h1-h4 (globals.css, [data-site-theme]).
 */
export interface SiteTheme {
  palette: string;
  colors?: PaletteColors | null;
  heading_font?: string;
  body_font?: string;
  header_order_button?: boolean;
  footer_social?: boolean;
  footer_text?: string;
}

export interface SiteFonts {
  heading: FontFace;
  body: FontFace;
}

export const DEFAULT_THEME: SiteTheme = {
  palette: 'emerald', colors: null, heading_font: 'Inter', body_font: 'Inter', header_order_button: true, footer_social: true, footer_text: '',
};

/** Faces for a theme when the categories are not known (they only steer the fallback). */
export function facesOf(theme: SiteTheme | null | undefined, catalog?: Record<string, { category: string; weights: string }>): SiteFonts {
  const face = (name: string): FontFace => ({ name, category: catalog?.[name]?.category ?? 'sans-serif', weights: catalog?.[name]?.weights ?? '400;700' });
  return { heading: face(theme?.heading_font || 'Inter'), body: face(theme?.body_font || 'Inter') };
}

/** The style to put on the site's outer element. */
export function themeStyle(theme: SiteTheme | null | undefined, fonts?: SiteFonts | null): React.CSSProperties {
  const faces = fonts ?? facesOf(theme);
  return {
    ...paletteVars(colorsOf(theme)),
    '--site-heading-font': familyCss(faces.heading),
    '--site-body-font': familyCss(faces.body),
    fontFamily: 'var(--site-body-font)',
  } as React.CSSProperties;
}
