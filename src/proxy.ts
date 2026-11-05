import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEMO_COOKIE, DEMO_PARAM, FBC_COOKIE, FBP_COOKIE, LANG_COOKIE, LEAD_COOKIE } from '@/lib/demo';
import {
  DEV_TRAFFIC_COOKIE,
  DEV_TRAFFIC_HEADER,
  DEV_TRAFFIC_MAX_AGE,
  isAffirmative,
} from '@/lib/devTraffic';

/**
 * Subdomains that are never a restaurant's site: our own apps live there.
 */
const RESERVED_SUBDOMAINS = new Set(['www', 'app', 'api', 'admin', 'mail', 'demo', 'staging', 'dev']);

/**
 * Paths a restaurant's subdomain passes through untouched: online ordering,
 * and the API and storage rewrites in next.config.ts.
 */
const SITE_PASSTHROUGH = ['/order/', '/api/', '/storage/', '/_next/'];

/**
 * The restaurant a request's host names - `{code}.{SITE_BASE_DOMAIN}` - or
 * null. SITE_BASE_DOMAIN is the domain restaurant sites hang off: restauraerp.com
 * in production, `localhost` by default so `{code}.localhost:3029` works in
 * development with no setup (browsers resolve *.localhost to this machine).
 */
function siteBase(): string {
  return (process.env.SITE_BASE_DOMAIN || (process.env.NODE_ENV === 'production' ? '' : 'localhost')).toLowerCase();
}

function siteCodeFromHost(host: string): string | null {
  const base = siteBase();
  if (!base || !host.endsWith(`.${base}`)) return null;

  const sub = host.slice(0, -(base.length + 1));
  if (!sub || sub.includes('.') || RESERVED_SUBDOMAINS.has(sub)) return null;

  return /^[a-z0-9-]{1,64}$/.test(sub) ? sub : null;
}

/**
 * A restaurant's own domain (banglabistro.com), verified in the site builder.
 *
 * Only hosts outside our own domain are looked up - localhost, IPs and
 * anything under SITE_BASE_DOMAIN never are, so the app's own addresses cost
 * nothing. Answers (including "not a restaurant") are kept for a few minutes,
 * so a busy site does not ask core-api on every request.
 */
const DOMAIN_TTL_MS = 5 * 60 * 1000;
const domainCache = new Map<string, { code: string | null; until: number }>();

async function siteCodeFromCustomDomain(host: string): Promise<string | null> {
  const base = siteBase();
  if (!base || !host.includes('.') || host === base || host.endsWith(`.${base}`)) return null;
  if (host === 'localhost' || host.endsWith('.localhost') || /^[\d.]+$/.test(host) || host.includes(':')) return null;

  const cached = domainCache.get(host);
  if (cached && cached.until > Date.now()) return cached.code;

  let code: string | null = null;
  try {
    const api = (process.env.API_INTERNAL_URL || 'http://127.0.0.1:8029').replace(/\/$/, '');
    const res = await fetch(`${api}/api/v1/site-domains/resolve?host=${encodeURIComponent(host)}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    code = res.ok ? ((await res.json())?.code ?? null) : null;
  } catch {
    // core-api unreachable: serve the app as normal, and ask again soon.
    domainCache.set(host, { code: null, until: Date.now() + 30_000 });
    return null;
  }

  domainCache.set(host, { code, until: Date.now() + DOMAIN_TTL_MS });
  return code;
}

export async function proxy(request: NextRequest) {
  // A restaurant's subdomain, or its own verified domain: serve its site.
  // Everything under it is the site except the passthrough paths; /admin and
  // the rest of the app are not reachable on a restaurant's domain.
  const host = (request.headers.get('host') || '').toLowerCase().replace(/:\d+$/, '');
  const siteCode = siteCodeFromHost(host) ?? (await siteCodeFromCustomDomain(host));
  if (siteCode) {
    const path = request.nextUrl.pathname;

    if (!SITE_PASSTHROUGH.some((prefix) => path.startsWith(prefix))) {
      const target = request.nextUrl.clone();
      target.pathname = `/${siteCode}/site${path === '/' ? '' : path}`;

      const headers = new Headers(request.headers);
      // Tells the page its links start at '/', not '/{code}/site'.
      headers.set('x-site-base', '');

      return NextResponse.rewrite(target, { request: { headers } });
    }
  }

  const token = request.cookies.get('token')?.value;
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  // /login/one-time must run even when the user already has a token: it is the
  // credential exchange for a new trial account, and a demo visitor still holds
  // the demo token. Treating it as a generic auth page and bouncing them to
  // /admin skips the redemption entirely, leaving demo cookies in place.
  const isAuthRoute =
    !request.nextUrl.pathname.startsWith('/login/one-time') &&
    (request.nextUrl.pathname.startsWith('/login') ||
      request.nextUrl.pathname.startsWith('/register'));
  // This is the only layer that can both see the query parameter and write a
  // cookie, so it is where a demo visit gets marked for the rest of the session.
  const demoRequested = request.nextUrl.searchParams.get(DEMO_PARAM) === 'true';

  const response = (() => {
    // Protect Admin Routes
    if (isAdminRoute && !token) {
      const login = new URL('/login', request.url);
      // Carry the query through, so a bookmarked /admin?demo=true still
      // reaches the login form as a demo request.
      login.search = request.nextUrl.search;

      return NextResponse.redirect(login);
    }

    // Redirect authenticated users away from auth pages
    if (isAuthRoute && token) {
      return NextResponse.redirect(new URL('/admin', request.url));
    }

    return NextResponse.next();
  })();

  // Turn the developer's `isdev` header into a cookie the components can read.
  //
  // This is the only layer that sees the header at all: it arrives on the
  // document request and nowhere else, and every route change after that is
  // client-side. Only act when the header is actually present - a request that
  // merely carried the cookie must not keep re-issuing it, or the year-long
  // expiry would slide forward forever and the marking could never lapse.
  const devHeader = request.headers.get(DEV_TRAFFIC_HEADER);

  if (devHeader !== null && devHeader.trim() !== '') {
    if (isAffirmative(devHeader)) {
      response.cookies.set(DEV_TRAFFIC_COOKIE, 'true', {
        path: '/',
        maxAge: DEV_TRAFFIC_MAX_AGE,
        sameSite: 'lax',
      });
    } else {
      // `isdev: false` is the way out. Without it a marked browser could only
      // be un-marked by clearing cookies by hand, and an exclusion you cannot
      // lift is one you stop trusting.
      response.cookies.delete(DEV_TRAFFIC_COOKIE);
    }
  }

  if (demoRequested) {
    response.cookies.set(DEMO_COOKIE, '1', {
      path: '/',
      maxAge: 86400,
      sameSite: 'lax',
    });

    // Facebook's identifiers, handed over by the marketing site. Same reason
    // the demo flag is stored here: the query string is gone by the time the
    // 60-second event fires, and these are what make that Lead attributable.
    for (const [param, cookie] of [
      ['fbp', FBP_COOKIE],
      ['fbc', FBC_COOKIE],
      // Who this demo visitor is, when they came through verification.
      ['ref', LEAD_COOKIE],
      // And which language they have been reading in.
      ['lang', LANG_COOKIE],
    ] as const) {
      const value = request.nextUrl.searchParams.get(param);

      if (value) {
        response.cookies.set(cookie, value, { path: '/', maxAge: 86400, sameSite: 'lax' });
      }
    }
  }

  return response;
}

export const config = {
  /*
   * Every page request, not just the guarded ones.
   *
   * This used to be ['/admin/:path*', '/login', '/register'], which was enough
   * when the only job here was protecting admin routes. It is not enough for
   * the `isdev` header: arriving anywhere on the site with the header set has
   * to mark the browser, and with the narrow matcher a visit that started on
   * the storefront was never seen - so the exclusion appeared to work only
   * sometimes, depending on which page you happened to open first.
   *
   * Everything Next serves for its own purposes is excluded: there is no
   * document to gate behind _next/static, _next/image or favicon.ico, and
   * running this on them is pure overhead on every asset.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|txt|xml)$).*)'],
};
