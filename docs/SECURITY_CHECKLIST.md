# Checklist de Seguranca

## Configuracao e Segredos
- Usar secrets/variaveis de ambiente para chaves e tokens.
- Garantir `Jwt__SecretKey` forte e rotacionavel.
- Validar credenciais de banco e minimo privilegio.
- Confirmar `Sentry__SendDefaultPii=false`.

## API e Acesso
- Confirmar CORS com dominios reais em `Cors__AllowedOrigins`.
- Verificar autenticacao/authorization ativas e politicas criticas.
- Revisar rate limits e limites por endpoint sensivel.

## Observabilidade
- Desativar OpenTelemetry em producao por padrao.
- Configurar `Observability__OtlpEndpoint` apenas quando aprovado.

## Dependencias
- Rodar auditorias (`npm audit`, advisories NuGet/Go/Python).
- Atualizar deps criticas com CVE conhecido.

## Testes de Seguranca
- Smoke test de permissao (rotas admin sem token devem falhar).
- Validar CSRF/cookies HttpOnly onde aplicavel.
- Testar fluxo de reset de senha e expiracao de tokens.

## Pos-Deploy
- Monitorar alertas no Sentry e logs por 30-60 minutos.
- Verificar backups e plano de rollback.
