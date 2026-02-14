# ✅ O que falta no Backend (Checklist)

> Estado: Swagger rodando. Este documento lista o que ainda falta implementar no backend para fechar o escopo completo.

## 🔐 Autenticação & Segurança
- [x] Verificação de email (token + reenvio)
- [x] Reset de senha por email
- [x] Lockout / rate limit por usuário
- [x] RBAC (roles/permissões) aplicado em endpoints

## 🔑 2FA (TOTP)
- [x] Entidades e migrations (TwoFactorAuth, RecoveryCodes, Sessions, Challenges) (persistido)
- [x] Serviço completo (setup/verify/confirm) (persistido)
- [x] Endpoints /auth/2fa/*

## ✉️ Email
- [x] Providers (SendGrid + SES real)
- [x] Templates HTML
- [x] Webhook de tracking (delivered/open/click/bounce)
- [x] Logs e dashboard

## 💸 Refunds & Chargebacks
- [x] Entidades + migrations (persistido)
- [x] Serviço e controller (persistido)
- [x] Webhook handler (endpoint)

## 📦 Inventory
- [x] Entidades + migrations (persistido)
- [x] Serviço e controller (persistido)
- [x] Regras de estoque (low stock, transfers)

## 🔁 Webhooks
- [x] HMAC signing
- [x] Retry/backoff
- [x] Worker/jobs

## 📊 Analytics
- [x] Entidades + migrations (persistido)
- [x] Tracking de eventos (persistido)
- [x] Aggregation jobs

## 🚚 Shipping
- [x] Providers (mock)
- [x] Tracking (persistido)
- [x] Webhooks (endpoint)

## 🧩 Variants & SKU
- [x] Entidades + migrations (persistido)
- [x] Serviços e endpoints (persistido)

## ⭐ Reviews & Wishlist
- [x] Entidades + migrations (persistido)
- [x] Serviços e endpoints (persistido)

## 🧪 Testes
- [x] Unit tests (básico)
- [x] Integration tests (básico)
- [x] E2E tests (básico)

---

## Próximo passo sugerido
1) Aplicar migrations no banco de staging/produção.
2) Configurar provider de email real (SendGrid/SES) via `Email:Provider` + credenciais.
3) Validar fluxos críticos (auth, reset, webhooks) em staging.
