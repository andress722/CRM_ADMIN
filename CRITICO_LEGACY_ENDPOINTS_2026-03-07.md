# Critico: Endpoints Legados

Data: 2026-03-07
Status: Resolvido

## Escopo

- Endpoint legado `/api/abandoned-carts`
- Endpoint legado `/api/payments`
- Endpoint legado `/api/reviews`
- Arquivo: `src/Ecommerce.API/Controllers/LegacyAdminController.cs`

## Risco identificado

Esses endpoints legados podiam ser consumidos por engano em producao, gerando comportamento inconsistente e risco operacional.

## Acao executada

- Endpoints desativados com `410 Gone`.
- Resposta agora orienta endpoint substituto:
  - `/api/abandoned-carts` -> `/api/v1/admin/reports`
  - `/api/payments` -> `/api/v1/admin/payments`
  - `/api/reviews` -> `/api/v1/admin/reviews`

## Resultado esperado

- Nenhum endpoint legado acima expoe dados em producao.
- Consumidores antigos recebem sinal semantico claro de descomissionamento.
