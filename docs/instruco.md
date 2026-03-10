# Plano de execução incremental (estado atual)

## Fase 0 - Correções críticas de operação (em andamento)
- [x] Login admin destravado (2FA temporariamente desativado para testes)
- [x] Loop no login corrigido (proxy de cookie removido no frontend admin)
- [x] Modal de pedido com scroll interno e viewport-safe
- [x] Ajuste de estoque com UX melhor (+/- imediato e valor padrão válido)
- [x] Produto com estoque zero agora fica inativo no backend
- [x] Listagem de produtos mostra miniatura (buscando primeira imagem do endpoint de imagens)
- [x] Criação de produto aceita upload de imagem no mesmo fluxo
- [x] Promoções/Banners com upload de imagem (arquivo -> data URL) e datas mais amigáveis (`datetime-local`)
- [x] Banner integrado no storefront (carrossel público com endpoint `/api/v1/banners`)
- [x] Melhorar impressão de pedido (layout dedicado para impressão com geração de HTML de impressão)
- [x] Revisar checkout storefront (`/users/me` 401 e `/orders/from-cart` 500)

## Fase 1 - CRM funcional completo (backend + frontend)
- [x] Empresas (CRUD + filtros + paginação)
- [x] Contatos (CRUD + vínculo com empresa)
- [x] Leads (origem, score, status, responsável, conversão)
- [x] Oportunidades/funil (etapas, probabilidade, previsão, histórico)
- [x] Atividades (tarefas, ligações, reuniões, follow-up)
- [x] Propostas (CRUD + status + validade)
- [x] Dashboard CRM (KPIs de pipeline e produtividade)
- [x] Relatórios CRM (origem, etapa, responsável, período)

## Fase 2 - Experiência e governança
- [x] Permissões por perfil (`admin`, `gerente`, `vendedor`)
- [x] Soft delete/auditoria onde aplicável
- [ ] Testes de fluxo crítico (login, leads, oportunidades, atividades)
- [ ] Checklist final de validação + documentação de operação



