import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEMO_COOKIE, DEMO_PARAM, FBC_COOKIE, FBP_COOKIE, LEAD_COOKIE } from '@/lib/demo';
import {
  DEV_TRAFFIC_COOKIE,
  DEV_TRAFFIC_HEADER,
  DEV_TRAFFIC_MAX_AGE,
  isAffirmative,
} from '@/lib/devTraffic';

export function proxy(request: NextRequest) {
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
