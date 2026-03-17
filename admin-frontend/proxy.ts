import { NextRequest, NextResponse } from 'next/server';

function parseCspSources(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function uniq(values: string[]): string[] {
  return [...new Set(values)];
}

function buildCsp(nonce: string, isDev: boolean): string {
  const extraScriptSrc = parseCspSources(process.env.NEXT_PUBLIC_CSP_SCRIPT_SRC);
  const extraConnectSrc = parseCspSources(process.env.NEXT_PUBLIC_CSP_CONNECT_SRC);
  const extraImgSrc = parseCspSources(process.env.NEXT_PUBLIC_CSP_IMG_SRC);
  const extraFrameSrc = parseCspSources(process.env.NEXT_PUBLIC_CSP_FRAME_SRC);

  const scriptSrc = uniq([
    "'self'",
    'https://sdk.mercadopago.com',
    ...extraScriptSrc,
  ]);

  const connectSrc = uniq([
    "'self'",
    'ws:',
    'wss:',
    'https://*.ingest.sentry.io',
    'https://api.mercadopago.com',
    'https://*.mercadopago.com',
    'https://*.mercadopago.com.br',
    ...extraConnectSrc,
  ]);

  const imgSrc = uniq([
    "'self'",
    'data:',
    'blob:',
    'https:',
    ...extraImgSrc,
  ]);

  const frameSrc = uniq([
    "'self'",
    'https://*.mercadopago.com',
    'https://*.mercadopago.com.br',
    ...extraFrameSrc,
  ]);

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `img-src ${imgSrc.join(' ')}`,
    "font-src 'self' data:",
    style-src 'self' 'unsafe-inline',
    isDev
      ? `script-src ${scriptSrc.join(' ')} 'unsafe-inline' 'unsafe-eval'`
      : `script-src ${scriptSrc.join(' ')} 'unsafe-inline'`,
    `connect-src ${connectSrc.join(' ')}`,
    `frame-src ${frameSrc.join(' ')}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    'upgrade-insecure-requests',
  ];

  return directives.join('; ');
}

// Edge proxy for CSP + nonce injection
export function proxy(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== 'production';
  const nonce = crypto.randomUUID();

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.headers.set('Content-Security-Policy', buildCsp(nonce, isDev));
  return response;
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico).*)'],
};



