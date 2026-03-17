# Mobile Session Runbook

## Objetivo
Garantir sessão persistente no app mobile sem depender de cookies de navegador.

## Endpoints
- `POST /api/v1/auth/mobile/login`
  - body: `{ "email": "...", "password": "..." }`
  - retorno: `accessToken`, `refreshToken`, `refreshTokenExpiresAt`, `user`
- `POST /api/v1/auth/mobile/refresh`
  - body: `{ "refreshToken": "..." }`
  - retorno: novo `accessToken` + novo `refreshToken` (rotação)
- `POST /api/v1/auth/mobile/logout`
  - com `Authorization: Bearer <accessToken>`
  - body opcional: `{ "refreshToken": "..." }`

## Persistência recomendada
- Salvar `refreshToken` no armazenamento seguro do dispositivo (Keychain/Keystore/SecureStore).
- Manter `accessToken` em memória e renovar por `mobile/refresh` quando expirar.
- Em caso de 401 no refresh, limpar sessão local e forçar novo login.

## Push e deep links
- Registrar device no login: `POST /api/v1/push/devices`.
- Testar entrega: `POST /api/v1/push/devices/test`.
- Deep links aceitos por esquema em `Mobile:DeepLinks:AllowedSchemes`.

## Evidência automatizada
- Testes: `tests/Ecommerce.API.Tests/MobileAuthTests.cs` e `tests/Ecommerce.API.Tests/PushDevicesTests.cs`.
