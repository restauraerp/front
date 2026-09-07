/**
 * A post-login redirect target that can only ever be an in-app admin path.
 *
 * The one-time login and set-password screens take a `next` from the URL so a
 * campaign link can drop a signed-in owner straight onto a specific page - the
 * billing page, say, when the message asked them to subscribe. That value
 * arrives on a public URL, which is exactly the shape of an open-redirect: left
 * unchecked, `next=https://evil.example` would send somebody we just
 * authenticated off to a stranger's site.
 *
 * So only a same-origin path under `/admin` is allowed through. Everything else
 * - an absolute URL, a protocol-relative `//host`, a path outside `/admin` -
 * falls back to the dashboard rather than being followed.
 */
export function safeAdminNext(raw: string | null | undefined): string {
  const fallback = '/admin';

  if (!raw) {
    return fallback;
  }

  // A single-slash-rooted admin path and nothing else. The character class after
  // "/admin" is what rejects "//evil.com" (protocol-relative), "/admin@evil.com"
  // and "/administrator" while still allowing "/admin", "/admin/profile" and
  // "/admin/profile?subscribe=1".
  return /^\/admin(?:[/?#]|$)/.test(raw) ? raw : fallback;
}
