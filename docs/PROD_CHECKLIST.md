# Checklist de Deploy/Producao

## Configuracao e Segredos
- Definir `Jwt__SecretKey` com valor forte e rotacionavel.
- Configurar `ConnectionStrings__DefaultConnection` para o banco de producao.
- Configurar `Sentry__Dsn` (backend e frontends) se houver observabilidade.
- Definir `Observability__OtlpEndpoint` somente quando o coletor estiver pronto.
- Configurar provedor de email (`Email__Provider` e chaves correspondentes).

## API e Seguranca
- Configurar `Cors__AllowedOrigins` com dominios reais (evitar `*` quando houver credenciais).
- Confirmar `Observability__EnableOpenTelemetry=false` em producao por padrao.
- Revisar `Sentry__SendDefaultPii=false` para evitar PII em logs.
- Validar limites de rate limit em `IpRateLimiting`.

## Banco e Migracoes
- Aplicar migracoes do EF Core antes do deploy.
- Verificar backup recente e plano de rollback.

## Build e Deploy
- Rodar build e testes (.NET, Node, Python, Go, admin, storefront).
- Confirmar que frontends usam `NEXT_PUBLIC_API_URL` correto.
- Confirmar que admin usa `NEXT_PUBLIC_LEGACY_API_URL` quando necessario.
- Confirmar TLS/HTTPS e proxy reverso configurados.

## Verificacao Pos-Deploy
- Smoke test: login, dashboard, listagem de pedidos, checkout basico.
- Verificar `GET /health` e `GET /metrics`.
- Monitorar erros no Sentry e logs por 30-60 minutos.

## Observacoes
- Atualizar valores sensiveis via secrets/variaveis de ambiente.
- Registrar versao/commit implantado.
