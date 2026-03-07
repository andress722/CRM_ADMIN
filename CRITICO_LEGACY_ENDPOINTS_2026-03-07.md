# Critico: Endpoints Legados Mockados

Data: 2026-03-07
Status: Resolvido

## Escopo

- Endpoint legado `/api/abandoned-carts`
- Endpoint legado `/api/reviews`
- Arquivo: `src/Ecommerce.API/Controllers/LegacyAdminController.cs`

## Risco identificado

Esses endpoints retornavam dados mockados/listas estaticas e podiam ser consumidos por engano em producao, gerando comportamento inconsistente e risco operacional.

## Acao executada

- Ambos endpoints foram desativados com `410 Gone`.
- Resposta agora orienta endpoint substituto:
  - `/api/abandoned-carts` -> `/api/v1/admin/reports`
  - `/api/reviews` -> `/api/v1/admin/reviews`

## Resultado esperado

- Nenhum dado mock legado exposto nesses dois endpoints.
- Consumidores antigos recebem sinal semantico claro de descomissionamento.

