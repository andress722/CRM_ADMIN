# 📌 Backlog Prioritizado (Implementação)

## P0 — Essencial para rodar com segurança
1. **Autenticação completa** (JWT + refresh + rate limit + lockout)
   - Referência: ECOMMERCE_PLAN.md, ECOMMERCE_COMPLIANCE.md
2. **Migrations e EF Core real (PostgreSQL)**
   - Referência: ECOMMERCE_PLAN.md, ECOMMERCE_SETUP.md
3. **CORS, HTTPS, headers de segurança**
   - Referência: QUICK_COMMANDS.md, ECOMMERCE_COMPLIANCE.md

## P1 — Funcionalidades core de negócio
4. **Email system** (providers, templates, webhooks)
   - Referência: ECOMMERCE_EMAIL.md
5. **Refunds & chargebacks**
   - Referência: ECOMMERCE_REFUNDS.md
6. **Inventory** (movements, low stock, ajustes)
   - Referência: ECOMMERCE_INVENTORY.md
7. **Webhooks robustos** (HMAC, retries, jobs)
   - Referência: ECOMMERCE_WEBHOOKS.md

## P2 — Inteligência e operações
8. **Analytics** (events, KPI, jobs)
   - Referência: ECOMMERCE_ANALYTICS.md
9. **Shipping** (providers, tracking, webhooks)
   - Referência: ECOMMERCE_SHIPPING.md
10. **Variants & SKU**
    - Referência: ECOMMERCE_VARIANTS.md
11. **Reviews & Wishlist**
    - Referência: ECOMMERCE_REVIEWS.md

## P3 — Qualidade e escala
12. **Testes unitários/integrados/E2E + CI**
    - Referência: ECOMMERCE_TESTING.md
13. **DevOps completo (Docker/K8s/Monitoring)**
    - Referência: ECOMMERCE_DEVOPS.md

---

## Observações rápidas
- Os documentos de especificação existem no root (ECOMMERCE_*.md).
- Os itens acima consolidam as pendências de implementação indicadas pelos próprios checklists dos documentos.
