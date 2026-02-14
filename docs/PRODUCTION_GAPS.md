# Production Gaps

## Pontos pendentes para produção (com plano)

### 1) UX de verificação de e‑mail e sessão
**Objetivo:** o usuário consegue verificar e‑mail, renovar sessão e sair sem fricção.

**Ações**
- [x] Adicionar página de “E‑mail verificado” e “Token inválido/expirado”.
- [x] Botão de “Reenviar verificação” com rate limit no frontend.
- [x] Implementar refresh automático no storefront e logout automático na expiração.

**Critérios de aceite**
- O login falha com mensagem clara quando o e‑mail não está verificado.
- A sessão renova sem interromper navegação.
- Logout limpa `accessToken`/`refreshToken` e redireciona.

---

### 2) Carrinho/pedido reais no backend
**Objetivo:** o servidor é fonte de verdade para itens, preço e estoque.

**Ações**
- [x] Persistir carrinho por usuário no backend (API CRUD).
- [x] Ajustar checkout para montar pedido a partir do carrinho persistido.
- [x] Recalcular preços e aplicar estoque no servidor (já iniciado no OrderService).

**Critérios de aceite**
- Itens do carrinho sobrevivem a logout/login.
- O total do pedido sempre bate com o backend.
- Tentativa de fraude no cliente é rejeitada.

---

### 3) Validação forte de dados
**Objetivo:** dados inválidos são bloqueados antes de qualquer pagamento.

**Ações**
- [x] Validar CPF/telefone no backend (regex + normalização).
- [x] Validar endereço no backend.
- [x] Normalizar CPF/telefone (remove máscara e validação).
- [x] Respostas de erro consistentes para UI.

**Critérios de aceite**
- Payload inválido retorna 400 com motivo claro.
- Dados armazenados já normalizados.

---

### 4) Fluxo de cartão completo
**Objetivo:** cartão funciona com parcelas, erros e mensagens claras.

**Ações**
- [x] Mapear statuses do MP para mensagens ao usuário.
- [x] Implementar seleção de parcelas no frontend com base no `payment_method_id`.
- [x] Tratar `rejected` com motivos (ex.: `cc_rejected_*`).

**Critérios de aceite**
- Erros de cartão são exibidos com instruções claras.
- Parcelamento disponível e validado.

---

### 5) Webhook Mercado Pago em produção
**Objetivo:** webhooks confiáveis, seguros e observáveis.

**Ações**
- [x] Configurar `WebhookSecret` e validar assinatura.
- [x] Adicionar reprocessamento seguro (idempotência por transactionId).
- [x] Alertas em falhas de webhook.

**Critérios de aceite**
- Webhook inválido retorna 401.
- Reenvio não duplica atualizações.

---

### 6) Observabilidade real
**Objetivo:** logs e métricas úteis para incidentes.

**Ações**
- [x] Logs estruturados com correlation id (já iniciado).
- [x] Exportar métricas para Prometheus/Grafana.
- [x] Painel com erros 4xx/5xx e latência.

**Critérios de aceite**
- Dashboards mostram latência e erros por rota.

---

### 7) Segurança e segredos
**Objetivo:** nenhum segredo em código e rotação periódica.

**Ações**
- [x] Mover tokens para env vars/secret manager.
- [x] Rotacionar Access Token e Webhook Secret.
- [x] Reforçar política de CORS e headers em produção.

**Critérios de aceite**
- Repositório sem segredos hardcoded.

---

### 8) E2E com dados reais
**Objetivo:** fluxo real com produtos/estoque/frete.

**Ações**
- [x] Seed de produtos reais e estoque.
- [x] Integração com frete real (Correios).
- [x] E2E cobrindo Pix/Boleto/Cartão.

**Critérios de aceite**
- Fluxo completo passa em ambiente staging.
