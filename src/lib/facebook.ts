/**
 * A restaurant's Facebook page link, cleaned up for printing as a QR code.
 *
 * Owners paste whatever their browser shows: with or without https://, from
 * the mobile site, with tracking parameters on the end. Accepts facebook.com
 * (and its www./m./web. forms), fb.com and fb.me; returns a canonical https URL
 * without query or fragment, or null for anything that is not a Facebook page
 * - a QR code on a receipt must never lead a customer somewhere else.
 */
const HOSTS = ['facebook.com', 'fb.com', 'fb.me'];

export function normaliseFacebookUrl(input: string | null | undefined): string | null {
  const raw = (input ?? '').trim();
  if (raw === '') return null;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase().replace(/^(www|m|web|mobile)\./, '');
  if (!HOSTS.includes(host)) return null;

  const path = url.pathname.replace(/\/+$/, '');
  // The bare domain is Facebook's home page, not the restaurant's.
  if (path === '' || path === '/') return null;

  // profile.php?id=... is the one page URL whose identity is in the query.
  const id = path === '/profile.php' ? url.searchParams.get('id') : null;
  if (path === '/profile.php' && !id) return null;

  const canonicalHost = host === 'fb.me' ? 'fb.me' : 'www.facebook.com';
  return `https://${canonicalHost}${path}${id ? `?id=${encodeURIComponent(id)}` : ''}`;
}

/** The link as printed under the QR code: short enough for a 58mm roll. */
export function displayFacebookUrl(url: string): string {
  return url.replace(/^https:\/\/(www\.)?/, '');
}
