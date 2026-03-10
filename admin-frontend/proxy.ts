import { NextResponse } from 'next/server';

// NOTE: Do not enforce auth in edge proxy using cookies.
// Admin auth is client-side (access token in localStorage), and API refresh cookie
// is scoped to API domain, so it is not available on the frontend domain.
export function proxy() {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};
