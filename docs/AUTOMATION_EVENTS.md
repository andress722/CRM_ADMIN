# Automações: Eventos e Workers — Especificação

Este documento descreve a automação inicial que vamos implementar: publicação do evento `PurchaseCompleted`, persistência de eventos, worker de processamento e entrega de notificações.

## Objetivo
- Ao concluir uma compra, publicar um evento durável e processá-lo via worker para acionar integrações: webhooks, atualização de estoque, envio de e-mail/SignalR.

## Componentes
- `PurchaseCompleted` (domain event): contém `PurchaseId`, `UserId`, `Amount`, `Items[]`, `OccurredAt`.
- `event_store` table: append-only, colunas `Id (uuid)`, `EventType`, `Payload (jsonb)`, `CreatedAt`, `ProcessedAt`, `Attempts`, `Status`.
- API endpoint: onde a finalização de compra grava a compra e insere um registro em `event_store` (transactional).
- Worker: `BackgroundService` que consome eventos `Status = 'pending'`, processa com retries e marca `processed` ou envia para DLQ.

## Regras operacionais
- Idempotência: incluir `DeliveryId`/`EventId` e controlar entregas por chave única.
- Retries exponenciais + cap de tentativas (ex.: 5) → mover para `dead_letter` table.
- Auditar entregas com `DeliveryAttempts` e logs estruturados.

## Esquema SQL sugerido

```sql
CREATE TABLE event_store (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz NULL,
  attempts int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending'
);
```

Um script SQL pronto está em `scripts/sql/001_create_event_store.sql`. Use `scripts/apply_event_store.ps1` (requere `psql` no PATH) para aplicá-lo localmente.

## Exemplo de publicação (C# - pseudocódigo)

```csharp
using var tx = await db.BeginTransactionAsync();
// 1) criar Purchase (EF)
// 2) inserir row em event_store com event_type = "PurchaseCompleted" e payload = Json(payload)
await tx.CommitAsync();
```

## Worker (C# BackgroundService - pseudocódigo)

```csharp
public class EventWorker : BackgroundService {
  protected override async Task ExecuteAsync(CancellationToken ct) {
    while(!ct.IsCancellationRequested) {
      var ev = await db.EventStore.Where(s => s.Status=="pending").OrderBy(s => s.CreatedAt).FirstOrDefaultAsync();
      if (ev == null) { await Task.Delay(1000, ct); continue; }
      try {
        // process according to event_type
        // call webhook / update stock / send email / SignalR
        ev.Status = "processed"; ev.ProcessedAt = DateTime.UtcNow;
      } catch (TransientException) {
        ev.Attempts++;
        if (ev.Attempts >= 5) ev.Status = "dead_letter";
      }
      await db.SaveChangesAsync(ct);
    }
  }
}
```

## Entregas iniciais desta iteração
- `PurchaseCompleted` event + persistência em `event_store` (API transactional).  
- `EventWorker` `BackgroundService` com retries simples e DLQ.  
- Testes básicos: unit + integration (in-memory DB) para publicação e processamento.

## Próximos passos depois do MVP
- Adapters (SendGrid, Twilio, Webhook adapter), SignalR para notificações em tempo real, métricas/OTel traces para o fluxo, e dashboard de DLQ.

---
Arquivo gerado automaticamente pelo assistente — se quiser, implemento o `PurchaseCompleted` e o `EventWorker` agora.
