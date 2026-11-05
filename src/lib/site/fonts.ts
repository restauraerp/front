/**
 * Fonts for restaurant websites: loading them, and suggesting pairs.
 *
 * The catalogue - every family a site may use, with its category, weights and
 * whether it has Bangla - is core-api's (config/site_fonts.php), served with
 * the builder's components. What is here is taste: hand-picked heading/body
 * pairs, and rules that fill in two or three good partners for any font.
 */

export type FontInfo = { category: string; weights: string; bangla: boolean };
export type FontCatalog = Record<string, FontInfo>;
export type FontFace = { name: string; category: string; weights: string };
export type FontPair = { heading: string; body: string; mood: string };

/** Hand-picked pairs - the first suggestions for either font in them. */
export const FONT_PAIRS: FontPair[] = [
  { heading: 'Playfair Display', body: 'Lato', mood: 'Classic' },
  { heading: 'Playfair Display', body: 'Inter', mood: 'Modern classic' },
  { heading: 'Playfair Display', body: 'Source Sans 3', mood: 'Editorial' },
  { heading: 'Cormorant Garamond', body: 'Montserrat', mood: 'Elegant' },
  { heading: 'Cormorant Garamond', body: 'Lato', mood: 'Refined' },
  { heading: 'Cinzel', body: 'Raleway', mood: 'Grand' },
  { heading: 'Libre Baskerville', body: 'Source Sans 3', mood: 'Traditional' },
  { heading: 'DM Serif Display', body: 'DM Sans', mood: 'Contemporary' },
  { heading: 'Fraunces', body: 'Inter', mood: 'Warm modern' },
  { heading: 'Fraunces', body: 'Work Sans', mood: 'Bistro' },
  { heading: 'Merriweather', body: 'Open Sans', mood: 'Friendly classic' },
  { heading: 'Lora', body: 'Nunito', mood: 'Homely' },
  { heading: 'Bodoni Moda', body: 'Manrope', mood: 'Luxury' },
  { heading: 'Prata', body: 'Lato', mood: 'Fine dining' },
  { heading: 'Marcellus', body: 'Montserrat', mood: 'Mediterranean' },
  { heading: 'Yeseva One', body: 'Josefin Sans', mood: 'Boutique' },
  { heading: 'Abril Fatface', body: 'Lato', mood: 'Bold editorial' },
  { heading: 'EB Garamond', body: 'Karla', mood: 'Literary' },
  { heading: 'Bebas Neue', body: 'Montserrat', mood: 'Street food' },
  { heading: 'Bebas Neue', body: 'Open Sans', mood: 'Burger joint' },
  { heading: 'Oswald', body: 'Lato', mood: 'Steakhouse' },
  { heading: 'Oswald', body: 'Roboto', mood: 'Grill' },
  { heading: 'Anton', body: 'Work Sans', mood: 'Loud and proud' },
  { heading: 'Archivo Black', body: 'Roboto', mood: 'Fast food' },
  { heading: 'Alfa Slab One', body: 'Roboto', mood: 'Diner' },
  { heading: 'Righteous', body: 'Poppins', mood: 'Retro' },
  { heading: 'Bungee', body: 'Rubik', mood: 'Playful' },
  { heading: 'Montserrat', body: 'Merriweather', mood: 'Reversed classic' },
  { heading: 'Poppins', body: 'Lora', mood: 'Clean and warm' },
  { heading: 'Poppins', body: 'Inter', mood: 'Clean' },
  { heading: 'Raleway', body: 'Lora', mood: 'Light and gentle' },
  { heading: 'Josefin Sans', body: 'Lato', mood: 'Vintage' },
  { heading: 'Space Grotesk', body: 'Inter', mood: 'Tech-modern' },
  { heading: 'Outfit', body: 'DM Sans', mood: 'Fresh' },
  { heading: 'Plus Jakarta Sans', body: 'Inter', mood: 'Minimal' },
  { heading: 'Lexend', body: 'Figtree', mood: 'Very readable' },
  { heading: 'Pacifico', body: 'Quicksand', mood: 'Beach café' },
  { heading: 'Lobster', body: 'Open Sans', mood: 'Retro diner' },
  { heading: 'Dancing Script', body: 'Lato', mood: 'Romantic' },
  { heading: 'Great Vibes', body: 'Cormorant Garamond', mood: 'Wedding venue' },
  { heading: 'Satisfy', body: 'Raleway', mood: 'Patisserie' },
  { heading: 'Caveat', body: 'Nunito', mood: 'Chalkboard' },
  { heading: 'Amatic SC', body: 'Josefin Sans', mood: 'Farmhouse' },
  { heading: 'Kaushan Script', body: 'Montserrat', mood: 'Food truck' },
  { heading: 'Fredoka', body: 'Nunito', mood: 'Kids friendly' },
  { heading: 'Baloo 2', body: 'Nunito', mood: 'Cheerful' },
  { heading: 'Comfortaa', body: 'Mulish', mood: 'Soft' },
  // Bangla
  { heading: 'Hind Siliguri', body: 'Hind Siliguri', mood: 'Bangla - simple' },
  { heading: 'Tiro Bangla', body: 'Noto Sans Bengali', mood: 'Bangla - traditional' },
  { heading: 'Galada', body: 'Hind Siliguri', mood: 'Bangla - festive' },
  { heading: 'Baloo Da 2', body: 'Hind Siliguri', mood: 'Bangla - friendly' },
  { heading: 'Anek Bangla', body: 'Noto Sans Bengali', mood: 'Bangla - modern' },
  { heading: 'Noto Serif Bengali', body: 'Noto Sans Bengali', mood: 'Bangla - classic' },
  { heading: 'Mina', body: 'Hind Siliguri', mood: 'Bangla - clean' },
  { heading: 'Atma', body: 'Noto Sans Bengali', mood: 'Bangla - handmade' },
  { heading: 'Playfair Display', body: 'Hind Siliguri', mood: 'English and Bangla' },
  { heading: 'Poppins', body: 'Hind Siliguri', mood: 'English and Bangla, modern' },
];

const BODIES = ['Inter', 'Lato', 'Open Sans', 'Montserrat', 'Source Sans 3', 'Nunito'];
const SERIF_HEADINGS = ['Playfair Display', 'Lora', 'Merriweather', 'Fraunces'];

/**
 * Two to four pairs that use `font` - hand-picked first, then by rule: a
 * display, serif or script font heads over a plain sans body; a sans body
 * goes under a serif heading, or under itself.
 */
export function pairsFor(font: string, catalog: FontCatalog): FontPair[] {
  const pairs = FONT_PAIRS.filter((p) => (p.heading === font || p.body === font) && catalog[p.heading] && catalog[p.body]);
  const seen = new Set(pairs.map((p) => `${p.heading}|${p.body}`));
  const add = (p: FontPair) => {
    const k = `${p.heading}|${p.body}`;
    if (!seen.has(k) && catalog[p.heading] && catalog[p.body]) { seen.add(k); pairs.push(p); }
  };

  const info = catalog[font];
  if (info?.bangla) {
    add({ heading: font, body: 'Hind Siliguri', mood: 'Bangla' });
    add({ heading: font, body: 'Noto Sans Bengali', mood: 'Bangla' });
  } else if (info?.category === 'sans-serif') {
    SERIF_HEADINGS.forEach((h) => add({ heading: h, body: font, mood: 'Serif headings' }));
    add({ heading: font, body: font, mood: 'One family' });
  } else {
    BODIES.forEach((b) => add({ heading: font, body: b, mood: 'Clean body text' }));
  }
  return pairs.slice(0, Math.max(3, Math.min(pairs.length, 4)));
}

/** Search the catalogue by name, category, or "bangla". */
export function searchFonts(query: string, catalog: FontCatalog): string[] {
  const q = query.trim().toLowerCase();
  return Object.entries(catalog)
    .filter(([name, f]) => !q || name.toLowerCase().includes(q) || f.category.includes(q) || (f.bangla && 'bangla bengali বাংলা'.includes(q)))
    .map(([name]) => name);
}

const FALLBACK: Record<string, string> = {
  serif: 'Georgia, serif',
  display: 'system-ui, sans-serif',
  handwriting: 'cursive',
  'sans-serif': 'system-ui, sans-serif',
};

/** A CSS font-family stack for a face. Names come from the catalogue only. */
export const familyCss = (f: FontFace | undefined, fallback = 'system-ui, sans-serif') =>
  f ? `"${f.name}", ${FALLBACK[f.category] ?? fallback}` : fallback;

/** The Google Fonts stylesheet for some faces (duplicates merged). */
export function googleFontsUrl(faces: FontFace[]): string | null {
  const unique = [...new Map(faces.map((f) => [f.name, f])).values()];
  if (!unique.length) return null;
  const families = unique.map((f) => `family=${encodeURIComponent(f.name).replace(/%20/g, '+')}${f.weights.includes(';') ? `:wght@${f.weights}` : ''}`);
  return `https://fonts.googleapis.com/css2?${families.join('&')}&display=swap`;
}
