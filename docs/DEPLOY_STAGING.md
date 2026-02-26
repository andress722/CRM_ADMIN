# Staging Deploy (Vercel + Render)

## Alvo

- Frontends (admin + storefront): Vercel (free)
- API + Postgres: Render (free)

## Render (API + Postgres)

1. Create a new Render blueprint from `render.yaml` at repo root.
2. Use default region (Oregon) and free plans.
3. After provisioning, update these env vars:
   - `Jwt__SecretKey` to a strong value
   - `Cors__AllowedOrigins__0/1` to match your final Vercel URLs
   - Optional: `Sentry__Dsn`

Render will expose the API URL. Use it as `NEXT_PUBLIC_API_URL` in Vercel.

## Vercel (Admin)

1. Create a new project from this repo.
2. Root Directory: `admin-frontend`
3. Build Command: `npm run build`
4. Output: default (Next.js)
5. Environment variables:
   - `NEXT_PUBLIC_API_URL` = Render API URL (e.g. https://copilot-sdk-api-staging.onrender.com)
   - `NEXT_PUBLIC_LEGACY_API_URL` = legacy backend if used (optional)
   - Sentry vars if needed

## Vercel (Storefront)

1. Create a new project from this repo.
2. Root Directory: `storefront`
3. Build Command: `npm run build`
4. Output: default (Next.js)
5. Environment variables:
   - `NEXT_PUBLIC_API_URL` = Render API URL
   - `NEXT_PUBLIC_SITE_URL` = Vercel storefront URL
   - Sentry vars if needed

## Verificacao Pos-Deploy

- `GET /health` and `GET /metrics` on API
- Admin login and CRM Leads page
- Storefront home, product, and checkout
- Executar smoke automatizado e anexar evidencias: `docs/STAGING_RELEASE_EVIDENCE.md`

## Notas

- Render free tier sleeps on inactivity. First request may be slow.
- If you want to disable the cron migrations job, remove it from `render.yaml`.

