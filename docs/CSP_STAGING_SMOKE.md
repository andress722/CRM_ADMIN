# CSP Staging Smoke

## Objective
Validate strict CSP (nonce + allowlist) in staging for Admin and Storefront without breaking auth, checkout, and realtime flows.

## Preconditions
- Deploy includes `proxy.ts` CSP changes.
- BFF routes active: `/api/bff/*`.
- Browser DevTools available.

## Steps
1. Open Admin staging home and login.
2. Open Storefront staging home and login/account pages.
3. On both apps, check DevTools Console for CSP violations (`Refused to load ... because it violates the following Content Security Policy directive ...`).
4. In Network tab, verify response header `Content-Security-Policy` exists on HTML pages.
5. In Network tab, verify `/api/bff/auth/*` responses include `Cache-Control: no-store`.
6. Validate Admin notifications page realtime updates (WebSocket connect, no token in URL query).
7. Validate Storefront checkout and Mercado Pago SDK load.
8. Confirm no blocked iframe/script/connect requests for checkout payment flow.

## If violations appear
- Add specific domains to env allowlists (comma-separated):
  - `NEXT_PUBLIC_CSP_SCRIPT_SRC`
  - `NEXT_PUBLIC_CSP_CONNECT_SRC`
  - `NEXT_PUBLIC_CSP_IMG_SRC`
  - `NEXT_PUBLIC_CSP_FRAME_SRC`
- Redeploy and rerun this checklist.

## Local technical evidence (2026-03-14)
- `admin-frontend`: `npm run build` passed with `proxy.ts` CSP.
- `info-tech-gamer-storefront-build`: `npm run build` passed with `proxy.ts` CSP.
