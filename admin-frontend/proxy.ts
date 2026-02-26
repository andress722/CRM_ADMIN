import { NextRequest, NextResponse } from 'next/server';

const PUBLIC_ROUTES = new Set(['/login', '/_login_legacy', '/_login_moved']);

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_ROUTES.has(pathname)) {
    return true;
  }

  if (pathname.startsWith('/public/')) {
    return true;
  }

  return false;
}

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(
    request.cookies.get('refresh_token')?.value ||
      request.cookies.get('auth_token')?.value
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = isPublicRoute(pathname);
  const hasSession = hasSessionCookie(request);

  if (!isPublic && !hasSession) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (isPublic && hasSession) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
