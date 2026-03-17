import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ACCESS_COOKIE = "bff_access_token";
const CSRF_COOKIE = "csrf_token";
const API_ORIGIN = (process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5071").replace(/\/+$/, "");
const API_PREFIX = "/api/v1";
const HOP_BY_HOP_HEADERS = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "content-length",
  "host",
]);
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const KB = 1024;
const MB = KB * 1024;

function isPublicAuthPath(path: string): boolean {
  return (
    path === "auth/login" ||
    path === "auth/register" ||
    path === "auth/refresh" ||
    path === "auth/forgot-password" ||
    path === "auth/reset-password" ||
    path === "auth/verify-email" ||
    path === "auth/resend-verification" ||
    path.startsWith("auth/social/")
  );
}

function isSessionAuthPath(path: string): boolean {
  return path === "auth/login" || path === "auth/register" || path === "auth/refresh" || path.startsWith("auth/social/");
}

function isAllowedBrowserMutation(request: NextRequest): boolean {
  if (!MUTATING_METHODS.has(request.method.toUpperCase())) {
    return true;
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (secFetchSite && secFetchSite.toLowerCase() === "cross-site") {
    return false;
  }

  const origin = request.headers.get("origin");
  if (!origin) {
    return true;
  }

  try {
    return new URL(origin).origin === request.nextUrl.origin;
  } catch {
    return false;
  }
}

function resolvePayloadLimitBytes(path: string): number {
  if (path.startsWith("auth/")) return 64 * KB;

  if (
    path === "payments/checkout" ||
    path === "payments/transparent" ||
    path === "orders/from-cart"
  ) {
    return 256 * KB;
  }

  if (
    path.includes("/avatar") ||
    path.includes("product-images") ||
    path.includes("/banners")
  ) {
    return 6 * MB;
  }

  return 1 * MB;
}

function requiresActionNonce(path: string, method: string): boolean {
  if (!MUTATING_METHODS.has(method.toUpperCase())) return false;

  if (path === "payments/checkout" || path === "payments/transparent" || path === "orders/from-cart") {
    return true;
  }

  if (path === "subscriptions/billing/run") return true;
  if (path.startsWith("subscriptions/") && (path.endsWith("/cancel") || path.endsWith("/retry"))) {
    return true;
  }

  return false;
}

function hasValidActionNonce(request: NextRequest): boolean {
  const headerNonce = request.headers.get("x-action-nonce");
  const csrfCookie = request.cookies.get(CSRF_COOKIE)?.value;
  if (!headerNonce || !csrfCookie) return false;
  return headerNonce === csrfCookie;
}

function filterRequestHeaders(request: NextRequest): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (HOP_BY_HOP_HEADERS.has(normalized)) return;
    if (normalized === "authorization") return;
    headers.set(key, value);
  });
  return headers;
}

function getSetCookieValues(response: Response): string[] {
  const anyHeaders = response.headers as unknown as { getSetCookie?: () => string[] };
  if (typeof anyHeaders.getSetCookie === "function") {
    return anyHeaders.getSetCookie();
  }

  const single = response.headers.get("set-cookie");
  return single ? [single] : [];
}

function applyResponseHeaders(response: NextResponse, correlationId?: string | null, noStore = false): void {
  if (correlationId) {
    response.headers.set("x-correlation-id", correlationId);
  }

  if (noStore) {
    response.headers.set("Cache-Control", "no-store, no-cache, max-age=0");
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");
  }
}

async function callUpstream(
  request: NextRequest,
  path: string,
  search: string,
  accessToken?: string,
): Promise<Response> {
  const target = `${API_ORIGIN}${API_PREFIX}/${path}${search}`;
  const headers = filterRequestHeaders(request);

  if (accessToken && !isPublicAuthPath(path)) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  const method = request.method.toUpperCase();
  const isBodyMethod = method !== "GET" && method !== "HEAD";
  let body: ArrayBuffer | undefined;

  if (isBodyMethod) {
    body = await request.arrayBuffer();
    const limitBytes = resolvePayloadLimitBytes(path);
    if (body.byteLength > limitBytes) {
      return new Response(JSON.stringify({ message: `Payload too large. Max ${limitBytes} bytes.` }), {
        status: 413,
        headers: {
          "content-type": "application/json",
          "cache-control": "no-store",
        },
      });
    }
  }

  return fetch(target, {
    method,
    headers,
    body,
    redirect: "manual",
    cache: "no-store",
  });
}

async function tryRefreshToken(request: NextRequest): Promise<{ ok: boolean; token?: string; setCookies: string[] }> {
  const cookieHeader = request.headers.get("cookie") || "";
  const csrf = request.cookies.get(CSRF_COOKIE)?.value;

  if (!cookieHeader || !csrf) {
    return { ok: false, setCookies: [] };
  }

  const refreshResponse = await fetch(`${API_ORIGIN}${API_PREFIX}/auth/refresh`, {
    method: "POST",
    headers: {
      Cookie: cookieHeader,
      "X-CSRF-Token": csrf,
      "Content-Type": "application/json",
    },
    body: "{}",
    redirect: "manual",
    cache: "no-store",
  });

  const setCookies = getSetCookieValues(refreshResponse);
  if (!refreshResponse.ok) {
    return { ok: false, setCookies };
  }

  const payload = (await refreshResponse.json().catch(() => ({}))) as { accessToken?: string };
  return { ok: typeof payload.accessToken === "string" && payload.accessToken.length > 0, token: payload.accessToken, setCookies };
}

async function handle(request: NextRequest, path: string[]): Promise<NextResponse> {
  if (!isAllowedBrowserMutation(request)) {
    return NextResponse.json({ message: "Cross-site mutation blocked" }, { status: 403 });
  }

  let joinedPath = path.join("/");
  if (joinedPath.startsWith("api/bff/")) {
    joinedPath = joinedPath.slice("api/bff/".length);
  } else if (joinedPath === "api/bff") {
    joinedPath = "";
  }
  const search = request.nextUrl.search || "";
  const cookieAccessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  const requestMethod = request.method.toUpperCase();
  const requireNoStore = joinedPath.startsWith("auth/") || MUTATING_METHODS.has(requestMethod);

  if (requiresActionNonce(joinedPath, requestMethod) && !hasValidActionNonce(request)) {
    return NextResponse.json({ message: "Action nonce required for this operation" }, { status: 403 });
  }

  let upstream = await callUpstream(request, joinedPath, search, cookieAccessToken);
  const passThroughCookies: string[] = [];

  if (upstream.status === 401 && !isPublicAuthPath(joinedPath)) {
    const refreshed = await tryRefreshToken(request);
    passThroughCookies.push(...refreshed.setCookies);
    if (refreshed.ok && refreshed.token) {
      upstream = await callUpstream(request, joinedPath, search, refreshed.token);
    }
  }

  const setCookies = [...passThroughCookies, ...getSetCookieValues(upstream)];
  const contentType = upstream.headers.get("content-type") || "application/json";
  const upstreamCorrelation = upstream.headers.get("x-correlation-id");

  if (joinedPath === "auth/logout") {
    const response = NextResponse.json({ message: "Logged out" }, { status: upstream.status });
    response.cookies.delete(ACCESS_COOKIE);
    for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
    applyResponseHeaders(response, upstreamCorrelation, true);
    return response;
  }

  if (isSessionAuthPath(joinedPath)) {
    const payload = (await upstream.json().catch(() => ({}))) as Record<string, unknown>;
    const accessToken = typeof payload.accessToken === "string" ? payload.accessToken : undefined;
    const response = NextResponse.json(payload, { status: upstream.status });

    if (upstream.status >= 200 && upstream.status < 300 && accessToken) {
      response.cookies.set(ACCESS_COOKIE, accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 55 * 60,
      });
    }

    if (upstream.status === 401 || upstream.status === 403) {
      response.cookies.delete(ACCESS_COOKIE);
    }

    for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
    applyResponseHeaders(response, upstreamCorrelation, true);
    return response;
  }

  const rawBody = await upstream.arrayBuffer();
  const response = new NextResponse(rawBody, {
    status: upstream.status,
    headers: { "content-type": contentType },
  });

  if (upstream.status === 401 || upstream.status === 403) {
    response.cookies.delete(ACCESS_COOKIE);
  }

  for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
  applyResponseHeaders(response, upstreamCorrelation, requireNoStore);

  return response;
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(request, path || []);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(request, path || []);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(request, path || []);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(request, path || []);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const { path } = await context.params;
  return handle(request, path || []);
}


