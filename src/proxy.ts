import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { DEMO_COOKIE, DEMO_PARAM, FBC_COOKIE, FBP_COOKIE } from '@/lib/demo';

export function proxy(request: NextRequest) {
  const token = request.cookies.get('token')?.value;
  const isAdminRoute = request.nextUrl.pathname.startsWith('/admin');
  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/register');
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
  matcher: ['/admin/:path*', '/login', '/register'],
};
